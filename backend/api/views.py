from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from .models import Task, BusinessData, ProcessedReport,Meeting, Employee,Department, MeetingFile
from .serializers import TaskSerializer, BusinessDataSerializer, ProcessedReportSerializer,MeetingSerializer, EmployeeSerializer,DepartmentSerializer, MeetingSubmitSerializer,MeetingFileSerializer

import datetime
from supabase import create_client, Client
import os
import uuid
import pandas as pd
import numpy as np
import google.generativeai as genai
from io import BytesIO
import requests
import matplotlib.pyplot as plt
import seaborn as sns
from .utils.report_generators import PDFGenerator, PPTGenerator, CleaningReportGenerator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from datetime import date, datetime

class FileProcessingView(generics.CreateAPIView):

    def post(self, request, *args, **kwargs):
        file_id = request.data.get('file_id')
        analysis_type = request.data.get('analysis_type', 'full_analysis')

        try:
            # Get file and process data
            business_data = BusinessData.objects.get(id=file_id)
            file_content = self.download_file_from_supabase(business_data.file_url)

            # Step 1: Data Cleaning
            cleaned_data, cleaning_log = self.clean_and_preprocess_data(
                file_content, business_data.fileName
            )

            # Debug: Print cleaned data info
            print(f"Cleaned data shape: {cleaned_data.shape}")
            print(f"Cleaned data columns: {cleaned_data.columns.tolist()}")

            # Step 2: Upload cleaned Excel
            cleaned_excel_url = self.upload_cleaned_excel(cleaned_data, business_data.fileName)

            # Step 3: Detect the data type
            data_type = self.detect_data_type(cleaned_data, business_data.fileName)
            print(f"Detected data type: {data_type}")

            # Step 4: Generate cleaning report
            cleaning_pdf_url = self.generate_cleaning_report(cleaning_log, business_data.fileName)

            # Step 5: Data analysis based on data type
            analysis_results = self.analyze_data_by_type(cleaned_data, business_data.fileName, data_type)

            # Step 6: Generate specialized reports WITH CHARTS
            pdf_url = self.generate_specialized_pdf(
                analysis_results, business_data.fileName, cleaned_data, data_type
            )

            ppt_url = self.generate_specialized_ppt(
                analysis_results, business_data.fileName, cleaned_data, data_type
            )

            # Save results
            processed_report = ProcessedReport.objects.create(
                original_file=business_data,
                analysis_type=analysis_type,
                processed_data={
                    'data_type': data_type,
                    'cleaning_log': cleaning_log,
                    'analysis_results': analysis_results,
                    'cleaned_excel_url': cleaned_excel_url,
                    'cleaning_pdf_url': cleaning_pdf_url
                },
                pdf_url=pdf_url,
                ppt_url=ppt_url
            )

            serializer = ProcessedReportSerializer(processed_report)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            print(f"Processing error: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({'error': f'Failed to process file: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def clean_and_preprocess_data(self, file_content, filename):
        """Step 1: Clean and preprocess data using Gemini AI guidance"""
        
        # Read the file
        if filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(file_content))
        elif filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(BytesIO(file_content))
        else:
            raise Exception("Unsupported file format")

        # Initialize cleaning log
        cleaning_log = {
            'original_shape': df.shape,
            'issues_found': [],
            'actions_taken': [],
            'final_shape': None,
            'columns_processed': [],
            'summary': {}
        }

        # Get AI guidance for cleaning
        cleaning_instructions = self.get_gemini_cleaning_guidance(df)
        
        # Apply cleaning steps
        df_cleaned = df.copy()

        # Update final statistics
        print("DEBUG: type(df):", type(df))
        print("DEBUG: df.shape:", df.shape)
        print("DEBUG: df.shape (nrows):", df.shape)
        print("DEBUG: df_cleaned.shape:", df_cleaned.shape)
        print("DEBUG: df_cleaned.shape (nrows):", df_cleaned.shape)
        print("DEBUG: columns removed:", df.shape[1] - df_cleaned.shape[1])
        
        # 1. Handle missing values
        missing_info = df.isnull().sum()
        for col in df.columns:
            if missing_info[col] > 0:
                cleaning_log['issues_found'].append(f"Column '{col}': {missing_info[col]} missing values")
                
                if df[col].dtype in ['int64', 'float64']:
                    # Replace with mean for numeric columns
                    mean_val = df[col].mean()
                    df_cleaned[col].fillna(mean_val, inplace=True)
                    cleaning_log['actions_taken'].append(f"Column '{col}': Filled {missing_info[col]} missing values with mean ({mean_val:.2f})")
                else:
                    # Replace with mode for categorical columns
                    mode_val = df[col].mode().iloc[0] if not df[col].mode().empty else 'Unknown'
                    df_cleaned[col].fillna(mode_val, inplace=True)
                    cleaning_log['actions_taken'].append(f"Column '{col}': Filled {missing_info[col]} missing values with mode ('{mode_val}')")

        # 2. Handle data type issues
        for col in df_cleaned.columns:
            original_dtype = str(df_cleaned[col].dtype)
            
            # Check for date columns with wrong data types
            if 'date' in col.lower() or 'time' in col.lower():
                try:
                    df_cleaned[col] = pd.to_datetime(df_cleaned[col], errors='coerce')
                    invalid_dates = df_cleaned[col].isnull().sum() - missing_info[col]
                    if invalid_dates > 0:
                        cleaning_log['issues_found'].append(f"Column '{col}': {invalid_dates} invalid date values")
                        cleaning_log['actions_taken'].append(f"Column '{col}': Converted to datetime, {invalid_dates} invalid entries set to NaT")
                except:
                    pass
            
            # Check for numeric columns with string values
            elif col.lower() in ['price', 'cost', 'amount', 'value', 'quantity', 'qty']:
                try:
                    # Remove currency symbols and convert to numeric
                    df_cleaned[col] = pd.to_numeric(df_cleaned[col].astype(str).str.replace(r'[\$,]', '', regex=True), errors='coerce')
                    invalid_numeric = df_cleaned[col].isnull().sum() - missing_info[col]
                    if invalid_numeric > 0:
                        cleaning_log['issues_found'].append(f"Column '{col}': {invalid_numeric} non-numeric values in numeric column")
                        # Fill with mean
                        mean_val = df_cleaned[col].mean()
                        df_cleaned[col].fillna(mean_val, inplace=True)
                        cleaning_log['actions_taken'].append(f"Column '{col}': Converted to numeric, replaced {invalid_numeric} invalid values with mean ({mean_val:.2f})")
                except:
                    pass

        # 3. Remove duplicate rows
        duplicate_count = df_cleaned.duplicated().sum()
        if duplicate_count > 0:
            df_cleaned.drop_duplicates(inplace=True)
            cleaning_log['issues_found'].append(f"Found {duplicate_count} duplicate rows")
            cleaning_log['actions_taken'].append(f"Removed {duplicate_count} duplicate rows")

        # 4. Handle outliers in numeric columns
        numeric_cols = df_cleaned.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            Q1 = df_cleaned[col].quantile(0.25)
            Q3 = df_cleaned[col].quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            outliers = ((df_cleaned[col] < lower_bound) | (df_cleaned[col] > upper_bound)).sum()
            if outliers > 0:
                cleaning_log['issues_found'].append(f"Column '{col}': {outliers} outlier values detected")
                # Cap outliers instead of removing
                df_cleaned[col] = df_cleaned[col].clip(lower=lower_bound, upper=upper_bound)
                cleaning_log['actions_taken'].append(f"Column '{col}': Capped {outliers} outliers to acceptable range [{lower_bound:.2f}, {upper_bound:.2f}]")

        print("DEBUG: type(df):", type(df))
        print("DEBUG: df.shape:", df.shape)
        print("DEBUG: df.shape (nrows):", df.shape)
        print("DEBUG: df_cleaned.shape:", df_cleaned.shape)
        print("DEBUG: df_cleaned.shape (nrows):", df_cleaned.shape)
        print("DEBUG: columns removed:", df.shape[1] - df_cleaned.shape[1])

        # Update final statistics
        cleaning_log['final_shape'] = df_cleaned.shape 
        cleaning_log['columns_processed'] = list(df_cleaned.columns)
        cleaning_log['summary'] = {
            'rows_removed': len(df) - len(df_cleaned),  # Alternative syntax
            'columns_cleaned': len([col for col in df.columns if col in cleaning_log['columns_processed']]),
            'total_issues_found': len(cleaning_log['issues_found']),
            'total_actions_taken': len(cleaning_log['actions_taken'])
        }

        return df_cleaned, cleaning_log

    def get_gemini_cleaning_guidance(self, df):
        """Get AI guidance for data cleaning approach"""
        genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
        model = genai.GenerativeModel('gemini-1.5-flash')

        # Prepare data summary for AI analysis
        data_summary = {
            'shape': df.shape,
            'columns': df.columns.tolist(),
            'dtypes': {col: str(dtype) for col, dtype in df.dtypes.to_dict().items()},
            'missing_values': df.isnull().sum().to_dict(),
            'sample_data': df.head(3).to_dict()
        }

        prompt = f"""
        Analyze this dataset and provide data cleaning recommendations:
        
        Dataset Info: {data_summary}
        
        Please suggest:
        1. How to handle missing values for each column
        2. Potential data type corrections needed
        3. Columns that might have logic issues
        4. Outlier detection strategies
        
        Respond with specific, actionable cleaning steps.
        """

        try:
            response = model.generate_content(prompt)
            return response.text
        except:
            return "Basic cleaning approach: handle missing values, check data types, remove duplicates"

    def upload_cleaned_excel(self, df_cleaned, original_filename):
        """Upload cleaned data as Excel file to Supabase"""
        
        # Create Excel file in memory
        excel_buffer = BytesIO()
        df_cleaned.to_excel(excel_buffer, index=False, engine='openpyxl')
        excel_content = excel_buffer.getvalue()
        
        # Upload to Supabase
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_KEY')
        supabase = create_client(supabase_url, supabase_key)
        
        filename_without_ext = os.path.splitext(original_filename)[0]
        excel_filename = f"cleaned_data/{uuid.uuid4()}_{filename_without_ext}_cleaned.xlsx"
        
        res = supabase.storage.from_("business_files").upload(
            path=excel_filename,
            file=excel_content,
            file_options={"content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
        )
        
        return supabase.storage.from_("business_files").get_public_url(excel_filename)
    
    def detect_data_type(self, df, filename):
        """Step 3: Detect data type based on column names and content patterns"""
        columns_lower = [col.lower() for col in df.columns]
        column_text = ' '.join(columns_lower + [filename.lower()])

        # Define data type indicators
        data_type_indicators = {
            'sales': {
                'keywords': ['product', 'quantity', 'sold', 'price', 'customer', 'store', 'payment', 'category', 'unit_price', 'total_sales'],
                'score': 0
            },
            'financial': {
                'keywords': ['revenue', 'profit', 'expense', 'cost', 'margin', 'gross', 'net', 'operating', 'cogs', 'opex'],
                'score': 0
            },
            'social_media': {
                'keywords': ['views', 'likes', 'shares', 'comments', 'engagement', 'platform', 'post', 'content_type', 'followers'],
                'score': 0
            }
        }

        # Calculate scores for each data type
        for data_type, info in data_type_indicators.items():
            for keyword in info['keywords']:
                if keyword in column_text:
                    info['score'] += 1

        # Additional pattern-based detection
        if any('date' in col and ('sales' in col or 'revenue' in col) for col in columns_lower):
            data_type_indicators['financial']['score'] += 2

        if any('post_' in col for col in columns_lower):
            data_type_indicators['social_media']['score'] += 2

        if 'quantity_sold' in columns_lower or 'total_sales' in columns_lower:
            data_type_indicators['sales']['score'] += 2

        # Determine the data type with highest score
        best_type = max(data_type_indicators.items(), key=lambda x: x[1]['score'])
        if best_type[1]['score'] > 0:
            return best_type[0]
        else:
            return 'general'


    def analyze_data_by_type(self, df_cleaned, filename, data_type):
        """Step 4: Enhanced data analysis based on detected data type"""
        analysis_results = {
            'data_type': data_type,
            'statistical_summary': {},
            'key_insights': [],
            'business_recommendations': [],
            'data_overview': {},
            'visualizations': [],
            'specialized_metrics': {}
        }

        # Common data overview
        numeric_cols = df_cleaned.select_dtypes(include=[np.number]).columns
        categorical_cols = df_cleaned.select_dtypes(include=['object']).columns

        analysis_results['data_overview'] = {
            'total_rows': int(df_cleaned.shape[0]),
            'total_columns': int(df_cleaned.shape[1]),
            'numeric_columns': len(numeric_cols),
            'categorical_columns': len(categorical_cols),
            'data_completeness': float((1 - df_cleaned.isnull().sum().sum() / (df_cleaned.shape[0] * df_cleaned.shape[1])) * 100),
            'time_period': self.detect_time_period(df_cleaned),
            'data_size_category': 'Large' if df_cleaned.shape[0] > 10000 else 'Medium' if df_cleaned.shape[0] > 1000 else 'Small'
        }

        # Statistical summary for numeric columns
        if len(numeric_cols) > 0:
            analysis_results['statistical_summary'] = {
                col: {
                    'mean': float(df_cleaned[col].mean()),
                    'median': float(df_cleaned[col].median()),
                    'std': float(df_cleaned[col].std()),
                    'min': float(df_cleaned[col].min()),
                    'max': float(df_cleaned[col].max()),
                    'cv': float(df_cleaned[col].std() / df_cleaned[col].mean() * 100) if df_cleaned[col].mean() != 0 else 0
                }
                for col in numeric_cols
            }

        # Data type specific analysis
        if data_type == 'sales':
            analysis_results.update(self.analyze_sales_data(df_cleaned))
        elif data_type == 'financial':
            analysis_results.update(self.analyze_financial_data(df_cleaned))
        elif data_type == 'social_media':
            analysis_results.update(self.analyze_social_media_data(df_cleaned))
        else:
            analysis_results.update(self.analyze_general_data(df_cleaned))

        # Create specialized visualizations
        charts_info = self.create_specialized_visualizations(df_cleaned, filename, data_type)
        analysis_results['visualizations'] = charts_info

        # Get AI insights
        ai_insights = self.get_specialized_gemini_insights(df_cleaned, analysis_results, data_type)
        analysis_results.update(ai_insights)

        return analysis_results

    def generate_cleaning_report(self, cleaning_log, filename):
        """Generate PDF report of cleaning process"""
        cleaning_generator = CleaningReportGenerator()
        pdf_content = cleaning_generator.create_cleaning_report(cleaning_log, filename)
        
        # Upload to Supabase
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_KEY')
        supabase = create_client(supabase_url, supabase_key)
        
        pdf_filename = f"reports/{uuid.uuid4()}_cleaning_report.pdf"
        
        res = supabase.storage.from_("business_files").upload(
            path=pdf_filename,
            file=pdf_content,
            file_options={"content-type": "application/pdf"}
        )
        
        return supabase.storage.from_("business_files").get_public_url(pdf_filename)

    def analyze_and_visualize_data(self, df_cleaned, filename):
        """Analyze cleaned data and create situational visualizations"""
        
        analysis_results = {
            'statistical_summary': {},
            'key_insights': [],
            'business_recommendations': [],
            'data_overview': {},
            'visualizations': [],
            'business_context': self.detect_business_context(df_cleaned, filename)
        }

        # Enhanced statistical summary with business context
        numeric_cols = df_cleaned.select_dtypes(include=[np.number]).columns
        categorical_cols = df_cleaned.select_dtypes(include=['object']).columns
        
        if len(numeric_cols) > 0:
            analysis_results['statistical_summary'] = {
                col: {
                    'mean': float(df_cleaned[col].mean()),
                    'median': float(df_cleaned[col].median()),
                    'std': float(df_cleaned[col].std()),
                    'min': float(df_cleaned[col].min()),
                    'max': float(df_cleaned[col].max()),
                    'cv': float(df_cleaned[col].std() / df_cleaned[col].mean() * 100) if df_cleaned[col].mean() != 0 else 0,  # Coefficient of variation
                    'trend': self.detect_trend(df_cleaned, col)
                }
                for col in numeric_cols
            }

        # Enhanced data overview
        analysis_results['data_overview'] = {
            'total_rows': int(df_cleaned.shape[0]),
            'total_columns': int(df_cleaned.shape[1]),
            'numeric_columns': len(numeric_cols),
            'categorical_columns': len(categorical_cols),
            'data_completeness': float((1 - df_cleaned.isnull().sum().sum() / (df_cleaned.shape[0] * df_cleaned.shape[1])) * 100),
            'time_period': self.detect_time_period(df_cleaned),
            'data_size_category': 'Large' if df_cleaned.shape[0] > 10000 else 'Medium' if df_cleaned.shape[0] > 1000 else 'Small'
        }

        # Create intelligent visualizations based on data characteristics
        charts_info = self.create_intelligent_visualizations(df_cleaned, filename, analysis_results['business_context'])
        analysis_results['visualizations'] = charts_info

        # Get comprehensive AI insights with business context
        ai_insights = self.get_enhanced_gemini_insights(df_cleaned, analysis_results)
        analysis_results.update(ai_insights)

        return analysis_results

    def detect_business_context(self, df, filename):
        """Detect business context from column names and filename"""
        
        # Analyze column names for business context
        columns_lower = [col.lower() for col in df.columns]
        
        contexts = {
            'sales': ['sales', 'revenue', 'price', 'quantity', 'product', 'customer', 'order'],
            'finance': ['profit', 'loss', 'expense', 'cost', 'budget', 'income', 'balance'],
            'marketing': ['campaign', 'clicks', 'impressions', 'conversion', 'ctr', 'roi'],
            'hr': ['employee', 'salary', 'department', 'performance', 'attendance'],
            'operations': ['production', 'inventory', 'supply', 'demand', 'efficiency'],
            'customer': ['customer', 'satisfaction', 'feedback', 'rating', 'churn']
        }
        
        detected_contexts = []
        for context, keywords in contexts.items():
            if any(keyword in ' '.join(columns_lower + [filename.lower()]) for keyword in keywords):
                detected_contexts.append(context)
        
        return detected_contexts[0] if detected_contexts else 'general'

    def detect_trend(self, df, column):
        """Detect trend in numeric data"""
        if len(df) < 3:
            return 'insufficient_data'
        
        # Simple trend detection using linear regression slope
        x = np.arange(len(df))
        y = df[column].values
        
        # Remove NaN values
        mask = ~np.isnan(y)
        if mask.sum() < 3:
            return 'insufficient_data'
        
        slope = np.polyfit(x[mask], y[mask], 1)[0]
        
        if abs(slope) < 0.01:
            return 'stable'
        elif slope > 0:
            return 'increasing'
        else:
            return 'decreasing'

    def detect_time_period(self, df):
        """Detect time period in data"""
        date_cols = []
        for col in df.columns:
            if 'date' in col.lower() or 'time' in col.lower():
                try:
                    pd.to_datetime(df[col])
                    date_cols.append(col)
                except:
                    pass
        
        if date_cols:
            date_col = date_cols[0]
            dates = pd.to_datetime(df[date_col], errors='coerce').dropna()
            if len(dates) > 0:
                return {
                    'start_date': str(dates.min().date()),
                    'end_date': str(dates.max().date()),
                    'duration_days': (dates.max() - dates.min()).days
                }
        
        return None

    def create_intelligent_visualizations(self, df, filename, business_context):
        """AI-powered chart selection based on data content analysis"""
        
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        import seaborn as sns
        
        charts_created = []
        sns.set_style("whitegrid")
        
        # AI-POWERED DATA TYPE DETECTION
        column_analysis = self.analyze_column_types(df)
        
        # RULE 1: LINE GRAPH for Date + Money Analysis
        date_cols = column_analysis['date_columns']
        money_cols = column_analysis['money_columns']
        
        if date_cols and money_cols:
            charts_created.extend(self.create_time_money_line_graphs(df, date_cols, money_cols))
        
        # RULE 2: BAR CHART for Category Performance
        category_cols = column_analysis['category_columns']
        if category_cols and money_cols:
            charts_created.extend(self.create_category_bar_charts(df, category_cols, money_cols))
        
        # RULE 3: PIE CHART for Category Distribution
        if category_cols:
            charts_created.extend(self.create_category_pie_charts(df, category_cols))
        
        return charts_created

    def analyze_column_types(self, df):
        """AI analysis to detect column purposes from content"""
        
        analysis = {
            'date_columns': [],
            'money_columns': [],
            'category_columns': []
        }
        
        for col in df.columns:
            col_lower = col.lower()
            sample_values = df[col].dropna().astype(str).head(10).tolist()
            
            # DETECT DATE COLUMNS
            is_date = False
            if any(keyword in col_lower for keyword in ['date', 'time', 'month', 'year']):
                try:
                    pd.to_datetime(df[col].head(5))
                    is_date = True
                    analysis['date_columns'].append(col)
                except:
                    # Try to detect date patterns in string format
                    if any('/' in str(val) or '-' in str(val) for val in sample_values):
                        is_date = True
                        analysis['date_columns'].append(col)
            
            # DETECT MONEY COLUMNS
            if not is_date:
                is_money = False
                if any(keyword in col_lower for keyword in ['money', 'price', 'cost', 'amount', 'revenue', 'sales', 'value']):
                    is_money = True
                elif df[col].dtype in ['int64', 'float64'] and df[col].min() >= 0:
                    # Positive numeric values likely represent money
                    is_money = True
                
                if is_money:
                    analysis['money_columns'].append(col)
            
            # DETECT CATEGORY COLUMNS
            if not is_date and not is_money:
                unique_count = df[col].nunique()
                total_count = len(df[col])
                
                # If less than 50% unique values, likely categorical
                if unique_count / total_count < 0.5 and unique_count > 1 and unique_count <= 20:
                    analysis['category_columns'].append(col)
                
                # Special keywords for categories
                elif any(keyword in col_lower for keyword in ['type', 'category', 'name', 'kind', 'status']):
                    analysis['category_columns'].append(col)
        
        return analysis

    def create_time_money_line_graphs(self, df, date_cols, money_cols):
        """Create line graphs for date vs money analysis showing full data range"""
        charts = []

        for date_col in date_cols[:1]:  # Use first date column
            for money_col in money_cols[:1]:  # Use first money column

                # Prepare data for time series
                df_time = df[[date_col, money_col]].copy()
                df_time[date_col] = pd.to_datetime(df_time[date_col], errors='coerce')
                df_time = df_time.dropna().sort_values(date_col)

                # Aggregate by day/week/month based on data span
                date_range = (df_time[date_col].max() - df_time[date_col].min()).days

                if date_range > 90:  # More than 3 months, group by month
                    df_time['period'] = df_time[date_col].dt.to_period('M')
                    period_label = 'Month'
                elif date_range > 30:  # More than 1 month, group by week
                    df_time['period'] = df_time[date_col].dt.to_period('W')
                    period_label = 'Week'
                else:  # Daily analysis
                    df_time['period'] = df_time[date_col].dt.date
                    period_label = 'Date'

                # Aggregate money by period WITHOUT filtering out any periods
                revenue_by_period = df_time.groupby('period')[money_col].sum().reset_index()
                revenue_by_period['period_str'] = revenue_by_period['period'].astype(str)

                # *** IMPORTANT: Ensure NO slicing or filtering here ***
                # For example, DO NOT do something like: revenue_by_period = revenue_by_period.tail(3)

                # Create line graph using full aggregated data
                plt.figure(figsize=(14, 8))
                plt.plot(range(len(revenue_by_period)), revenue_by_period[money_col],
                        marker='o', linewidth=3, markersize=8, color='#2E86AB')

                # Add trend line
                z = np.polyfit(range(len(revenue_by_period)), revenue_by_period[money_col], 1)
                p = np.poly1d(z)
                trend_direction = "Growing" if z[0] > 0 else "Declining" if z < 0 else "Stable"
                plt.plot(range(len(revenue_by_period)), p(range(len(revenue_by_period))),
                        "--", alpha=0.8, linewidth=2, color='red')

                plt.title(f'Revenue Trend: {money_col} by {period_label}',
                        fontsize=16, fontweight='bold', pad=20)
                plt.xlabel(f'Time Period ({period_label})', fontsize=12)
                plt.ylabel(f'{money_col} ($)', fontsize=12)
                plt.xticks(range(len(revenue_by_period)),
                        [str(p)[:10] for p in revenue_by_period['period_str']], rotation=45)
                plt.grid(True, alpha=0.3)
                plt.tight_layout()

                chart_url = self.save_chart_to_supabase(plt, f"visualizations/{uuid.uuid4()}_revenue_trend.png")

                charts.append({
                    'type': 'line_graph',
                    'title': f'Revenue Performance: {trend_direction} Trend by {period_label}',
                    'url': chart_url,
                    'description': f'Shows {trend_direction.lower()} revenue trend over time. Total revenue: ${revenue_by_period[money_col].sum():,.2f} across {len(revenue_by_period)} {period_label.lower()}s.'
                })
                plt.close()

        return charts

    def create_category_bar_charts(self, df, category_cols, money_cols):
        """Create bar charts for category performance"""
        charts = []
        
        for cat_col in category_cols[:1]:  # Use first category column
            for money_col in money_cols[:1]:  # Use first money column
                
                # Aggregate revenue by category
                category_revenue = df.groupby(cat_col)[money_col].sum().sort_values(ascending=False).head(10)
                
                plt.figure(figsize=(12, 8))
                colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', 
                        '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf']
                
                bars = plt.bar(range(len(category_revenue)), category_revenue.values,
                            color=colors[:len(category_revenue)], alpha=0.8)
                
                # Add value labels on bars
                for bar, value in zip(bars, category_revenue.values):
                    plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + max(category_revenue.values)*0.01,
                            f'${value:,.0f}', ha='center', va='bottom', fontsize=10, fontweight='bold')
                
                plt.title(f'Revenue by {cat_col}', fontsize=16, fontweight='bold', pad=20)
                plt.xlabel(f'{cat_col} Categories', fontsize=12)
                plt.ylabel(f'Total Revenue ($)', fontsize=12)
                plt.xticks(range(len(category_revenue)), category_revenue.index, rotation=45, ha='right')
                plt.tight_layout()
                
                chart_url = self.save_chart_to_supabase(plt, f"visualizations/{uuid.uuid4()}_category_revenue.png")
                
                # Business insights
                top_performer = category_revenue.index[0]
                top_value = category_revenue.iloc[0]
                total_value = category_revenue.sum()
                top_percentage = (top_value / total_value) * 100
                
                charts.append({
                    'type': 'bar_chart',
                    'title': f'Revenue Leaders: Top Performing {cat_col}',
                    'url': chart_url,
                    'description': f'{top_performer} leads with ${top_value:,.0f} ({top_percentage:.1f}% of total). Shows clear revenue concentration and market opportunities.'
                })
                plt.close()
        
        return charts

    def create_category_pie_charts(self, df, category_cols):
        """Create pie charts for category distribution"""
        charts = []
        
        for cat_col in category_cols[:1]:  # Use first category column
            
            # Get category distribution
            category_counts = df[cat_col].value_counts().head(8)
            
            plt.figure(figsize=(10, 10))
            colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F']
            
            wedges, texts, autotexts = plt.pie(category_counts.values, labels=category_counts.index, 
                                            autopct='%1.1f%%', colors=colors, startangle=90,
                                            textprops={'fontsize': 11})
            
            plt.title(f'Market Share: {cat_col} Distribution', fontsize=16, fontweight='bold', pad=20)
            
            # Enhance appearance
            for autotext in autotexts:
                autotext.set_color('white')
                autotext.set_fontweight('bold')
            
            chart_url = self.save_chart_to_supabase(plt, f"visualizations/{uuid.uuid4()}_market_share.png")
            
            # Business insights
            largest_segment = category_counts.index[0]
            largest_percentage = (category_counts.iloc[0] / category_counts.sum()) * 100
            
            charts.append({
                'type': 'pie_chart',
                'title': f'Market Distribution: {cat_col} Share Analysis',
                'url': chart_url,
                'description': f'{largest_segment} dominates with {largest_percentage:.1f}% market share. Critical for understanding customer preferences and strategic positioning.'
            })
            plt.close()
        
        return charts


    def save_chart_to_supabase(self, plt_figure, chart_path):
        """Save matplotlib chart to Supabase storage"""
        
        # Save chart to BytesIO
        img_buffer = BytesIO()
        plt_figure.savefig(img_buffer, format='png', dpi=300, bbox_inches='tight')
        img_content = img_buffer.getvalue()
        
        # Upload to Supabase
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_KEY')
        supabase = create_client(supabase_url, supabase_key)
        
        res = supabase.storage.from_("business_files").upload(
            path=chart_path,
            file=img_content,
            file_options={"content-type": "image/png"}
        )
        
        return supabase.storage.from_("business_files").get_public_url(chart_path)

    def get_gemini_analysis_insights(self, df_cleaned, analysis_results):
        """Get AI-powered insights and recommendations"""
        
        genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
        model = genai.GenerativeModel('gemini-1.5-flash')

        prompt = f"""
        Based on this cleaned dataset analysis, provide insights and recommendations:

        Data Overview: {analysis_results['data_overview']}
        Statistical Summary: {analysis_results['statistical_summary']}
        
        Sample data: {df_cleaned.head(5).to_dict()}

        Please provide:
        1. Key insights (3-5 important findings)
        2. Business recommendations (3-5 actionable suggestions)
        
        Format as JSON with keys: key_insights, business_recommendations
        """

        try:
            response = model.generate_content(prompt)
            import json
            ai_insights = json.loads(response.text)
            return ai_insights
        except:
            return {
                'key_insights': [
                    "Data has been successfully cleaned and is ready for analysis",
                    "Statistical patterns show normal distribution in numeric variables",
                    "Data quality is now sufficient for business decision making"
                ],
                'business_recommendations': [
                    "Monitor data quality regularly to prevent similar issues",
                    "Implement data validation rules at the source",
                    "Use cleaned dataset for predictive modeling or further analysis"
                ]
            }

    def generate_analysis_pdf(self, analysis_results, filename, df_cleaned):
        """Generate comprehensive PDF analysis report WITH VISUAL CHARTS"""
        try:
            from .utils.report_generators import PDFGenerator
            
            # Debug: Print DataFrame info
            print(f"DataFrame shape: {df_cleaned.shape}")
            print(f"DataFrame columns: {df_cleaned.columns.tolist()}")
            
            pdf_generator = PDFGenerator()
            # Pass the DataFrame to enable chart generation
            pdf_content = pdf_generator.create_analysis_report(
                analysis_results, filename, df_cleaned  # Pass the DataFrame!
            )
            
            # Upload to Supabase
            supabase_url = os.getenv('SUPABASE_URL')
            supabase_key = os.getenv('SUPABASE_KEY')
            supabase = create_client(supabase_url, supabase_key)
            
            pdf_filename = f"reports/{uuid.uuid4()}_analysis_report_with_charts.pdf"
            res = supabase.storage.from_("business_files").upload(
                path=pdf_filename,
                file=pdf_content,
                file_options={"content-type": "application/pdf"}
            )
            
            return supabase.storage.from_("business_files").get_public_url(pdf_filename)
            
        except Exception as e:
            print(f"PDF Generation Error: {str(e)}")
            raise Exception(f"Failed to generate PDF with charts: {str(e)}")

    def generate_analysis_ppt(self, analysis_results, filename, df_cleaned):
        """Generate PowerPoint presentation WITH VISUAL CHARTS"""
        try:
            from .utils.report_generators import PPTGenerator
            
            ppt_generator = PPTGenerator()
            # Pass the DataFrame to enable chart generation
            ppt_content = ppt_generator.create_analysis_presentation(
                analysis_results, filename, df_cleaned  # Pass the DataFrame!
            )
            
            # Upload to Supabase
            supabase_url = os.getenv('SUPABASE_URL')
            supabase_key = os.getenv('SUPABASE_KEY')
            supabase = create_client(supabase_url, supabase_key)
            
            ppt_filename = f"reports/{uuid.uuid4()}_analysis_presentation_with_charts.pptx"
            res = supabase.storage.from_("business_files").upload(
                path=ppt_filename,
                file=ppt_content,
                file_options={"content-type": "application/vnd.openxmlformats-officedocument.presentationml.presentation"}
            )
            
            return supabase.storage.from_("business_files").get_public_url(ppt_filename)
            
        except Exception as e:
            print(f"PPT Generation Error: {str(e)}")
            raise Exception(f"Failed to generate PPT with charts: {str(e)}")


    def download_file_from_supabase(self, file_url):
        """Download file content from Supabase Storage"""
        try:
            response = requests.get(file_url, timeout=30)
            response.raise_for_status()
            return response.content
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to download file from Supabase: {str(e)}")
        
    def create_correlation_heatmap(self, df, numeric_cols):
        """Create correlation heatmap visualization"""
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        import seaborn as sns
        
        plt.figure(figsize=(12, 8))
        correlation_matrix = df[numeric_cols].corr()
        sns.heatmap(correlation_matrix, annot=True, cmap='coolwarm', center=0)
        plt.title('Correlation Matrix')
        
        chart_path = f"visualizations/{uuid.uuid4()}_correlation_heatmap.png"
        chart_url = self.save_chart_to_supabase(plt, chart_path)
        plt.close()
        
        return {
            'type': 'heatmap',
            'title': 'Correlation Matrix',
            'url': chart_url,
            'description': 'Shows correlations between numeric variables'
        }

    def create_distribution_analysis(self, df, numeric_cols):
        """Create distribution analysis for key metrics"""
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        
        charts = []
        for col in numeric_cols:
            plt.figure(figsize=(10, 6))
            plt.hist(df[col].dropna(), bins=30, alpha=0.7, color='skyblue')
            plt.title(f'Distribution of {col}')
            plt.xlabel(col)
            plt.ylabel('Frequency')
            
            chart_path = f"visualizations/{uuid.uuid4()}_{col}_distribution.png"
            chart_url = self.save_chart_to_supabase(plt, chart_path)
            charts.append({
                'type': 'histogram',
                'title': f'Distribution of {col}',
                'url': chart_url,
                'description': f'Shows the frequency distribution of {col} values'
            })
            plt.close()
        
        return charts

    def create_time_series_analysis(self, df):
        """Create time series analysis if time data exists"""
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        
        charts = []
        date_cols = []
        
        # Find date columns
        for col in df.columns:
            if 'date' in col.lower() or 'time' in col.lower():
                try:
                    pd.to_datetime(df[col])
                    date_cols.append(col)
                except:
                    pass
        
        if date_cols:
            date_col = date_cols[0]
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            
            if len(numeric_cols) > 0:
                df_sorted = df.sort_values(date_col)
                
                plt.figure(figsize=(12, 6))
                plt.plot(pd.to_datetime(df_sorted[date_col]), df_sorted[numeric_cols[0]], 
                        marker='o', linewidth=2, markersize=4)
                plt.title(f'{numeric_cols[0]} Over Time')
                plt.xlabel('Date')
                plt.ylabel(numeric_cols[0])
                plt.xticks(rotation=45)
                plt.grid(True, alpha=0.3)
                plt.tight_layout()
                
                chart_path = f"visualizations/{uuid.uuid4()}_time_series.png"
                chart_url = self.save_chart_to_supabase(plt, chart_path)
                charts.append({
                    'type': 'time_series',
                    'title': f'{numeric_cols[0]} Time Series',
                    'url': chart_url,
                    'description': f'Shows how {numeric_cols[0]} changes over time'
                })
                plt.close()
        
        return charts
    
    def get_enhanced_gemini_insights(self, df_cleaned, analysis_results):
        """Get comprehensive business analysis with direct chart generation instructions"""
        
        genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
        model = genai.GenerativeModel('gemini-1.5-flash')

        # Get data characteristics for chart suggestions
        numeric_cols = df_cleaned.select_dtypes(include=['float64', 'int64']).columns.tolist()
        text_cols = df_cleaned.select_dtypes(include=['object']).columns.tolist()
        date_cols = [col for col in df_cleaned.columns if 'date' in col.lower() or 'time' in col.lower()]

        prompt = f"""
        You are a senior business analyst creating executive charts and dashboards. Generate ONLY the business analysis text without chart recommendations.

        Your system will automatically create these visual charts:
        - Line charts for time-series data ({', '.join(date_cols) if date_cols else 'None detected'})
        - Bar charts for category performance ({', '.join(text_cols[:3]) if text_cols else 'None detected'})
        - Pie charts for distribution analysis ({', '.join(text_cols[:2]) if text_cols else 'None detected'})
        - Heatmaps for correlation analysis ({', '.join(numeric_cols[:3]) if numeric_cols else 'None detected'})
        - KPI dashboards with key metrics

        DATASET CONTEXT:
        - Industry: {analysis_results['business_context']}
        - Records: {analysis_results['data_overview']['total_rows']:,}
        - Data Quality: {analysis_results['data_overview']['data_completeness']:.1f}%
        - Available Data: {len(numeric_cols)} numeric, {len(text_cols)} categorical, {len(date_cols)} date columns

        REPORT STRUCTURE (NO CHART RECOMMENDATIONS - ONLY ANALYSIS):

        # Business Performance Analysis Report

        ## Executive Summary
        Provide 2-3 sentences summarizing overall business performance and key findings.

        ## Key Performance Indicators
        ### Revenue & Performance Metrics
        - Total transactions: {analysis_results['data_overview']['total_rows']:,}
        - Data completeness: {analysis_results['data_overview']['data_completeness']:.1f}%
        - Analysis period: {analysis_results['data_overview'].get('time_period', {}).get('start_date', 'N/A')} to {analysis_results['data_overview'].get('time_period', {}).get('end_date', 'N/A')}

        ### Performance Trends
        Analyze performance patterns based on available data trends.

        ## Market Analysis
        ### Top Performers
        Identify leading categories/segments from the data.

        ### Market Distribution
        Analyze market share and distribution patterns.

        ## Strategic Insights
        ### Customer Behavior
        Describe usage patterns and customer preferences.

        ### Operational Excellence
        Highlight efficiency opportunities and process improvements.

        ## Business Recommendations
        ### Immediate Actions (Next 30 days)
        1. [Specific actionable item]
        2. [Specific actionable item]
        3. [Specific actionable item]

        ### Strategic Initiatives (Next Quarter)
        1. [Medium-term strategic action]
        2. [Medium-term strategic action]
        3. [Medium-term strategic action]

        ### Long-term Growth (Next Year)
        1. [Long-term strategic initiative]
        2. [Long-term strategic initiative]
        3. [Long-term strategic initiative]

        ## Risk Assessment
        Identify potential business risks and mitigation strategies.

        ## Conclusion
        Summarize business health and growth potential.

        IMPORTANT: 
        - Do NOT include any "📊 Recommended Chart" or "📈 Suggested Visualization" text
        - Do NOT mention chart types or visualization recommendations
        - Focus ONLY on business insights, metrics, and recommendations
        - The system will automatically generate all necessary charts and graphs
        - Keep content business-focused and executive-ready
        """

        try:
            response = model.generate_content(prompt)
            report_content = response.text
            
            return {
                'full_report': report_content,
                'chart_recommendations': [],  # Empty since charts are generated automatically
                'report_sections': {
                    'executive_summary': 'Business analysis without chart suggestions',
                    'key_insights': 'Performance insights and metrics',
                    'recommendations': 'Actionable business strategies',
                    'visualizations': 'Charts generated automatically by system'
                }
            }
            
        except Exception as e:
            return {
                'full_report': f"# Business Analysis Report\n\nComprehensive analysis of {df_cleaned.shape[0]:,} business records reveals strategic opportunities for growth optimization.\n\n## Executive Summary\nData analysis indicates strong potential for revenue enhancement through targeted strategic initiatives.\n\n## Key Performance Indicators\n- Total Records: {df_cleaned.shape[0]:,}\n- Data Quality: High\n- Analysis Coverage: Complete",
                'chart_recommendations': [],
                'error': str(e)
            }
        
    def analyze_sales_data(self, df):
        """Specialized analysis for sales data"""
        specialized_metrics = {}
        
        # Try to identify key sales columns
        sales_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['sales', 'revenue', 'total', 'amount'])]
        quantity_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['quantity', 'qty', 'sold'])]
        product_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['product', 'item', 'category'])]
        
        if sales_cols:
            sales_col = sales_cols[0]
            specialized_metrics['total_sales'] = float(df[sales_col].sum())
            specialized_metrics['average_transaction'] = float(df[sales_col].mean())
            specialized_metrics['sales_std'] = float(df[sales_col].std())
            
        if quantity_cols:
            qty_col = quantity_cols[0]
            specialized_metrics['total_quantity_sold'] = float(df[qty_col].sum())
            specialized_metrics['average_quantity'] = float(df[qty_col].mean())
            
        if product_cols:
            product_col = product_cols[0] 
            specialized_metrics['unique_products'] = int(df[product_col].nunique())
            specialized_metrics['top_products'] = df[product_col].value_counts().head().to_dict()
            
        return {
            'specialized_metrics': specialized_metrics,
            'business_focus': 'sales_performance',
            'analysis_type': 'Sales Performance Analysis'
        }

    def analyze_financial_data(self, df):
        """Specialized analysis for financial data"""
        specialized_metrics = {}
        
        # Try to identify key financial columns
        revenue_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['revenue', 'sales', 'income'])]
        profit_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['profit', 'margin', 'net'])]
        cost_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['cost', 'expense', 'cogs', 'opex'])]
        
        revenue_col = revenue_cols[0] if revenue_cols else None
        profit_col = profit_cols[0] if profit_cols else None
        cost_col = cost_cols[0] if cost_cols else None

        if profit_col and revenue_col:
            specialized_metrics['profit_margin'] = float(df[profit_col].mean() / df[revenue_col].mean() * 100)
        else:
            specialized_metrics['profit_margin'] = 0
        if cost_col:
            specialized_metrics['total_costs'] = float(df[cost_col].sum())
            specialized_metrics['cost_ratio'] = float(df[cost_col].mean() / df[revenue_col].mean() * 100) if revenue_col else 0
        else:
            specialized_metrics['total_costs'] = 0
            specialized_metrics['cost_ratio'] = 0
            
        return {
            'specialized_metrics': specialized_metrics,
            'business_focus': 'financial_performance',
            'analysis_type': 'Financial Performance Analysis'
        }

    def analyze_social_media_data(self, df):
        """Specialized analysis for social media data"""
        specialized_metrics = {}
        
        # Try to identify key social media columns
        engagement_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['likes', 'shares', 'comments', 'views', 'engagement'])]
        platform_cols = [col for col in df.columns if 'platform' in col.lower()]
        content_cols = [col for col in df.columns if 'content' in col.lower()]

        # engagement_cols is a list of potentially mixed-type columns
        engagement_numeric_cols = [col for col in engagement_cols if pd.api.types.is_numeric_dtype(df[col])]

        platform_col = platform_cols[0] if platform_cols else None

        if platform_col and engagement_numeric_cols:
            platform_means = df.groupby(platform_col)[engagement_numeric_cols].mean()
            best = {col: platform_means[col].idxmax() for col in engagement_numeric_cols}
            specialized_metrics['best_performing_platform_per_metric'] = best
        
        if engagement_cols:
            for col in engagement_cols:
                if col.lower() in ['likes', 'shares', 'comments', 'views']:
                    specialized_metrics[f'total_{col.lower()}'] = float(df[col].sum())
                    specialized_metrics[f'average_{col.lower()}'] = float(df[col].mean())
            
        if content_cols:
            content_col = content_cols[0]
            if engagement_numeric_cols:
                by_content = df.groupby(content_col)[engagement_numeric_cols].mean()
                best = {col: by_content[col].idxmax() for col in engagement_numeric_cols}
                specialized_metrics['best_content_type_per_metric'] = best
            # Distribution should still use all as before:
            specialized_metrics['content_type_distribution'] = df[content_col].value_counts().to_dict()

            
        # Calculate engagement rate if possible
        if 'Views' in df.columns and 'Likes' in df.columns:
            specialized_metrics['average_engagement_rate'] = float((df['Likes'] / df['Views'] * 100).mean())
            
        return {
            'specialized_metrics': specialized_metrics,
            'business_focus': 'social_media_performance',
            'analysis_type': 'Social Media Performance Analysis'
        }

    def analyze_general_data(self, df):
        """General analysis for unspecified data types"""
        return {
            'specialized_metrics': {},
            'business_focus': 'general_analysis',
            'analysis_type': 'General Data Analysis'
        }

    def calculate_growth_rate(self, df, column):
        """Calculate growth rate for a time series column"""
        try:
            # Sort by date if date column exists
            date_cols = [col for col in df.columns if 'date' in col.lower()]
            if date_cols:
                df_sorted = df.sort_values(date_cols[0])
                values = df_sorted[column].values
                if len(values) > 1:
                    return float((values[-1] - values) / values * 100)
            return 0.0
        except:
            return 0.0

    def create_specialized_visualizations(self, df, filename, data_type):
        """Create visualizations based on data type"""
        charts = []
        
        if data_type == 'sales':
            charts.extend(self.create_sales_charts(df, filename))
        elif data_type == 'financial':
            charts.extend(self.create_financial_charts(df, filename))
        elif data_type == 'social_media':
            charts.extend(self.create_social_media_charts(df, filename))
        else:
            charts.extend(self.create_general_charts(df, filename))
            
        return charts

    def create_sales_charts(self, df, filename):
        """Create sales-specific charts"""
        charts = []
        
        # Sales by product chart
        product_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['product', 'item', 'category'])]
        sales_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['sales', 'revenue', 'total', 'amount'])]
        
        if product_cols and sales_cols:
            plt.figure(figsize=(14, 8))
            sales_by_product = df.groupby(product_cols[0])[sales_cols[0]].sum().sort_values(ascending=False).head(10)
            
            colors = plt.cm.Set3(np.linspace(0, 1, len(sales_by_product)))
            bars = plt.bar(range(len(sales_by_product)), sales_by_product.values, color=colors)
            
            # Add value labels on bars
            for bar, value in zip(bars, sales_by_product.values):
                plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + max(sales_by_product.values)*0.01,
                        f'${value:,.0f}', ha='center', va='bottom', fontsize=10, fontweight='bold')
            
            plt.title(f'Top 10 Products by Sales Revenue', fontsize=16, fontweight='bold', pad=20)
            plt.xlabel('Products', fontsize=12)
            plt.ylabel('Sales Revenue ($)', fontsize=12)
            plt.xticks(range(len(sales_by_product)), sales_by_product.index, rotation=45, ha='right')
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            
            chart_url = self.save_chart_to_supabase(plt, f"visualizations/{uuid.uuid4()}_sales_by_product.png")
            charts.append({
                'type': 'bar_chart',
                'title': 'Sales Performance by Product',
                'url': chart_url,
                'description': f'Top performing product: {sales_by_product.index} with ${sales_by_product.iloc[0]:,.0f} in sales'
            })
            plt.close()
        
        # Sales trend over time if date column exists
        date_cols = [col for col in df.columns if 'Date' in col.lower()]
        if date_cols and sales_cols:
            plt.figure(figsize=(14, 8))
            df_temp = df.copy()
            df_temp[date_cols] = pd.to_datetime(df_temp[date_cols], errors='coerce')
            daily_sales = df_temp.groupby(df_temp[date_cols].dt.date)[sales_cols].sum()
            
            plt.plot(daily_sales.index, daily_sales.values, marker='o', linewidth=3, markersize=6, color='#2E86AB')
            plt.title(f'Daily Sales Trend', fontsize=16, fontweight='bold', pad=20)
            plt.xlabel('Date', fontsize=12)
            plt.ylabel('Sales ($)', fontsize=12)
            plt.xticks(rotation=45)
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            
            chart_url = self.save_chart_to_supabase(plt, f"visualizations/{uuid.uuid4()}_sales_trend.png")
            charts.append({
                'type': 'line_chart',
                'title': 'Sales Trend Over Time',
                'url': chart_url,
                'description': f'Sales trend showing daily performance from {daily_sales.index[0]} to {daily_sales.index[-1]}'
            })
            plt.close()
        
        return charts

    def create_financial_charts(self, df, filename):
        """Create financial-specific charts"""
        charts = []
        
        # Revenue vs Profit chart
        revenue_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['revenue', 'sales'])]
        profit_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['profit', 'net'])]
        
        if revenue_cols and profit_cols:
            plt.figure(figsize=(14, 8))
            
            # Create dual axis chart
            fig, ax1 = plt.subplots(figsize=(14, 8))
            
            dates = range(len(df))
            if any('date' in col.lower() for col in df.columns):
                date_col = [col for col in df.columns if 'date' in col.lower()][0]
                dates = pd.to_datetime(df[date_col], errors='coerce')
                dates = dates.dt.strftime('%Y-%m-%d')
            
            color1 = 'tab:blue'
            ax1.set_xlabel('Period')
            ax1.set_ylabel('Revenue ($)', color=color1)
            line1 = ax1.plot(dates, df[revenue_cols[0]], color=color1, linewidth=3, marker='o', markersize=6, label='Revenue')
            ax1.tick_params(axis='y', labelcolor=color1)
            
            ax2 = ax1.twinx()
            color2 = 'tab:red'
            ax2.set_ylabel('Profit ($)', color=color2)
            line2 = ax2.plot(dates, df[profit_cols[0]], color=color2, linewidth=3, marker='s', markersize=6, label='Profit')
            ax2.tick_params(axis='y', labelcolor=color2)
            
            plt.title('Revenue vs Profit Analysis', fontsize=16, fontweight='bold', pad=20)
            plt.xticks(rotation=45)
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            
            chart_url = self.save_chart_to_supabase(plt, f"visualizations/{uuid.uuid4()}_revenue_profit.png")
            charts.append({
                'type': 'line_chart',
                'title': 'Revenue vs Profit Comparison',
                'url': chart_url,
                'description': f'Financial performance showing revenue and profit correlation over time'
            })
            plt.close()
        
        # Profit margin chart
        if 'Profit_Margin' in df.columns:
            plt.figure(figsize=(12, 8))
            
            dates = range(len(df))
            if any('date' in col.lower() for col in df.columns):
                date_col = [col for col in df.columns if 'date' in col.lower()][0]
                dates = pd.to_datetime(df[date_col], errors='coerce')
                dates = dates.dt.strftime('%Y-%m-%d')
            
            plt.plot(dates, df['Profit_Margin'] * 100, marker='o', linewidth=3, markersize=6, color='green')
            plt.axhline(y=df['Profit_Margin'].mean() * 100, color='red', linestyle='--', alpha=0.7, label=f'Average: {df["Profit_Margin"].mean()*100:.1f}%')
            
            plt.title('Profit Margin Trend', fontsize=16, fontweight='bold', pad=20)
            plt.xlabel('Period', fontsize=12)
            plt.ylabel('Profit Margin (%)', fontsize=12)
            plt.xticks(rotation=45)
            plt.legend()
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            
            chart_url = self.save_chart_to_supabase(plt, f"visualizations/{uuid.uuid4()}_profit_margin.png")
            charts.append({
                'type': 'line_chart',
                'title': 'Profit Margin Analysis',
                'url': chart_url,
                'description': f'Profit margin trend with average of {df["Profit_Margin"].mean()*100:.1f}%'
            })
            plt.close()
        
        return charts

    def create_social_media_charts(self, df, filename):
        """Create social media-specific charts"""
        charts = []
        
        # Platform performance chart
        if 'Platform' in df.columns:
            engagement_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['likes', 'views', 'shares', 'comments'])]
            
            if engagement_cols:
                plt.figure(figsize=(12, 8))
                platform_performance = df.groupby('Platform')[engagement_cols[0]].mean().sort_values(ascending=False)
                
                colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
                bars = plt.bar(platform_performance.index, platform_performance.values, color=colors[:len(platform_performance)])
                
                # Add value labels
                for bar, value in zip(bars, platform_performance.values):
                    plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + max(platform_performance.values)*0.01,
                            f'{value:,.0f}', ha='center', va='bottom', fontsize=10, fontweight='bold')
                
                plt.title(f'Average {engagement_cols[0]} by Platform', fontsize=16, fontweight='bold', pad=20)
                plt.xlabel('Platform', fontsize=12)
                plt.ylabel(f'Average {engagement_cols}', fontsize=12)
                plt.xticks(rotation=45)
                plt.grid(True, alpha=0.3)
                plt.tight_layout()
                
                chart_url = self.save_chart_to_supabase(plt, f"visualizations/{uuid.uuid4()}_platform_performance.png")
                charts.append({
                    'type': 'bar_chart',
                    'title': f'Platform Performance - {engagement_cols[0]}',
                    'url': chart_url,
                    'description': f'Best performing platform: {platform_performance.index[0]} with avg {platform_performance.iloc[0]:,.0f} {", ".join(engagement_cols).lower()}'
                })
                plt.close()
        
        # Content type performance
        if 'Content_Type' in df.columns:
            plt.figure(figsize=(10, 10))
            content_performance = df['Content_Type'].value_counts()
            
            colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F']
            wedges, texts, autotexts = plt.pie(content_performance.values, labels=content_performance.index,
                                              autopct='%1.1f%%', colors=colors, startangle=90,
                                              textprops={'fontsize': 11})
            
            plt.title('Content Type Distribution', fontsize=16, fontweight='bold', pad=20)
            
            for autotext in autotexts:
                autotext.set_color('white')
                autotext.set_fontweight('bold')
            
            chart_url = self.save_chart_to_supabase(plt, f"visualizations/{uuid.uuid4()}_content_distribution.png")
            charts.append({
                'type': 'pie_chart',
                'title': 'Content Type Distribution',
                'url': chart_url,
                'description': f'Most common content type: {content_performance.index[0]} ({content_performance.iloc[0]:,.0f} posts)'
            })
            plt.close()
        
        # Engagement correlation heatmap
        engagement_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['likes', 'views', 'shares', 'comments'])]
        if len(engagement_cols) >= 2:
            plt.figure(figsize=(10, 8))
            correlation_matrix = df[engagement_cols].corr()
            
            sns.heatmap(correlation_matrix, annot=True, cmap='coolwarm', center=0,
                       square=True, fmt='.2f', cbar_kws={'shrink': 0.8})
            plt.title('Engagement Metrics Correlation', fontsize=16, fontweight='bold', pad=20)
            plt.tight_layout()
            
            chart_url = self.save_chart_to_supabase(plt, f"visualizations/{uuid.uuid4()}_engagement_correlation.png")
            charts.append({
                'type': 'heatmap',
                'title': 'Engagement Metrics Correlation',
                'url': chart_url,
                'description': 'Correlation analysis between different engagement metrics'
            })
            plt.close()
        
        return charts

    def create_general_charts(self, df, filename):
        """Create general charts for unspecified data types"""
        charts = []
        
        # Generic correlation heatmap for numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) >= 2:
            plt.figure(figsize=(12, 8))
            correlation_matrix = df[numeric_cols].corr()
            
            sns.heatmap(correlation_matrix, annot=True, cmap='coolwarm', center=0,
                       square=True, fmt='.2f', cbar_kws={'shrink': 0.8})
            plt.title('Correlation Matrix', fontsize=16, fontweight='bold', pad=20)
            plt.tight_layout()
            
            chart_url = self.save_chart_to_supabase(plt, f"visualizations/{uuid.uuid4()}_correlation_matrix.png")
            charts.append({
                'type': 'heatmap',
                'title': 'Data Correlation Analysis',
                'url': chart_url,
                'description': 'Correlation analysis between numeric variables'
            })
            plt.close()
        
        return charts

    def get_specialized_gemini_insights(self, df_cleaned, analysis_results, data_type):
        """Get AI insights specialized for each data type"""
        genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
        model = genai.GenerativeModel('gemini-1.5-flash')

        # Create specialized prompts based on data type
        if data_type == 'sales':
            prompt = self.create_sales_analysis_prompt(df_cleaned, analysis_results)
        elif data_type == 'financial':
            prompt = self.create_financial_analysis_prompt(df_cleaned, analysis_results)
        elif data_type == 'social_media':
            prompt = self.create_social_media_analysis_prompt(df_cleaned, analysis_results)
        else:
            prompt = self.create_general_analysis_prompt(df_cleaned, analysis_results)

        try:
            response = model.generate_content(prompt)
            return {
                'ai_insights': response.text,
                'analysis_focus': data_type
            }
        except Exception as e:
            return {
                'ai_insights': f"AI analysis completed for {data_type} data with {df_cleaned.shape[0]} records.",
                'analysis_focus': data_type,
                'error': str(e)
            }

    def create_sales_analysis_prompt(self, df, analysis_results):
        """Create specialized prompt for sales data analysis"""
        return f"""
        You are a senior sales analyst. Analyze this sales dataset and provide executive-level insights.

        Dataset Overview:
        - Records: {df.shape[0]:,}
        - Columns: {df.columns.tolist()}
        - Specialized Metrics: {analysis_results.get('specialized_metrics', {})}

        Provide a comprehensive sales analysis including:

        ## Executive Summary
        Key sales performance highlights and overall business health.

        ## Sales Performance Analysis
        - Revenue trends and patterns
        - Product performance rankings
        - Customer behavior insights
        - Peak sales periods identification

        ## Key Performance Indicators
        - Total sales volume and value
        - Average transaction size
        - Sales conversion metrics
        - Product mix analysis

        ## Strategic Recommendations
        ### Immediate Actions (Next 30 days)
        1. Specific actionable recommendations
        2. Quick wins for sales improvement
        3. Inventory optimization suggestions

        ### Strategic Initiatives (Next Quarter)
        1. Market expansion opportunities
        2. Product development priorities
        3. Customer retention strategies

        ## Market Opportunities
        - Underperforming segments with potential
        - High-value customer segments
        - Seasonal trends to capitalize on

        ## Risk Assessment
        - Declining product lines
        - Customer concentration risks
        - Market saturation indicators

        Focus on actionable insights that can drive sales growth and operational efficiency.
        """

    def create_financial_analysis_prompt(self, df, analysis_results):
        """Create specialized prompt for financial data analysis"""
        return f"""
        You are a senior financial analyst. Analyze this financial dataset and provide executive-level insights.

        Dataset Overview:
        - Records: {df.shape[0]:,}
        - Columns: {df.columns.tolist()}
        - Specialized Metrics: {analysis_results.get('specialized_metrics', {})}

        Provide a comprehensive financial analysis including:

        ## Executive Summary
        Overall financial health and key performance indicators.

        ## Financial Performance Analysis
        - Revenue growth trends
        - Profitability analysis
        - Cost structure evaluation
        - Margin analysis and optimization

        ## Key Financial Metrics
        - Revenue growth rates
        - Profit margins and trends
        - Cost ratios and efficiency
        - Return on investment indicators

        ## Strategic Recommendations
        ### Immediate Actions (Next 30 days)
        1. Cost optimization opportunities
        2. Revenue enhancement strategies
        3. Cash flow improvements

        ### Strategic Initiatives (Next Quarter)
        1. Investment priorities
        2. Cost structure optimization
        3. Revenue diversification strategies

        ## Financial Health Assessment
        - Liquidity and solvency indicators
        - Operational efficiency metrics
        - Growth sustainability analysis

        ## Risk Management
        - Financial risk factors
        - Market volatility impacts
        - Mitigation strategies

        Focus on financial metrics that drive shareholder value and business sustainability.
        """

    def create_social_media_analysis_prompt(self, df, analysis_results):
        """Create specialized prompt for social media data analysis"""
        return f"""
        You are a senior social media strategist. Analyze this social media dataset and provide executive-level insights.

        Dataset Overview:
        - Records: {df.shape[0]:,}
        - Columns: {df.columns.tolist()}
        - Specialized Metrics: {analysis_results.get('specialized_metrics', {})}

        Provide a comprehensive social media analysis including:

        ## Executive Summary
        Overall social media performance and engagement health.

        ## Engagement Performance Analysis
        - Platform-specific performance
        - Content type effectiveness
        - Audience engagement patterns
        - Viral content identification

        ## Key Social Media Metrics
        - Engagement rates by platform
        - Content performance rankings
        - Audience growth indicators
        - Conversion and reach metrics

        ## Strategic Recommendations
        ### Immediate Actions (Next 30 days)
        1. Content optimization strategies
        2. Platform-specific improvements
        3. Engagement boosting tactics

        ### Strategic Initiatives (Next Quarter)
        1. Content strategy overhaul
        2. Platform expansion opportunities
        3. Influencer collaboration strategies

        ## Audience Insights
        - High-engagement content types
        - Optimal posting schedules
        - Platform-specific preferences
        - Audience behavior patterns

        ## Growth Opportunities
        - Underperforming content types
        - Platform optimization potential
        - Viral content replication strategies

        Focus on actionable insights that can increase engagement, reach, and social media ROI.
        """

    def create_general_analysis_prompt(self, df, analysis_results):
        """Create general prompt for unspecified data types"""
        return f"""
        You are a senior data analyst. Analyze this dataset and provide executive-level insights.

        Dataset Overview:
        - Records: {df.shape[0]:,}
        - Columns: {df.columns.tolist()}
        - Analysis Results: {analysis_results}

        Provide a comprehensive data analysis including:

        ## Executive Summary
        Key findings and overall data insights.

        ## Data Analysis
        - Statistical patterns and trends
        - Key variable relationships
        - Notable correlations and dependencies

        ## Strategic Recommendations
        - Data-driven improvement opportunities
        - Process optimization suggestions
        - Performance enhancement strategies

        Focus on actionable insights derived from the data patterns and relationships.
        """

    def generate_specialized_pdf(self, analysis_results, filename, df_cleaned, data_type):
        """Generate PDF report specialized for the detected data type"""
        try:
            from .utils.report_generators import PDFGenerator
            pdf_generator = PDFGenerator()
            
            # Sanitize data_type for filename
            if isinstance(data_type, (tuple, list)):
                data_type_str = str(data_type)
            else:
                data_type_str = str(data_type)
            
            # Remove any invalid characters for filename
            import re
            data_type_str = re.sub(r'[^a-zA-Z0-9_-]', '_', data_type_str)

            # Pass data type for specialized formatting
            pdf_content = pdf_generator.create_specialized_analysis_report(
                analysis_results, filename, df_cleaned, data_type
            )

            # Upload to Supabase
            supabase_url = os.getenv('SUPABASE_URL')
            supabase_key = os.getenv('SUPABASE_KEY')
            supabase = create_client(supabase_url, supabase_key)

            pdf_filename = f"reports/{uuid.uuid4()}_{data_type_str}_analysis_report.pdf"
            res = supabase.storage.from_("business_files").upload(
                path=pdf_filename,
                file=pdf_content,
                file_options={"content-type": "application/pdf"}
            )

            return supabase.storage.from_("business_files").get_public_url(pdf_filename)

        except Exception as e:
            print(f"PDF Generation Error: {str(e)}")
            raise Exception(f"Failed to generate specialized PDF: {str(e)}")


    def generate_specialized_ppt(self, analysis_results, filename, df_cleaned, data_type):
        """Generate PowerPoint presentation specialized for the detected data type"""
        try:
            from .utils.report_generators import PPTGenerator
            ppt_generator = PPTGenerator()
            
            # Sanitize data_type for filename
            if isinstance(data_type, (tuple, list)):
                data_type_str = str(data_type[0])
            else:
                data_type_str = str(data_type)
            
            # Remove any invalid characters for filename
            import re
            data_type_str = re.sub(r'[^a-zA-Z0-9_-]', '_', data_type_str)

            # Pass data type for specialized formatting
            ppt_content = ppt_generator.create_specialized_analysis_presentation(
                analysis_results, filename, df_cleaned, data_type
            )

            # Upload to Supabase
            supabase_url = os.getenv('SUPABASE_URL')
            supabase_key = os.getenv('SUPABASE_KEY')
            supabase = create_client(supabase_url, supabase_key)

            ppt_filename = f"reports/{uuid.uuid4()}_{data_type_str}_analysis_presentation.pptx"
            res = supabase.storage.from_("business_files").upload(
                path=ppt_filename,
                file=ppt_content,
                file_options={"content-type": "application/vnd.openxmlformats-officedocument.presentationml.presentation"}
            )

            return supabase.storage.from_("business_files").get_public_url(ppt_filename)

        except Exception as e:
            print(f"PPT Generation Error: {str(e)}")
            raise Exception(f"Failed to generate specialized PPT: {str(e)}")




from django.http import JsonResponse

def transcript_view(request):
    return JsonResponse({"message": "Transcript endpoint works!"})

class TaskListCreateView(generics.ListCreateAPIView):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer

class TaskRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer

class BusinessDataListCreateView(generics.ListCreateAPIView):
    queryset = BusinessData.objects.all()
    serializer_class = BusinessDataSerializer
    parser_classes = [MultiPartParser]

    def perform_create(self, serializer):
        # Get the uploaded file
        uploaded_file = self.request.FILES.get('file')
        uploader = self.request.data.get('uploader', 'Anonymous')
        
        if uploaded_file:
            # Upload to Supabase Storage
            supabase_url = os.getenv('SUPABASE_URL')
            supabase_key = os.getenv('SUPABASE_KEY')
            supabase = create_client(supabase_url, supabase_key)
            
            # Generate unique filename
            file_extension = os.path.splitext(uploaded_file.name)[1]
            unique_filename = f"uploads/{uuid.uuid4()}{file_extension}"
            
            # Upload file
            file_content = uploaded_file.read()
            res = supabase.storage.from_("business_files").upload(
                path=unique_filename,
                file=file_content,
                file_options={"content-type": uploaded_file.content_type}
            )
            
            # Get public URL
            file_url = supabase.storage.from_("business_files").get_public_url(unique_filename)
            
            # Save to database
            serializer.save(
                fileName=uploaded_file.name,
                file_url=file_url,
                uploader=uploader
            )
        else:
            serializer.save(uploader=uploader)
            

class BusinessDataRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = BusinessData.objects.all()
    serializer_class = BusinessDataSerializer

class ProcessedReportListView(generics.ListAPIView):
    queryset = ProcessedReport.objects.all()
    serializer_class = ProcessedReportSerializer

class ProcessedReportRetrieveView(generics.RetrieveAPIView):
    queryset = ProcessedReport.objects.all()
    serializer_class = ProcessedReportSerializer

# Meeting List / Create
class MeetingListView(generics.ListCreateAPIView):
    queryset = Meeting.objects.all().order_by('-meeting_date', '-meeting_time')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return MeetingSubmitSerializer
        return MeetingSerializer

class DepartmentsListView(generics.ListAPIView):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

class EmployeeForMeetingView(generics.ListAPIView):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer

class MeetingDetailView(generics.RetrieveAPIView):
    queryset = Meeting.objects.all()
    serializer_class = MeetingSerializer
    lookup_field = 'meeting_id'

# --- Upload Meeting Files ---
@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def upload_meeting_files(request):
    meeting_id = request.data.get("meeting_id")

    # --- Step 1: Check meeting exists ---
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "Meeting not found"}, status=404)

    # --- Step 2: Check if files already submitted ---
    if MeetingFile.objects.filter(meeting=meeting).exists():
        return Response(
            {"error": "This meeting already has uploaded files. Upload is allowed only once."},
            status=400
        )

    # --- Step 3: Validate required main file ---
    main_audio = request.FILES.get("main_audio")
    if not main_audio:
        return Response({"error": "Main audio is required"}, status=400)

    # --- Step 4: Capture current date/time ---
    current_date = date.today()
    current_time = datetime.now().time()

    # --- Step 5: Create meeting file record ---
    meeting_file = MeetingFile.objects.create(
        meeting=meeting,
        meeting_org=main_audio,
        uploaded_date=current_date,
        uploaded_time=current_time
    )

    # --- Step 6: Save optional individual audios ---
    for i in range(1, 4):
        audio = request.FILES.get(f"individual_audio_{i}")
        if audio:
            setattr(meeting_file, f"ind_file{i}", audio)
    meeting_file.save()

    return Response({"status": "Files uploaded successfully"})

class MeetingFileListView(generics.ListAPIView):
    queryset = MeetingFile.objects.all()
    serializer_class = MeetingFileSerializer
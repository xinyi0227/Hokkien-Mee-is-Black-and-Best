from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from .models import Task, BusinessData, ProcessedReport,Meeting, Employee,Department
from .serializers import TaskSerializer, BusinessDataSerializer, ProcessedReportSerializer,MeetingSerializer, EmployeeSerializer,DepartmentSerializer, MeetingSubmitSerializer
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
            
            # Step 3: Generate cleaning report
            cleaning_pdf_url = self.generate_cleaning_report(cleaning_log, business_data.fileName)
            
            # Step 4: Data analysis
            analysis_results = self.analyze_and_visualize_data(cleaned_data, business_data.fileName)
            
            # Step 5: Generate reports WITH CHARTS - FIXED
            pdf_url = self.generate_analysis_pdf(
                analysis_results, business_data.fileName, cleaned_data  # Pass DataFrame!
            )
            ppt_url = self.generate_analysis_ppt(
                analysis_results, business_data.fileName, cleaned_data  # Pass DataFrame!
            )
            
            # Save results
            processed_report = ProcessedReport.objects.create(
                original_file=business_data,
                analysis_type=analysis_type,
                processed_data={
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

        # Update final statistics
        cleaning_log['final_shape'] = df_cleaned.shape
        cleaning_log['columns_processed'] = list(df_cleaned.columns)
        cleaning_log['summary'] = {
            'rows_removed': df.shape[0] - df_cleaned.shape[0],
            'columns_cleaned': len([col for col in df.columns if col in cleaning_log['columns_processed']]),
            'total_issues_found': len(cleaning_log['issues_found']),
            'total_actions_taken': len(cleaning_log['actions_taken'])
        }

        return df_cleaned, cleaning_log

    def get_gemini_cleaning_guidance(self, df):
        """Get AI guidance for data cleaning approach"""
        genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
        model = genai.GenerativeModel('gemini-2.5-flash')

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
            if any(keyword in col_lower for keyword in ['date', 'time', 'day', 'month', 'year']):
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
        """Create line graphs for date vs money analysis"""
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
                    period_label = 'Day'
                
                # Aggregate money by period
                revenue_by_period = df_time.groupby('period')[money_col].sum().reset_index()
                revenue_by_period['period_str'] = revenue_by_period['period'].astype(str)
                
                # Create line graph
                plt.figure(figsize=(14, 8))
                plt.plot(range(len(revenue_by_period)), revenue_by_period[money_col], 
                        marker='o', linewidth=3, markersize=8, color='#2E86AB')
                
                # Add trend line
                z = np.polyfit(range(len(revenue_by_period)), revenue_by_period[money_col], 1)
                p = np.poly1d(z)
                trend_direction = "Growing" if z[0] > 0 else "Declining" if z[0] < 0 else "Stable"
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
        model = genai.GenerativeModel('gemini-2.5-flash')

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
        model = genai.GenerativeModel('gemini-2.5-flash')

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
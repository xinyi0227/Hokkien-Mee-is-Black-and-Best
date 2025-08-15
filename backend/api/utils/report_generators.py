from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from io import BytesIO
import requests
import datetime
from pptx.dml.color import RGBColor
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
from reportlab.platypus import Image as RLImage
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend

class CleaningReportGenerator:
    def create_cleaning_report(self, cleaning_log, filename):
        """Create PDF report documenting the cleaning process"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []

        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            textColor=colors.darkblue
        )

        story.append(Paragraph(f"Data Cleaning Report: {filename}", title_style))
        story.append(Spacer(1, 20))

        # Summary
        story.append(Paragraph("Cleaning Summary", styles['Heading2']))
        summary_data = [
            ["Metric", "Value"],
            ["Original Rows", str(cleaning_log['original_shape'][0])],
            ["Original Columns", str(cleaning_log['original_shape'][1])],
            ["Final Rows", str(cleaning_log['final_shape'][0])],
            ["Final Columns", str(cleaning_log['final_shape'][1])],
            ["Total Issues Found", str(cleaning_log['summary']['total_issues_found'])],
            ["Total Actions Taken", str(cleaning_log['summary']['total_actions_taken'])],
        ]

        summary_table = Table(summary_data)
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))

        story.append(summary_table)
        story.append(Spacer(1, 20))

        # Issues Found
        if cleaning_log['issues_found']:
            story.append(Paragraph("Issues Identified", styles['Heading2']))
            for i, issue in enumerate(cleaning_log['issues_found'], 1):
                story.append(Paragraph(f"{i}. {issue}", styles['Normal']))
            story.append(Spacer(1, 15))

        # Actions Taken
        if cleaning_log['actions_taken']:
            story.append(Paragraph("Corrective Actions Applied", styles['Heading2']))
            for i, action in enumerate(cleaning_log['actions_taken'], 1):
                story.append(Paragraph(f"{i}. {action}", styles['Normal']))
            story.append(Spacer(1, 15))

        # Recommendations
        story.append(Paragraph("Recommendations", styles['Heading2']))
        recommendations = [
            "Implement data validation at the source to prevent similar issues",
            "Regular data quality monitoring should be established",
            "Consider setting up automated cleaning pipelines for future datasets",
            "Document data cleaning procedures for consistency"
        ]

        for rec in recommendations:
            story.append(Paragraph(f"• {rec}", styles['Normal']))

        doc.build(story)
        return buffer.getvalue()

class PDFGenerator:
    def create_analysis_report(self, gemini_output, filename, data_df=None):
        """Create comprehensive business analysis report with optional chart embedding"""
        # If data_df is provided, create enhanced report with charts
        if data_df is not None and not data_df.empty:
            return self.create_analysis_report_with_charts(gemini_output, data_df, filename)
        
        # Otherwise, create text-based report
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        styles = getSampleStyleSheet()
        story = []

        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=20,
            spaceAfter=20,
            textColor=colors.darkblue,
            alignment=1,
            fontName='Helvetica-Bold'
        )

        section_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=14,
            spaceAfter=10,
            spaceBefore=15,
            textColor=colors.darkblue,
            fontName='Helvetica-Bold'
        )

        chart_style = ParagraphStyle(
            'ChartRecommendation',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=5,
            leftIndent=20,
            textColor=colors.darkgreen,
            fontName='Helvetica-Bold'
        )

        # Parse Gemini output
        if isinstance(gemini_output, dict) and 'full_report' in gemini_output:
            report_content = gemini_output['full_report']
            chart_recommendations = gemini_output.get('chart_recommendations', [])
        else:
            report_content = str(gemini_output)
            chart_recommendations = []

        # Process the full report content
        self.process_gemini_report_content(story, report_content, title_style, section_style, chart_style, styles)

        # Add chart recommendations section
        if chart_recommendations:
            story.append(Paragraph("Recommended Visualizations", section_style))
            for chart_rec in chart_recommendations:
                clean_rec = chart_rec.replace('📊', '').replace('📈', '').replace('🎯', '').strip()
                story.append(Paragraph(clean_rec, chart_style))
            story.append(Spacer(1, 15))

        # Footer
        story.append(Spacer(1, 20))
        story.append(Paragraph("*Report generated by AI Business Analytics System*", styles['Normal']))
        story.append(Paragraph(f"*Generated: {datetime.datetime.now().strftime('%B %d, %Y at %I:%M %p')}*", styles['Normal']))

        doc.build(story)
        return buffer.getvalue()

    def create_analysis_report_with_charts(self, gemini_output, data_df, filename):
        """Create comprehensive business analysis report with embedded charts"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        styles = getSampleStyleSheet()
        story = []

        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=20,
            spaceAfter=20,
            textColor=colors.darkblue,
            alignment=1,
            fontName='Helvetica-Bold'
        )

        section_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=14,
            spaceAfter=10,
            spaceBefore=15,
            textColor=colors.darkblue,
            fontName='Helvetica-Bold'
        )

        chart_style = ParagraphStyle(
            'ChartRecommendation',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=5,
            leftIndent=20,
            textColor=colors.darkgreen,
            fontName='Helvetica-Bold'
        )

        # Parse Gemini output
        if isinstance(gemini_output, dict) and 'full_report' in gemini_output:
            report_content = gemini_output['full_report']
            chart_recommendations = gemini_output.get('chart_recommendations', [])
        else:
            report_content = str(gemini_output)
            chart_recommendations = []

        # Process the full report content
        self.process_gemini_report_content(story, report_content, title_style, section_style, chart_style, styles)

        # Generate and embed actual charts
        story.append(Paragraph("📊 Data Visualizations", section_style))
        story.append(Spacer(1, 10))

        # Generate multiple chart types based on your data
        charts = self.generate_business_charts(data_df)

        if charts:
            for chart_name, chart_buffer in charts.items():
                try:
                    story.append(Paragraph(f"{chart_name}", styles['Heading3']))
                    
                    # Convert matplotlib chart to ReportLab Image
                    chart_image = RLImage(chart_buffer, width=6*inch, height=4*inch)
                    story.append(chart_image)
                    story.append(Spacer(1, 15))
                except Exception as e:
                    print(f"Error embedding chart {chart_name}: {e}")
                    story.append(Paragraph(f"Chart '{chart_name}' could not be generated", styles['Normal']))
                    story.append(Spacer(1, 10))
        else:
            story.append(Paragraph("No charts could be generated from the available data.", styles['Normal']))
            story.append(Spacer(1, 15))

        # Footer
        story.append(Spacer(1, 20))
        story.append(Paragraph("*Report generated by AI Business Analytics System*", styles['Normal']))
        story.append(Paragraph(f"*Generated: {datetime.datetime.now().strftime('%B %d, %Y at %I:%M %p')}*", styles['Normal']))

        doc.build(story)
        return buffer.getvalue()

    def generate_business_charts(self, df):
        """Generate multiple chart types for business analysis"""
        charts = {}
        
        try:
            print(f"Starting chart generation with DataFrame shape: {df.shape}")
            print(f"Available columns: {df.columns.tolist()}")
            
            # Set matplotlib style
            try:
                plt.style.use('seaborn-v0_8-whitegrid')
            except:
                plt.style.use('default')
            
            # Chart 1: Any Numeric Column Trend
            numeric_columns = df.select_dtypes(include=['float64', 'int64']).columns.tolist()
            date_columns = [col for col in df.columns if 'date' in col.lower() or 'time' in col.lower()]
            
            if len(numeric_columns) > 0 and len(date_columns) > 0:
                try:
                    print(f"Creating trend chart with {numeric_columns[0]} and {date_columns[0]}")
                    fig, ax = plt.subplots(figsize=(10, 6))
                    
                    df_temp = df.copy()
                    df_temp[date_columns[0]] = pd.to_datetime(df_temp[date_columns[0]], errors='coerce')
                    df_temp = df_temp.dropna(subset=[date_columns[0]])
                    
                    if len(df_temp) > 0:
                        daily_data = df_temp.groupby(df_temp[date_columns[0]].dt.date)[numeric_columns[0]].sum()
                        
                        ax.plot(daily_data.index, daily_data.values, marker='o', linewidth=2, markersize=4, color='#2E86AB')
                        ax.set_title(f'📈 {numeric_columns[0].title()} Trend Over Time', fontsize=16, fontweight='bold')
                        ax.set_xlabel('Date', fontsize=12)
                        ax.set_ylabel(f'{numeric_columns[0].title()}', fontsize=12)
                        ax.grid(True, alpha=0.3)
                        plt.xticks(rotation=45)
                        plt.tight_layout()
                        
                        trend_buffer = BytesIO()
                        plt.savefig(trend_buffer, format='png', dpi=300, bbox_inches='tight', facecolor='white')
                        trend_buffer.seek(0)
                        charts[f'{numeric_columns[0].title()} Trend'] = trend_buffer
                        print("Trend chart created successfully")
                    
                    plt.close(fig)
                except Exception as e:
                    print(f"Error creating trend chart: {e}")
                    plt.close('all')
            
            # Chart 2: Category Distribution (any text column)
            text_columns = df.select_dtypes(include=['object']).columns.tolist()
            
            if len(text_columns) > 0 and len(numeric_columns) > 0:
                try:
                    print(f"Creating category chart with {text_columns[0]} and {numeric_columns[0]}")
                    fig, ax = plt.subplots(figsize=(10, 6))
                    
                    # Get top categories
                    if text_columns[0] in df.columns and numeric_columns[0] in df.columns:
                        top_categories = df.groupby(text_columns[0])[numeric_columns[0]].sum().nlargest(10)
                        
                        if len(top_categories) > 0:
                            colors_bar = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', 
                                        '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43']
                            
                            bars = ax.bar(range(len(top_categories)), top_categories.values, 
                                        color=colors_bar[:len(top_categories)])
                            
                            ax.set_title(f'📊 Top {text_columns[0].title()} by {numeric_columns[0].title()}', fontsize=16, fontweight='bold')
                            ax.set_xlabel(text_columns[0].title(), fontsize=12)
                            ax.set_ylabel(numeric_columns[0].title(), fontsize=12)
                            ax.set_xticks(range(len(top_categories)))
                            ax.set_xticklabels(top_categories.index, rotation=45, ha='right')
                            
                            # Add value labels
                            for bar in bars:
                                height = bar.get_height()
                                ax.text(bar.get_x() + bar.get_width()/2., height,
                                    f'{height:,.0f}', ha='center', va='bottom', fontsize=9)
                            
                            plt.tight_layout()
                            
                            category_buffer = BytesIO()
                            plt.savefig(category_buffer, format='png', dpi=300, bbox_inches='tight', facecolor='white')
                            category_buffer.seek(0)
                            charts[f'Top {text_columns[0].title()} Performance'] = category_buffer
                            print("Category chart created successfully")
                    
                    plt.close(fig)
                except Exception as e:
                    print(f"Error creating category chart: {e}")
                    plt.close('all')
            
            # Chart 3: Data Distribution Pie Chart
            if len(text_columns) > 0:
                try:
                    print(f"Creating pie chart for {text_columns[0]}")
                    fig, ax = plt.subplots(figsize=(8, 8))
                    
                    distribution = df[text_columns[0]].value_counts().head(8)  # Top 8 categories
                    
                    if len(distribution) > 0:
                        colors_pie = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD']
                        
                        wedges, texts, autotexts = ax.pie(distribution.values, labels=distribution.index, 
                                                        autopct='%1.1f%%', startangle=90, 
                                                        colors=colors_pie[:len(distribution)])
                        
                        ax.set_title(f'📊 {text_columns[0].title()} Distribution', fontsize=16, fontweight='bold')
                        
                        # Enhance text
                        for autotext in autotexts:
                            autotext.set_color('white')
                            autotext.set_fontweight('bold')
                        
                        plt.tight_layout()
                        
                        pie_buffer = BytesIO()
                        plt.savefig(pie_buffer, format='png', dpi=300, bbox_inches='tight', facecolor='white')
                        pie_buffer.seek(0)
                        charts[f'{text_columns[0].title()} Distribution'] = pie_buffer
                        print("Pie chart created successfully")
                    
                    plt.close(fig)
                except Exception as e:
                    print(f"Error creating pie chart: {e}")
                    plt.close('all')
            
            print(f"Successfully generated {len(charts)} charts")
            return charts
            
        except Exception as e:
            print(f"Error in generate_business_charts: {e}")
            plt.close('all')
            return {}

    def process_gemini_report_content(self, story, report_content, title_style, section_style, chart_style, styles):
        """Process the Gemini report content and convert to PDF format"""
        lines = report_content.split('\n')
        current_section = ""
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Handle headers
            if line.startswith('# '):
                # Main title
                title_text = line[2:].strip()
                story.append(Paragraph(title_text, title_style))
                story.append(Spacer(1, 20))
            elif line.startswith('## '):
                # Section headers
                section_text = line[3:].strip()
                story.append(Paragraph(section_text, section_style))
                current_section = section_text.lower()
            elif line.startswith('### '):
                # Subsection headers
                subsection_text = line[4:].strip()
                subsection_style = ParagraphStyle(
                    'SubsectionHeader',
                    parent=styles['Heading3'],
                    fontSize=12,
                    spaceAfter=8,
                    spaceBefore=10,
                    textColor=colors.darkred,
                    fontName='Helvetica-Bold'
                )
                story.append(Paragraph(subsection_text, subsection_style))
            elif line.startswith('####'):
                # Sub-subsection headers
                subsubsection_text = line[5:].strip()
                subsubsection_style = ParagraphStyle(
                    'SubSubsectionHeader',
                    parent=styles['Heading4'],
                    fontSize=11,
                    spaceAfter=5,
                    spaceBefore=8,
                    textColor=colors.purple,
                    fontName='Helvetica-Bold'
                )
                story.append(Paragraph(subsubsection_text, subsubsection_style))
            elif '📊' in line or '📈' in line or '🎯' in line:
                # Chart recommendations
                clean_line = line.replace('📊', '').replace('📈', '').replace('🎯', '').strip()
                story.append(Paragraph(clean_line, chart_style))
            elif line.startswith('- ') or line.startswith('* '):
                # Bullet points
                bullet_text = line[2:].strip()
                bullet_style = ParagraphStyle(
                    'BulletPoint',
                    parent=styles['Normal'],
                    fontSize=10,
                    spaceAfter=5,
                    leftIndent=20,
                    bulletIndent=10
                )
                story.append(Paragraph(f"• {bullet_text}", bullet_style))
            elif line.startswith(('1. ', '2. ', '3. ', '4. ', '5. ')):
                # Numbered lists
                numbered_style = ParagraphStyle(
                    'NumberedList',
                    parent=styles['Normal'],
                    fontSize=10,
                    spaceAfter=5,
                    leftIndent=20
                )
                story.append(Paragraph(line, numbered_style))
            elif line.startswith('**') and line.endswith('**'):
                # Bold text
                bold_text = line[2:-2]
                bold_style = ParagraphStyle(
                    'BoldText',
                    parent=styles['Normal'],
                    fontSize=10,
                    spaceAfter=5,
                    fontName='Helvetica-Bold'
                )
                story.append(Paragraph(bold_text, bold_style))
            else:
                # Regular paragraphs
                if line:
                    story.append(Paragraph(line, styles['Normal']))
                    story.append(Spacer(1, 5))

class PPTGenerator:
    def create_analysis_presentation(self, gemini_output, filename, data_df=None):
        """Create executive PowerPoint presentation with optional chart embedding"""
        # If data_df is provided, create enhanced presentation with charts
        if data_df is not None and not data_df.empty:
            return self.create_analysis_presentation_with_charts(gemini_output, data_df, filename)
        
        # Otherwise, create text-based presentation
        prs = Presentation()

        # Parse Gemini output
        if isinstance(gemini_output, dict) and 'full_report' in gemini_output:
            report_content = gemini_output['full_report']
            chart_recommendations = gemini_output.get('chart_recommendations', [])
        else:
            report_content = str(gemini_output)
            chart_recommendations = []

        # Extract sections from report content
        sections = self.parse_report_sections(report_content)

        # Create slides
        self.create_title_slide(prs, sections.get('title', 'Business Analysis Report'))
        
        if 'executive_summary' in sections:
            self.create_content_slide(prs, "Executive Summary", sections['executive_summary'])
        
        if 'key_performance_indicators' in sections:
            self.create_content_slide(prs, "Key Performance Indicators", sections['key_performance_indicators'])
        
        if 'trend_analysis' in sections:
            self.create_content_slide(prs, "Trend Analysis", sections['trend_analysis'])
        
        if 'product_analysis' in sections:
            self.create_content_slide(prs, "Product Mix Analysis", sections['product_analysis'])
        
        if 'customer_insights' in sections:
            self.create_content_slide(prs, "Customer Behavior Insights", sections['customer_insights'])
        
        if 'recommendations' in sections:
            self.create_recommendations_slide(prs, sections['recommendations'])
        
        if chart_recommendations:
            self.create_visualization_recommendations_slide(prs, chart_recommendations)
        
        if 'conclusion' in sections:
            self.create_content_slide(prs, "Conclusion & Strategic Outlook", sections['conclusion'])

        # Save to BytesIO
        buffer = BytesIO()
        prs.save(buffer)
        return buffer.getvalue()

    def create_analysis_presentation_with_charts(self, gemini_output, data_df, filename):
        """Create executive PowerPoint presentation with embedded charts"""
        prs = Presentation()
        
        # Parse Gemini output
        if isinstance(gemini_output, dict) and 'full_report' in gemini_output:
            report_content = gemini_output['full_report']
            chart_recommendations = gemini_output.get('chart_recommendations', [])
        else:
            report_content = str(gemini_output)
            chart_recommendations = []

        # Extract sections from report content
        sections = self.parse_report_sections(report_content)
        
        # Create slides
        self.create_title_slide(prs, sections.get('title', 'Business Analysis Report'))
        
        if 'executive_summary' in sections:
            self.create_content_slide(prs, "Executive Summary", sections['executive_summary'])
        
        # Create chart slides with actual visualizations
        self.create_chart_slides(prs, data_df)
        
        # Continue with other content slides
        if 'recommendations' in sections:
            self.create_recommendations_slide(prs, sections['recommendations'])
        
        if 'conclusion' in sections:
            self.create_content_slide(prs, "Conclusion & Strategic Outlook", sections['conclusion'])

        # Save to BytesIO
        buffer = BytesIO()
        prs.save(buffer)
        return buffer.getvalue()

    def create_chart_slides(self, prs, df):
        """Create slides with embedded charts using python-pptx native charts"""
        
        # Import required modules inside the method to avoid errors
        from pptx.chart.data import CategoryChartData
        from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
        
        # Chart Slide 1: Revenue Trend
        if 'date' in df.columns and any(col in df.columns for col in ['revenue', 'total', 'amount', 'price']):
            slide = prs.slides.add_slide(prs.slide_layouts[5])  # Blank slide
            slide.shapes.title.text = "📈 Revenue Performance Trends"
            
            # Prepare data for chart
            revenue_col = next((col for col in ['revenue', 'total', 'amount', 'price'] if col in df.columns), None)
            df_temp = df.copy()
            df_temp['date'] = pd.to_datetime(df_temp['date'])
            monthly_data = df_temp.groupby(df_temp['date'].dt.to_period('M'))[revenue_col].sum()
            
            # Create chart data
            chart_data = CategoryChartData()
            chart_data.categories = [str(period) for period in monthly_data.index]
            chart_data.add_series('Revenue', monthly_data.values)
            
            # Add chart to slide
            x, y, cx, cy = Inches(1), Inches(2), Inches(8), Inches(5)
            chart = slide.shapes.add_chart(
                XL_CHART_TYPE.LINE_MARKERS, x, y, cx, cy, chart_data
            ).chart
            
            chart.has_legend = True
            chart.legend.position = XL_LEGEND_POSITION.BOTTOM

        # Chart Slide 2: Top Products Bar Chart
        if any(col in df.columns for col in ['product', 'category', 'item']):
            slide = prs.slides.add_slide(prs.slide_layouts[5])
            slide.shapes.title.text = "📊 Top Performing Products"
            
            product_col = next((col for col in ['product', 'category', 'item'] if col in df.columns), None)
            revenue_col = next((col for col in ['revenue', 'total', 'amount', 'price'] if col in df.columns), None)
            
            if product_col and revenue_col:
                top_products = df.groupby(product_col)[revenue_col].sum().nlargest(5)
                
                chart_data = CategoryChartData()
                chart_data.categories = list(top_products.index)
                chart_data.add_series('Revenue', top_products.values)
                
                x, y, cx, cy = Inches(1), Inches(2), Inches(8), Inches(5)
                chart = slide.shapes.add_chart(
                    XL_CHART_TYPE.COLUMN_CLUSTERED, x, y, cx, cy, chart_data
                ).chart
                
                chart.has_legend = False

        # Chart Slide 3: Distribution Pie Chart
        if any(col in df.columns for col in ['payment_method', 'payment_type', 'method']):
            slide = prs.slides.add_slide(prs.slide_layouts[5])
            slide.shapes.title.text = "💳 Payment Method Distribution"
            
            payment_col = next((col for col in ['payment_method', 'payment_type', 'method'] if col in df.columns), None)
            
            if payment_col:
                payment_dist = df[payment_col].value_counts()
                
                chart_data = CategoryChartData()
                chart_data.categories = list(payment_dist.index)
                chart_data.add_series('Count', payment_dist.values)
                
                x, y, cx, cy = Inches(2), Inches(2), Inches(6), Inches(5)
                chart = slide.shapes.add_chart(
                    XL_CHART_TYPE.PIE, x, y, cx, cy, chart_data
                ).chart
                
                chart.has_legend = True
                chart.legend.position = XL_LEGEND_POSITION.RIGHT

    def parse_report_sections(self, report_content):
        """Parse the Gemini report content into sections"""
        sections = {}
        lines = report_content.split('\n')
        current_section = ""
        current_content = []
        
        for line in lines:
            line = line.strip()
            
            if line.startswith('# '):
                sections['title'] = line[2:].strip()
            elif line.startswith('## '):
                # Save previous section
                if current_section and current_content:
                    sections[current_section] = '\n'.join(current_content)
                
                # Start new section
                section_name = line[3:].strip().lower().replace(' ', '_').replace('&', 'and')
                current_section = section_name
                current_content = []
            elif line and current_section:
                current_content.append(line)
        
        # Save last section
        if current_section and current_content:
            sections[current_section] = '\n'.join(current_content)
            
        return sections

    def create_title_slide(self, prs, title):
        """Create title slide"""
        title_slide_layout = prs.slide_layouts[0]
        slide = prs.slides.add_slide(title_slide_layout)
        
        slide.shapes.title.text = title
        slide.shapes.placeholders[1].text = f"Executive Business Intelligence Report\n{datetime.datetime.now().strftime('%B %Y')}\nGenerated by AI Analytics"

    def create_content_slide(self, prs, title, content):
        """Create content slide with bullet points"""
        bullet_slide_layout = prs.slide_layouts[1]
        slide = prs.slides.add_slide(bullet_slide_layout)
        
        slide.shapes.title.text = title
        
        tf = slide.shapes.placeholders[1].text_frame
        tf.clear()
        
        # Process content into bullet points
        lines = content.split('\n')
        first_paragraph = True
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            if line.startswith('###'):
                # Subsection header
                p = tf.add_paragraph() if not first_paragraph else tf.paragraphs[0]
                p.text = line[3:].strip()
                p.level = 0
                p.font.size = Pt(16)
                p.font.bold = True
                p.font.color.rgb = RGBColor(0, 0, 139)
                first_paragraph = False
            elif line.startswith('- ') or line.startswith('* '):
                # Bullet point
                p = tf.add_paragraph() if not first_paragraph else tf.paragraphs[0]
                p.text = line[2:].strip()
                p.level = 1
                p.font.size = Pt(14)
                first_paragraph = False
            elif line.startswith(('1. ', '2. ', '3. ', '4. ', '5. ')):
                # Numbered list
                p = tf.add_paragraph() if not first_paragraph else tf.paragraphs[0]
                p.text = line
                p.level = 1
                p.font.size = Pt(14)
                first_paragraph = False
            elif '📊' in line or '📈' in line or '🎯' in line:
                # Chart recommendation
                clean_line = line.replace('📊', '').replace('📈', '').replace('🎯', '').strip()
                p = tf.add_paragraph() if not first_paragraph else tf.paragraphs[0]
                p.text = f"💡 {clean_line}"
                p.level = 1
                p.font.size = Pt(12)
                p.font.color.rgb = RGBColor(0, 128, 0)
                first_paragraph = False
            elif line and not line.startswith('#'):
                # Regular content
                p = tf.add_paragraph() if not first_paragraph else tf.paragraphs[0]
                p.text = line
                p.level = 1
                p.font.size = Pt(13)
                first_paragraph = False

    def create_recommendations_slide(self, prs, recommendations_content):
        """Create recommendations slide with priority levels"""
        bullet_slide_layout = prs.slide_layouts[1]
        slide = prs.slides.add_slide(bullet_slide_layout)
        
        slide.shapes.title.text = "Strategic Recommendations & Action Plan"
        
        tf = slide.shapes.placeholders[1].text_frame
        tf.clear()
        
        lines = recommendations_content.split('\n')
        priority_colors = {
            'immediate': RGBColor(204, 0, 0),      # Red
            'strategic': RGBColor(255, 165, 0),    # Orange  
            'long': RGBColor(0, 100, 0)            # Green
        }
        
        current_priority = None
        first_paragraph = True
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            if 'immediate' in line.lower() or 'next 30' in line.lower():
                current_priority = 'immediate'
                p = tf.add_paragraph() if not first_paragraph else tf.paragraphs[0]
                p.text = "🔴 IMMEDIATE ACTIONS (Next 30 Days)"
                p.level = 0
                p.font.size = Pt(16)
                p.font.bold = True
                p.font.color.rgb = priority_colors['immediate']
                first_paragraph = False
            elif 'strategic' in line.lower() or 'quarter' in line.lower():
                current_priority = 'strategic'
                p = tf.add_paragraph()
                p.text = "🟠 STRATEGIC INITIATIVES (Next Quarter)"
                p.level = 0
                p.font.size = Pt(16)
                p.font.bold = True
                p.font.color.rgb = priority_colors['strategic']
            elif 'long' in line.lower() or 'year' in line.lower():
                current_priority = 'long'
                p = tf.add_paragraph()
                p.text = "🟢 LONG-TERM GROWTH (Next Year)"
                p.level = 0
                p.font.size = Pt(16)
                p.font.bold = True
                p.font.color.rgb = priority_colors['long']
            elif line.startswith(('1. ', '2. ', '3. ', '4. ', '5. ', '- ', '* ')):
                p = tf.add_paragraph() if not first_paragraph else tf.paragraphs[0]
                clean_text = line[2:] if line.startswith(('- ', '* ')) else line
                p.text = clean_text
                p.level = 1
                p.font.size = Pt(13)
                if current_priority and current_priority in priority_colors:
                    p.font.color.rgb = priority_colors[current_priority]
                first_paragraph = False

    def create_visualization_recommendations_slide(self, prs, chart_recommendations):
        """Create slide for visualization recommendations"""
        bullet_slide_layout = prs.slide_layouts[1]
        slide = prs.slides.add_slide(bullet_slide_layout)
        
        slide.shapes.title.text = "Recommended Data Visualizations"
        
        tf = slide.shapes.placeholders[1].text_frame
        tf.text = "Key Charts & Graphs for Business Intelligence"
        
        for chart_rec in chart_recommendations:
            clean_rec = chart_rec.replace('📊', '').replace('📈', '').replace('🎯', '').strip()
            p = tf.add_paragraph()
            p.text = f"📊 {clean_rec}"
            p.level = 1
            p.font.size = Pt(12)
            p.font.color.rgb = RGBColor(0, 128, 0)

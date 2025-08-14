from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
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
    def create_analysis_report(self, analysis_results, filename):
        """Create comprehensive PDF analysis report with graphs"""
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch)
        styles = getSampleStyleSheet()
        story = []

        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=22,
            spaceAfter=30,
            textColor=colors.darkblue,
            alignment=1,
            fontName='Helvetica-Bold'
        )
        
        executive_style = ParagraphStyle(
            'ExecutiveStyle',
            parent=styles['Normal'],
            fontSize=12,
            spaceAfter=15,
            textColor=colors.black,
            backColor=colors.lightgrey,
            borderColor=colors.darkblue,
            borderWidth=1,
            leftIndent=10,
            rightIndent=10,
            topPadding=10,
            bottomPadding=10
        )

        # Title and Executive Summary
        story.append(Paragraph(f"Business Intelligence Report: {filename}", title_style))
        story.append(Spacer(1, 20))
        
        # Executive Summary Box
        story.append(Paragraph("Executive Summary", styles['Heading2']))
        if 'executive_summary' in analysis_results:
            story.append(Paragraph(analysis_results['executive_summary'], executive_style))
        story.append(Spacer(1, 20))

        # Data Overview with enhanced formatting
        story.append(Paragraph("Data Overview", styles['Heading2']))
        overview = analysis_results['data_overview']
        overview_data = [
            ["Metric", "Value", "Business Impact"],
            ["Total Records", f"{overview['total_rows']:,}", "Large dataset enables robust analysis" if overview['total_rows'] > 1000 else "Moderate dataset size"],
            ["Data Completeness", f"{overview['data_completeness']:.1f}%", "Excellent quality" if overview['data_completeness'] > 95 else "Good quality"],
            ["Analysis Period", overview.get('time_period', {}).get('duration_days', 'N/A'), "Sufficient historical data" if isinstance(overview.get('time_period'), dict) else "Point-in-time analysis"],
            ["Business Context", analysis_results.get('business_context', 'General').title(), "Industry-specific insights available"]
        ]
        
        overview_table = Table(overview_data, colWidths=[2*inch, 1.5*inch, 2.5*inch])
        overview_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.navy),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.lightblue),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP')
        ]))
        story.append(overview_table)
        story.append(Spacer(1, 25))

        # Key Insights with visual emphasis
        story.append(Paragraph("Key Business Insights", styles['Heading2']))
        if analysis_results.get('key_insights'):
            for i, insight in enumerate(analysis_results['key_insights'], 1):
                insight_style = ParagraphStyle(
                    f'Insight{i}',
                    parent=styles['Normal'],
                    fontSize=11,
                    spaceAfter=10,
                    leftIndent=20,
                    bulletIndent=10,
                    bulletFontName='Symbol'
                )
                story.append(Paragraph(f"<b>{i}.</b> {insight}", insight_style))
        story.append(Spacer(1, 20))

        # Statistical Summary with business interpretation
        if analysis_results.get('statistical_summary'):
            story.append(Paragraph("Statistical Analysis", styles['Heading2']))
            for col_name, stats in analysis_results['statistical_summary'].items():
                story.append(Paragraph(f"<b>{col_name} Analysis:</b>", styles['Heading3']))
                
                # Interpret the statistics
                cv = stats.get('cv', 0)
                variability = "High variability" if cv > 30 else "Moderate variability" if cv > 15 else "Low variability"
                trend = stats.get('trend', 'stable')
                trend_desc = {"increasing": "📈 Upward trend", "decreasing": "📉 Downward trend", "stable": "➡️ Stable pattern"}.get(trend, "")
                
                stats_data = [
                    ["Statistic", "Value", "Business Interpretation"],
                    ["Average", f"{stats['mean']:,.2f}", f"Typical performance level"],
                    ["Range", f"{stats['min']:,.2f} - {stats['max']:,.2f}", f"Performance varies by {((stats['max']-stats['min'])/stats['mean']*100):.1f}%"],
                    ["Consistency", f"{variability} (CV: {cv:.1f}%)", "Higher consistency indicates predictable performance"],
                    ["Trend", trend_desc, f"Data shows {trend} pattern over time"]
                ]
                
                stats_table = Table(stats_data, colWidths=[1.5*inch, 1.5*inch, 3*inch])
                stats_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.green),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.lightgreen)
                ]))
                story.append(stats_table)
                story.append(Spacer(1, 15))

        # Visualizations with descriptions
        if analysis_results.get('visualizations'):
            story.append(Paragraph("Data Visualizations", styles['Heading2']))
            for viz in analysis_results['visualizations']:
                # Add chart image if possible
                try:
                    response = requests.get(viz['url'], timeout=10)
                    if response.status_code == 200:
                        img_stream = BytesIO(response.content)
                        img = Image(img_stream, width=6*inch, height=4*inch)
                        story.append(img)
                        story.append(Spacer(1, 10))
                except:
                    pass
                
                # Chart description
                story.append(Paragraph(f"<b>{viz['title']}</b>", styles['Heading3']))
                story.append(Paragraph(viz['description'], styles['Normal']))
                story.append(Spacer(1, 15))

        # Business Recommendations with priority levels
        story.append(Paragraph("Strategic Recommendations", styles['Heading2']))
        if analysis_results.get('business_recommendations'):
            priorities = ["🔴 High Priority", "🟡 Medium Priority", "🟢 Low Priority", "📋 Monitor"]
            for i, rec in enumerate(analysis_results['business_recommendations'], 1):
                priority = priorities[(i-1) % len(priorities)]
                rec_style = ParagraphStyle(
                    f'Rec{i}',
                    parent=styles['Normal'],
                    fontSize=11,
                    spaceAfter=12,
                    leftIndent=15,
                    bulletIndent=10
                )
                story.append(Paragraph(f"<b>{priority}</b> - {rec}", rec_style))

        # Critical Metrics to Monitor
        if analysis_results.get('critical_metrics'):
            story.append(Spacer(1, 20))
            story.append(Paragraph("Critical Metrics to Monitor", styles['Heading2']))
            for i, metric in enumerate(analysis_results['critical_metrics'], 1):
                story.append(Paragraph(f"• {metric}", styles['Normal']))

        doc.build(story)
        return buffer.getvalue()

class PPTGenerator:
    def create_analysis_presentation(self, analysis_results, filename):
        """Create executive PowerPoint presentation"""
        
        prs = Presentation()
        
        # Slide 1: Title Slide
        title_slide_layout = prs.slide_layouts[0]
        slide = prs.slides.add_slide(title_slide_layout)
        title = slide.shapes.title
        subtitle = slide.shapes.placeholders[1]
        
        title.text = "Executive Business Intelligence Report"
        subtitle.text = f"Data Analysis: {filename}\nAI-Powered Business Insights\n{datetime.datetime.now().strftime('%B %Y')}"

        # Slide 2: Executive Summary
        bullet_slide_layout = prs.slide_layouts[1]
        slide = prs.slides.add_slide(bullet_slide_layout)
        shapes = slide.shapes
        title_shape = shapes.title
        body_shape = shapes.placeholders[1]
        
        title_shape.text = "Executive Summary"
        tf = body_shape.text_frame
        tf.text = "Key Findings:"
        
        if analysis_results.get('executive_summary'):
            p = tf.add_paragraph()
            p.text = analysis_results['executive_summary']
            p.level = 1
            p.font.size = Pt(16)

        # Add data overview highlights
        overview = analysis_results['data_overview']
        p = tf.add_paragraph()
        p.text = f"Analyzed {overview['total_rows']:,} records with {overview['data_completeness']:.1f}% completeness"
        p.level = 1
        p.font.size = Pt(14)

        # Slide 3: Key Insights (Executive Focus)
        slide = prs.slides.add_slide(bullet_slide_layout)
        shapes = slide.shapes
        title_shape = shapes.title
        body_shape = shapes.placeholders[1]
        
        title_shape.text = "Strategic Insights"
        tf = body_shape.text_frame
        tf.text = "Critical Business Findings:"
        
        if analysis_results.get('key_insights'):
            for insight in analysis_results['key_insights'][:4]:  # Limit to 4 for readability
                p = tf.add_paragraph()
                p.text = insight
                p.level = 1
                p.font.size = Pt(14)

        # Slide 4: Business Impact & Recommendations
        slide = prs.slides.add_slide(bullet_slide_layout)
        shapes = slide.shapes
        title_shape = shapes.title
        body_shape = shapes.placeholders[1]
        
        title_shape.text = "Recommended Actions"
        tf = body_shape.text_frame
        tf.text = "Priority Initiatives:"
        
        if analysis_results.get('business_recommendations'):
            priorities = ["HIGH PRIORITY", "MEDIUM PRIORITY", "ONGOING MONITORING"]
            for i, rec in enumerate(analysis_results['business_recommendations'][:3]):
                p = tf.add_paragraph()
                priority = priorities[min(i, len(priorities)-1)]
                p.text = f"{priority}: {rec}"
                p.level = 1
                p.font.size = Pt(13)
                if i == 0:  # High priority in red
                    p.font.color.rgb = RGBColor(204, 0, 0)

        # Add visualization slides
        if analysis_results.get('visualizations'):
            for viz in analysis_results['visualizations'][:3]:  # Limit to 3 charts for executive presentation
                blank_slide_layout = prs.slide_layouts[6]
                slide = prs.slides.add_slide(blank_slide_layout)
                
                # Add title
                left = Inches(0.5)
                top = Inches(0.3)
                width = Inches(9)
                height = Inches(0.8)
                title_box = slide.shapes.add_textbox(left, top, width, height)
                title_frame = title_box.text_frame
                title_frame.text = viz['title']
                title_frame.paragraphs[0].font.size = Pt(24)
                title_frame.paragraphs[0].font.bold = True

                # Add chart image
                try:
                    response = requests.get(viz['url'])
                    if response.status_code == 200:
                        img_stream = BytesIO(response.content)
                        left = Inches(1)
                        top = Inches(1.2)
                        width = Inches(8)
                        height = Inches(5.5)
                        slide.shapes.add_picture(img_stream, left, top, width, height)
                        
                        # Add insight callout
                        left = Inches(1)
                        top = Inches(6.8)
                        width = Inches(8)
                        height = Inches(0.8)
                        insight_box = slide.shapes.add_textbox(left, top, width, height)
                        insight_frame = insight_box.text_frame
                        insight_frame.text = f"📊 {viz['description']}"
                        insight_frame.paragraphs[0].font.size = Pt(12)
                        insight_frame.paragraphs[0].font.italic = True
                except:
                    # Add description as text if image fails
                    left = Inches(1)
                    top = Inches(2)
                    width = Inches(8)
                    height = Inches(4)
                    desc_box = slide.shapes.add_textbox(left, top, width, height)
                    desc_frame = desc_box.text_frame
                    desc_frame.text = f"Chart: {viz['description']}"
                    desc_frame.paragraphs[0].font.size = Pt(16)

        # Final slide: Next Steps
        slide = prs.slides.add_slide(bullet_slide_layout)
        shapes = slide.shapes
        title_shape = shapes.title
        body_shape = shapes.placeholders[1]
        
        title_shape.text = "Next Steps & Monitoring"
        tf = body_shape.text_frame
        tf.text = "Critical Metrics to Track:"
        
        if analysis_results.get('critical_metrics'):
            for metric in analysis_results['critical_metrics']:
                p = tf.add_paragraph()
                p.text = metric
                p.level = 1
                p.font.size = Pt(14)

        # Save to BytesIO
        buffer = BytesIO()
        prs.save(buffer)
        return buffer.getvalue()

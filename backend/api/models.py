import uuid
from django.db import models

class Task(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-created_at']

class BusinessData(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    fileName = models.CharField(max_length=255)
    uploader = models.CharField(max_length=255)
    file_url = models.CharField(max_length=512, null=True, blank=True)
    
    class Meta:
        db_table = 'business_data'

class ProcessedReport(models.Model):
    id = models.AutoField(primary_key=True)
    original_file = models.ForeignKey('BusinessData', on_delete=models.CASCADE)
    analysis_type = models.CharField(max_length=100, default='basic_analysis')
    processed_data = models.JSONField()
    pdf_url = models.URLField(null=True, blank=True)
    ppt_url = models.URLField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'processed_reports'

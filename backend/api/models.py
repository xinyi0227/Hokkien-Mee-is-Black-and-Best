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
    uploader = models.ForeignKey(
        "Employee",
        on_delete=models.CASCADE,
        db_column="uploader",        # keep existing column name if you already have data
    )
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

class Meeting(models.Model):
    meeting_id = models.AutoField(primary_key=True)  # Supabase uses integer ID
    meeting_title = models.CharField(max_length=255)
    meeting_date = models.DateField(null=True, blank=True)  # can be null
    meeting_time = models.TimeField()
    meeting_location = models.CharField(max_length=255)
    meeting_mic1 = models.CharField(max_length=255, null=True, blank=True)
    meeting_mic2 = models.CharField(max_length=255, null=True, blank=True)
    meeting_mic3 = models.CharField(max_length=255, null=True, blank=True)
    meeting_department = models.CharField(max_length=255, blank=True, null=True)
    meeting_participant = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'meeting'

    def str(self):
        return self.meeting_title
    
class Department(models.Model):
    department_id = models.AutoField(primary_key=True)
    department_name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'department'

    def str(self):
        return self.department_name
    
class Employee(models.Model):
    employee_id = models.IntegerField(primary_key=True)  # Supabase uses integer ID
    employee_name = models.CharField(max_length=255)
    department_id = models.CharField(max_length=100)

    def str(self):
        return self.employee_name

    class Meta:
        db_table = 'employee'

class MeetingFile(models.Model):
    meeting_file_id = models.BigAutoField(primary_key=True)
    meeting_summary = models.CharField(max_length=255)
    meeting_org = models.FileField(upload_to='')   # empty string = upload directly to MEDIA_ROOT
    ind_file1 = models.FileField(upload_to='', null=True, blank=True)
    ind_file2 = models.FileField(upload_to='', null=True, blank=True)
    ind_file3 = models.FileField(upload_to='', null=True, blank=True)
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, null=True, blank=True, related_name="files")
    uploaded_date = models.DateField(null=True, blank=True)
    uploaded_time = models.TimeField(null=True, blank=True)
    # meeting_org = models.CharField(max_length=255, null=True, blank=True)
    updated_date = models.DateField(null=True, blank=True)
    updated_time = models.TimeField(null=True, blank=True)

    def __str__(self):
        return f"MeetingFile {self.meeting_file_id} for {self.meeting}"
    
    class Meta:
        db_table = 'meeting_files'
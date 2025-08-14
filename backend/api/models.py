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
    id = models.AutoField(primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True)
    fileName = models.CharField(max_length=255)
    uploader = models.CharField(max_length=255)
    file_data = models.BinaryField(null=True, blank=True)
    file_url = models.CharField(max_length=512, null=True, blank=True)
    
    class Meta:
        db_table = 'business_data'

from rest_framework import serializers
from .models import Task, BusinessData, ProcessedReport

class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'completed', 'created_at', 'updated_at']

class BusinessDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessData
        fields = '__all__'

class ProcessedReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessedReport
        fields = '__all__'

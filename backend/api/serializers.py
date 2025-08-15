from rest_framework import serializers
from .models import Task, BusinessData, ProcessedReport, Meeting, Employee,Department,MeetingFile
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

class MeetingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meeting
        fields = '__all__'

class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee 
        fields = '__all__'

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

class MeetingFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = MeetingFile
        fields = '__all__'


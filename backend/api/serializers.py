from rest_framework import serializers
from django.utils import timezone
from .models import Task, BusinessData, ProcessedReport, Meeting, Employee,Department, MeetingFile, CommentReport
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

class CommentReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommentReport
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
        
class MeetingSubmitSerializer(serializers.ModelSerializer):
    created_at_local = serializers.SerializerMethodField()
    updated_at_local = serializers.SerializerMethodField()

    class Meta:
        model = Meeting
        fields = '__all__'
        read_only_fields = ['meeting_id', 'created_at', 'updated_at']  # prevent POST from overwriting timestamps

    def get_created_at_local(self, obj):
        if obj.created_at:
            # Convert UTC to local timezone (settings.TIME_ZONE)
            return timezone.localtime(obj.created_at).strftime('%Y-%m-%d %H:%M:%S')
        return None

    def get_updated_at_local(self, obj):
        if obj.updated_at:
            return timezone.localtime(obj.updated_at).strftime('%Y-%m-%d %H:%M:%S')
        return None

class MeetingFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = MeetingFile
        fields = '__all__'


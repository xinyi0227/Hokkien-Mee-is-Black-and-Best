from rest_framework import serializers
from django.utils import timezone
from .models import Task, BusinessData, ProcessedReport, Meeting, Employee,Department, MeetingFile, Complaint
class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = '__all__'

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
    
class ComplaintSubmitSerializer(serializers.ModelSerializer):
    created_at_local = serializers.SerializerMethodField()

    class Meta:
        model = Complaint
        fields = '__all__'
        read_only_fields = ['complaint_id', 'created_at']

    def create(self, validated_data):
        complaint = super().create(validated_data)

        # Auto-transcribe if audio path exists
        audio_path = complaint.complaint_audio
        if audio_path:
            try:
                from .azure_transcribe import azure_transcribe
                transcript_text = azure_transcribe(audio_path)
                complaint.complaint_transcript = transcript_text
                complaint.save()
            except Exception as e:
                print(f"Transcription failed: {e}")

        return complaint

    def get_created_at_local(self, obj):
        if obj.created_at:
            return timezone.localtime(obj.created_at).strftime('%Y-%m-%d %H:%M:%S')
        return None


class MeetingFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = MeetingFile
        fields = '__all__'
        
class ViewComplaintSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = '__all__'



import os
import azure.cognitiveservices.speech as speechsdk
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Meeting, MeetingFile, Employee, Department

def azure_transcribe(file_path):
    # Azure speech config
    speech_config = speechsdk.SpeechConfig(
        subscription=os.getenv("AZURE_KEY"),
        region=os.getenv("AZURE_REGION")
    )
    audio_config = speechsdk.audio.AudioConfig(filename=file_path)

    # Recognize speech from file
    speech_recognizer = speechsdk.SpeechRecognizer(
        speech_config=speech_config,
        audio_config=audio_config
    )
    result = speech_recognizer.recognize_once()

    if result.reason == speechsdk.ResultReason.RecognizedSpeech:
        return result.text
    else:
        return ""

@csrf_exempt
def transcript_view(request, meeting_id):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    try:
        # 1️⃣ Get meeting
        meeting = Meeting.objects.get(meeting_id=meeting_id)

        # --- Resolve mic employees ---
        mic_employees = []
        for mic_field in [meeting.meeting_mic1, meeting.meeting_mic2, meeting.meeting_mic3]:
            if mic_field:  # only if mic has a value
                try:
                    emp = Employee.objects.get(employee_id=mic_field)
                    mic_employees.append(emp.employee_name)
                except Employee.DoesNotExist:
                    mic_employees.append(None)
            else:
                mic_employees.append(None)

        # --- Resolve departments ---
        dept_names = []
        if meeting.meeting_department:
            dept_ids = meeting.meeting_department.split(",")
            departments = Department.objects.filter(department_id__in=dept_ids)
            dept_names = [d.department_name for d in departments]

        # --- Resolve participants ---
        participant_names = []
        if meeting.meeting_participant:
            participant_ids = meeting.meeting_participant.split(",")
            participants = Employee.objects.filter(employee_id__in=participant_ids)
            participant_names = [p.employee_name for p in participants]

        meeting_data = {
            "title": meeting.meeting_title,
            "date": meeting.meeting_date,
            "time": meeting.meeting_time,
            "location": meeting.meeting_location,
            "mics": mic_employees,           # list of employee names or None
            "departments": dept_names,       # list of department names
            "participants": participant_names  # list of employee names
        }

        # 2️⃣ Get meeting files
        meeting_files = MeetingFile.objects.filter(meeting_id=meeting_id)
        file_urls = []
        transcript_text = ""

        # for mf in meeting_files:
        #     for file_attr in ["meeting_org", "ind_file1", "ind_file2", "ind_file3"]:
        #         file_field = getattr(mf, file_attr, None)
        #         if file_field:
        #             url = request.build_absolute_uri(settings.MEDIA_URL + file_field.name)
        #             file_urls.append(url)
        
        for mf in meeting_files:
            # Transcribe only meeting_org
            if mf.meeting_org:
                file_path = os.path.join(settings.MEDIA_ROOT, mf.meeting_org.name)
                transcript_text = azure_transcribe(file_path)
                mf.meeting_summary = transcript_text  # Save to DB
                mf.save()

                url = request.build_absolute_uri(settings.MEDIA_URL + mf.meeting_org.name)
                file_urls.append(url)

            # Add other files if needed
            for file_attr in ["ind_file1", "ind_file2", "ind_file3"]:
                file_field = getattr(mf, file_attr, None)
                if file_field:
                    url = request.build_absolute_uri(settings.MEDIA_URL + file_field.name)
                    file_urls.append(url)

        return JsonResponse({
            "meeting": meeting_data,
            "files": file_urls,
            "transcript": transcript_text
        })

    except Meeting.DoesNotExist:
        return JsonResponse({"error": "Meeting not found"}, status=404)

import os
import azure.cognitiveservices.speech as speechsdk
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Meeting, MeetingFile, Employee, Department
from docx import Document
import re

def azure_transcribe(file_path):
    speech_config = speechsdk.SpeechConfig(
        subscription=os.getenv("AZURE_KEY"),
        region=os.getenv("AZURE_REGION")
    )
    audio_config = speechsdk.audio.AudioConfig(filename=file_path)
    speech_recognizer = speechsdk.SpeechRecognizer(
        speech_config=speech_config,
        audio_config=audio_config
    )

    transcript_parts = []

    def handle_result(evt):
        if evt.result.reason == speechsdk.ResultReason.RecognizedSpeech:
            transcript_parts.append(evt.result.text)

    # Subscribe to events
    speech_recognizer.recognized.connect(handle_result)

    # Start recognition
    speech_recognizer.start_continuous_recognition()
    speech_recognizer.session_stopped.connect(lambda evt: speech_recognizer.stop_continuous_recognition())
    speech_recognizer.canceled.connect(lambda evt: speech_recognizer.stop_continuous_recognition())

    # Wait until recognition completes
    done = False
    def stop_cb(evt):
        nonlocal done
        done = True
    speech_recognizer.session_stopped.connect(stop_cb)
    speech_recognizer.canceled.connect(stop_cb)

    while not done:
        import time
        time.sleep(0.5)

    return " ".join(transcript_parts)



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
            if mic_field:
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
            "mics": mic_employees,
            "departments": dept_names,
            "participants": participant_names
        }

        # 2️⃣ Get meeting files
        meeting_files = MeetingFile.objects.filter(meeting_id=meeting_id)
        file_urls = []
        transcript_file_urls = []

        safe_title = re.sub(r'[^A-Za-z0-9_-]+', '_', meeting.meeting_title)

        for mf in meeting_files:
            if mf.meeting_org:
                file_path = os.path.join(settings.MEDIA_ROOT, mf.meeting_org.name)
                transcript_text = azure_transcribe(file_path)

                # 📂 Make transcripts folder
                transcript_dir = os.path.join(settings.MEDIA_ROOT, "transcripts")
                os.makedirs(transcript_dir, exist_ok=True)

                # Save transcript to TXT
                txt_filename = f"transcript_meeting_{safe_title}.txt"
                txt_path = os.path.join(transcript_dir, txt_filename)
                with open(txt_path, "w", encoding="utf-8") as f:
                    f.write(transcript_text)

                # Save transcript to Word
                doc_filename = f"transcript_meeting_{safe_title}.docx"
                doc_path = os.path.join(transcript_dir, doc_filename)
                document = Document()
                document.add_heading(f"Transcript for Meeting {meeting.meeting_title}", level=1)
                document.add_paragraph(transcript_text)
                document.save(doc_path)

                # ✅ Save only filename (not path) into DB
                mf.meeting_transcripts = doc_filename
                mf.save()

                # Add URLs for frontend download
                txt_url = request.build_absolute_uri(settings.MEDIA_URL + f"transcripts/{txt_filename}")
                doc_url = request.build_absolute_uri(settings.MEDIA_URL + f"transcripts/{doc_filename}")
                transcript_file_urls.extend([txt_url, doc_url])

                # Also return audio file URL
                audio_url = request.build_absolute_uri(settings.MEDIA_URL + mf.meeting_org.name)
                file_urls.append(audio_url)

            # Handle individual files
            for file_attr in ["ind_file1", "ind_file2", "ind_file3"]:
                file_field = getattr(mf, file_attr, None)
                if file_field:
                    url = request.build_absolute_uri(settings.MEDIA_URL + file_field.name)
                    file_urls.append(url)

        return JsonResponse({
            "meeting": meeting_data,
            "audio_files": file_urls,
            "transcript_files": transcript_file_urls,
            "transcript": transcript_text
        })

    except Meeting.DoesNotExist:
        return JsonResponse({"error": "Meeting not found"}, status=404)

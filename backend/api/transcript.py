import os
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Meeting, MeetingFile  # adjust imports

@csrf_exempt
def transcript_view(request, meeting_id):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    try:
        # 1️⃣ Get meeting details
        meeting = Meeting.objects.get(meeting_id=meeting_id)
        meeting_data = {
            "title": meeting.meeting_title,
            "date": meeting.meeting_date,
            "time": meeting.meeting_time,
            "location": meeting.meeting_location,
        }

        # 2️⃣ Get meeting files
        meeting_files = MeetingFile.objects.filter(meeting_id=meeting_id)
        file_urls = []

        for mf in meeting_files:
            for file_attr in ["meeting_org", "ind_file1", "ind_file2", "ind_file3"]:
                file_field = getattr(mf, file_attr, None)
                if file_field:
                    # file_field is a FieldFile object; use .name to get relative path
                    url = request.build_absolute_uri(settings.MEDIA_URL + file_field.name)
                    file_urls.append(url)

        return JsonResponse({
            "meeting": meeting_data,
            "files": file_urls
        })

    except Meeting.DoesNotExist:
        return JsonResponse({"error": "Meeting not found"}, status=404)

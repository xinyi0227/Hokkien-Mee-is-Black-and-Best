# myapp/api/transcript.py
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse

@csrf_exempt
def transcript_view(request):
    if request.method == "GET":
        print("✅ GET request received")
        return JsonResponse({"message": "API is working"})

    elif request.method == "POST":
        main_audio = request.FILES.get("main_audio")
        if not main_audio:
            print("❌ Main audio file NOT received")
            return JsonResponse({"error": "Main audio file is required"}, status=400)

        # Collect all files starting with "individual_audio_"
        individual_files = [
            f for key, f in request.FILES.items()
            if key.startswith("individual_audio_")
        ]

        # Debug print to server console
        print(f"✅ Main audio received: {main_audio.name} ({main_audio.size} bytes)")
        if individual_files:
            print(f"📂 {len(individual_files)} individual files received:")
            for f in individual_files:
                print(f"   - {f.name} ({f.size} bytes)")
        else:
            print("⚠ No individual audio files received")

        return JsonResponse({"status": "success"})

    else:
        return JsonResponse({"error": "Invalid method"}, status=405)

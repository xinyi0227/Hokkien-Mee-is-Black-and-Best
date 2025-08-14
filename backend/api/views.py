from rest_framework import generics, status
from rest_framework.response import Response
from .models import Task, BusinessData
from .serializers import TaskSerializer, BusinessDataSerializer
from rest_framework.parsers import MultiPartParser
import datetime
from supabase import create_client, Client
import os
import uuid

class TaskListCreateView(generics.ListCreateAPIView):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer

class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer


class FileUploadView(generics.CreateAPIView):
    parser_classes = [MultiPartParser]
    
    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        uploader = request.data.get('uploader', 'anonymous')
        
        if not file_obj:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate unique filename
        file_ext = os.path.splitext(file_obj.name)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        
        # Initialize Supabase client
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_KEY')
        supabase: Client = create_client(supabase_url, supabase_key)
        
        try:
            # Upload file to Supabase storage
            upload_path = f"business_data/{unique_filename}"
            file_content = file_obj.read()
            
            res = supabase.storage.from_("business_files").upload(
                path=upload_path,
                file=file_content,
                file_options={"content-type": file_obj.content_type}
            )
            
            # Get public URL
            file_url = supabase.storage.from_("business_files").get_public_url(upload_path)
            
            # Save metadata to business_data table
            business_data = BusinessData.objects.create(
                fileName=file_obj.name,
                uploader=uploader,
                file_url=file_url
            )
            
            serializer = BusinessDataSerializer(business_data)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class FileListView(generics.ListAPIView):
    serializer_class = BusinessDataSerializer
    
    def get_queryset(self):
        uploader = self.request.query_params.get('uploader', None)
        if uploader:
            return BusinessData.objects.filter(uploader=uploader)
        return BusinessData.objects.all()
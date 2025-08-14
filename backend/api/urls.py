from django.urls import path
from .views import TaskListCreateView, TaskDetailView, FileUploadView, FileListView
from .transcript import transcript_view

urlpatterns = [
    path('tasks/', TaskListCreateView.as_view(), name='task-list-create'),
    path('tasks/<int:pk>/', TaskDetailView.as_view(), name='task-detail'),
    path('upload/', FileUploadView.as_view(), name='file-upload'),
    path('files/', FileListView.as_view(), name='file-list'),
    path('transcript/', transcript_view, name='transcript'),
]

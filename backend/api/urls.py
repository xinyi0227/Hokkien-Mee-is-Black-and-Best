from django.urls import path
from . import views,transcript

urlpatterns = [
    path('tasks/', views.TaskListCreateView.as_view(), name='task-list-create'),
    path('tasks/<int:pk>/', views.TaskRetrieveUpdateDestroyView.as_view(), name='task-detail'),  # Changed this line
    path('business-data/', views.BusinessDataListCreateView.as_view(), name='business-data-list-create'),
    path('business-data/<uuid:pk>/', views.BusinessDataRetrieveUpdateDestroyView.as_view(), name='business-data-detail'),
    path('process-file/', views.FileProcessingView.as_view(), name='process-file'),
    path('processed-reports/', views.ProcessedReportListView.as_view(), name='processed-reports-list'),
    path('processed-reports/<uuid:pk>/', views.ProcessedReportRetrieveView.as_view(), name='processed-report-detail'),
    path('transcript/', views.transcript_view, name='transcript'),
    path('meetings/', views.MeetingListView.as_view(), name='meeting-list'),
    path('meetings_detail/<int:meeting_id>/', views.MeetingDetailView.as_view(), name='meeting-detail'),
    path('departments/', views.DepartmentsListView.as_view(), name='departments-list'),
    path("employees/", views.EmployeeForMeetingView.as_view(), name="employee-list"),
    path('meeting_files/', views.upload_meeting_files, name='upload-meeting-files'),
    path('transcript/<int:meeting_id>/', transcript.transcript_view, name="transcript"),


]

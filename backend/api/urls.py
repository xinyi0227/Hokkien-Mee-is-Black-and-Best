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
    path('complaint-upload/', transcript.complaint_upload, name='complaint-upload'),
    path('meetings/', views.MeetingListView.as_view(), name='meeting-list'),
    path('meetingsToday/', views.TodayMeetingListView.as_view(), name='today-meeting-list'),
    path('meetingsFuture/', views.FutureMeetingListView.as_view(), name='future-meeting-list'),
    path('meetingsPast/', views.PassMeetingListView.as_view(), name='past-meeting-list'),
    path('meetings_detail/<int:meeting_id>/', views.MeetingDetailView.as_view(), name='meeting-detail'),
    path('departments/', views.DepartmentsListView.as_view(), name='departments-list'),
    path("employees/", views.EmployeeForMeetingView.as_view(), name="employee-list"),
    path('meeting_files/', views.upload_meeting_files, name='upload-meeting-files'),
    path('transcript/<int:meeting_id>/', transcript.transcript_view, name="transcript"),
    path('view_meeting_files/', views.MeetingFileListView.as_view(), name='view-meeting-files'),
    path('complaintList/', views.ComplaintListView.as_view(), name='complaint-list-create'),
    path('complaintDetails/<int:complaint_id>/', views.ComplaintDetailView.as_view(), name='complaint-update'),
    path("approve_summary/<int:meeting_id>/", transcript.approve_summary, name="approve-summary"),
    path('comment-reports/', views.CommentReportListView.as_view(), name='comment-report-list'),
    path('comment-reports/<uuid:pk>/', views.CommentReportRetrieveView.as_view(), name='comment-report-detail'),
    path('analyse-comment/', views.FeedbackAnalysisView.as_view(), name='analyse-comment'),
    path('meeting_full/<int:meeting_id>/', views.meeting_full, name='meeting-full'),
    path('meeting_files_check/', views.meeting_files_check, name='meeting_files_check'),
    path('generate-pdf-report/', views.GenerateEditedPDFView.as_view(), name='generate-pdf-report'),

]

// CommentFileList.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from "../lib/supabase";
import axios from 'axios';
import EditReportModal from './FeedbackReport';
import "../styles/design.css"

const CommentFileList = ({ uploader }) => {
  const [files, setFiles] = useState([]); 
  const [processedReports, setProcessedReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processingFiles, setProcessingFiles] = useState({});
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [newlyGeneratedReportId, setNewlyGeneratedReportId] = useState(null);

  const openEditModal = (report) => {
    setEditingReport(report);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingReport(null);
    setNewlyGeneratedReportId(null);
  };

  const handleSaveReport = async (reportId, updatedData) => {
    try {
      // Update the report in the database with edited status
      const { error } = await supabase
        .from('userComment_data')
        .update({ 
          file_content: updatedData,
          editedStatus: true // Add this field to track if report has been edited
        })
        .eq('id', reportId);

      if (error) throw error;

      // Update the local state
      setProcessedReports(prev => 
        prev.map(report => 
          report.id === reportId 
            ? { ...report, file_content: updatedData, editedStatus: true }
            : report
        )
      );

      alert('Report updated successfully!');
      closeEditModal();
    } catch (err) {
      console.error('Error updating report:', err);
      setError('Failed to update report: ' + err.message);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 1. Fetch original files
        const { data: filesData, error: filesError } = await supabase
          .from('business_data')
          .select('*')
          .eq('uploader', uploader)
          .eq('UseCase', 'comments');

        if (filesError) throw filesError;

        const fetchedFiles = Array.isArray(filesData) ? filesData : [];
        setFiles(fetchedFiles);

        // 2. Fetch processed reports for these files
        if (fetchedFiles.length > 0) {
          const fileIds = fetchedFiles.map(file => file.id);
          const { data: reportsData, error: reportsError } = await supabase
            .from('userComment_data')
            .select(`
              *,
              business_data (
                id,
                fileName
              )
            `)
            .in('file_url_id', fileIds);

          if (reportsError) throw reportsError;
          
          setProcessedReports(Array.isArray(reportsData) ? reportsData : []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
        setFiles([]);
        setProcessedReports([]);
      } finally {
        setLoading(false);
      }
    };

    if (uploader) fetchData();
  }, [uploader]);

  const processFileWithGemini = async (fileId) => {
    // Set processing status for this specific file
    setProcessingFiles(prev => ({ ...prev, [fileId]: true }));
    setError('');
    
    try {
      const response = await axios.post('/api/analyse-comment/', {
        file_id: fileId,
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      setAnalysisResult(response.data);
      
      // Get the newly created report
      const { data: reportsData, error: reportsError } = await supabase
        .from('userComment_data')
        .select('*')
        .eq('file_url_id', fileId)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (!reportsError && reportsData && reportsData.length > 0) {
        const newReport = reportsData[0];
        setNewlyGeneratedReportId(newReport.id);
        setProcessedReports(prev => [...prev, newReport]);
        // Automatically open the edit modal for the new report
        openEditModal(newReport);
      }
    } catch (error) {
      console.error('Full error object:', error);
      console.error('Error response data:', error.response?.data);
      setError(`Failed to process file: ${error.response?.data?.error || error.message}`);
    } finally {
      // Reset processing status for this file
      setProcessingFiles(prev => ({ ...prev, [fileId]: false }));
    }
  };

  const deleteFile = async (id, fileUrl) => {
    if (!window.confirm('Are you sure you want to delete this file and all its associated reports? This action cannot be undone.')) {
      return;
    }

    try {
      // First, delete all related reports in userComment_data
      const { error: reportsError } = await supabase
        .from('userComment_data')
        .delete()
        .eq('file_url_id', id);

      if (reportsError) throw reportsError;

      const path = fileUrl.split('/').pop();
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('business_files')
        .remove([`uploads/${path}`]);

      if (storageError) throw storageError;

      // Delete from database and update state
      const { error: dbError } = await supabase
        .from('business_data')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // Update state instead of refetching
      setFiles(prev => prev.filter(f => f.id !== id));
      
      // Also remove any processed reports for this file
      setProcessedReports(prev => prev.filter(report => report.file_url_id !== id));
      
      alert('File and associated reports deleted successfully!');
    } catch (error) {
      console.error('Delete error:', error);
      setError('Failed to delete file: ' + error.message);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  );
  
  if (error) return (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
      {error}
    </div>
  );

  return (
    <div>
      <div className="px-4 py-5 sm:px-6 border-gray-200">
        <h2 className="text-lg leading-6 font-medium text-gray-900">Your Uploaded Files</h2>
      </div>
      
      {/* File List */}
      <div className="space-y-4 mt-4">
        {files.length > 0 && files.map((file) => {
          const isProcessing = processingFiles[file.id];
          const report = processedReports.find(report => report.file_url_id == file.id);
          const reportExists = !!report;
          const isEdited = report?.editedStatus;
          
          return (
            <div
              key={file.id}
              className="p-4 border rounded-lg bg-white border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {file.fileName}
                  </h3>
                  <p className="text-gray-600 mt-1">
                    Uploaded: {new Date(file.created_at).toLocaleDateString("en-GB")}
                  </p>
                  
                  {reportExists && (
                    <p className={`text-sm mt-1 ${isEdited ? 'text-green-600' : 'text-blue-600'}`}>
                      {isEdited ? '✓ Report finalized' : 'Report needs review'}
                    </p>
                  )}
                  
                </div>
                <div className="flex space-x-2">
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-add text-white px-4 py-2 rounded inline-flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
                      <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75Zm-9 13.5a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5V16.5a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V16.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                    </svg>
                    Download
                  </a>
                  
                  {reportExists ? (
                    isEdited ? (
                      // Show PDF button for finalized reports
                      <a
                        href={report.pdf_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-custom text-white px-4 py-2 rounded inline-flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
                          <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 0 1 3.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 0 1 3.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 0 1-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875ZM9.75 17.25a.75.75 0 0 0-1.5 0V18a.75.75 0 0 0 1.5 0v-.75Zm2.25-3a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 .75-.75Zm3.75-1.5a.75.75 0 0 0-1.5 0V18a.75.75 0 0 0 1.5 0v-5.25Z" clipRule="evenodd" />
                          <path d="M14.25 5.25a5.23 5.23 0 0 0-1.279-3.434 9.768 9.768 0 0 1 6.963 6.963A5.23 5.23 0 0 0 16.5 7.5h-1.875a.375.375 0 0 1-.375-.375V5.25Z" />
                        </svg>
                        PDF Report
                      </a>
                    ) : (
                      // Show Edit button for reports that need review
                      <button
                        onClick={() => openEditModal(report)}
                        className="btn-custom text-white px-4 py-2 rounded inline-flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
                          <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z" />
                          <path d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z" />
                        </svg>
                        Review Report
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => processFileWithGemini(file.id)}
                      disabled={isProcessing}
                      className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50 inline-flex items-center"
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
                          </svg>
                          Process with AI
                        </>
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={() => deleteFile(file.id, file.file_url)}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 inline-flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {files.length === 0 && (
        <p className="text-center text-gray-500 mt-8">
          No files uploaded yet. Upload your first file above!
        </p>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <EditReportModal 
          report={editingReport} 
          onClose={closeEditModal} 
          onSave={handleSaveReport}
          isNewReport={newlyGeneratedReportId === editingReport?.id}
        />
      )}
    </div>
  );
};

export default CommentFileList;
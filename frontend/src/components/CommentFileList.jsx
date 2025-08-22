// FileList.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from "../lib/supabase";
import axios from 'axios';

const CommentFileList = ({ uploader }) => {
  const [files, setFiles] = useState([]); 
  const [processedReports, setProcessedReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processingFiles, setProcessingFiles] = useState({});
  const [analysisResult, setAnalysisResult] = useState(null); 

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
      alert('File processed successfully! Reports generated.');
      
      // Refresh the reports list
      const { data: reportsData, error: reportsError } = await supabase
        .from('userComment_data')
        .select('*')
        .eq('file_url_id', fileId);
        
      if (!reportsError && reportsData) {
        setProcessedReports(prev => [...prev, ...reportsData]);
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
    try {
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
    } catch (error) {
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
          const reportExists = processedReports.some(report => report.file_url === file.id);
          
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
                    <p className="text-green-600 text-sm mt-1">
                      ✓ Report available
                    </p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 inline-flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
                      <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75Zm-9 13.5a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5V16.5a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V16.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                    </svg>
                    Download
                  </a>
                  
                  {reportExists ? (
                    <a
                      href={`/report/${file.id}`} // Link to view the report
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 inline-flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
                        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                        <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z" clipRule="evenodd" />
                      </svg>
                      View Report
                    </a>
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

      {/* Processed Reports Section */}
      {processedReports.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Generated Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {processedReports.map((report) => (
              <div key={report.id} className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium">{report.filename}</h4>
                <p className="text-sm text-gray-600">
                  Generated: {new Date(report.created_at).toLocaleDateString()}
                </p>
                {report.pdf_url && (
                  <a 
                    href={report.pdf_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block"
                  >
                     PDF Report
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default CommentFileList;
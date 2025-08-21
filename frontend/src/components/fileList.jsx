// FileList.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from "../lib/supabase";
import axios from 'axios';

const FileList = ({ uploader }) => {
  const [files, setFiles] = useState([]); 
  // const [uploader, setUploader] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedReports, setProcessedReports] = useState([]);
  const [processingFiles, setProcessingFiles] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 1. Fetch original files
        const { data: filesData, error: filesError } = await supabase
          .from('business_data')
          .select('*')
          .eq('uploader', uploader)
          .eq('UseCase', 'sales');

        if (filesError) throw filesError;

        const fetchedFiles = Array.isArray(filesData) ? filesData : [];
        setFiles(fetchedFiles);

        // 2. Fetch processed reports for these files
        if (fetchedFiles.length > 0) {
          const fileIds = fetchedFiles.map(file => file.id);
          const { data: reportsData, error: reportsError } = await supabase
            .from('processed_reports')
            .select(`
              *,
              business_data (
                id,
                fileName
              )
            `)
            .in('original_file_id', fileIds);

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
    setIsProcessing(true);
    setProcessingFiles(prev => ({ ...prev, [fileId]: true }));
    try {
      const response = await axios.post('/api/process-file/', {
        file_id: fileId,
        analysis_type: 'data_cleaning_and_analysis'
      }, {
      headers: {
        'Content-Type': 'application/json',
      }}
      );
      setProcessedReports(prev => [...prev, response.data]);
      alert('File processed successfully! Reports generated.');
    } catch (error) {
      console.error('Full error object:', error);
      console.error('Error response data:', error.response?.data); // This shows backend error details
      console.error('Error status:', error.response?.status);
      console.error('Error headers:', error.response?.headers);
      setError(`Failed to process file: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsProcessing(false);
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
      <div className="space-y-4">
        {files.length > 0 && files.map((file) => (
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
                  Uploaded by: {new Date(file.created_at).toLocaleDateString("en-GB")}
                </p>
              </div>
              <div className="flex space-x-2">
                <a
                  href={file.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 inline-flex"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6 mr-2">
                    <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75Zm-9 13.5a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5V16.5a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V16.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                  </svg>

                  Download
                </a>
                <button
                  onClick={() => processFileWithGemini(file.id)}
                  disabled={processingFiles[file.id]}
                  className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50 inline-flex"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
                  </svg>
                  {processingFiles[file.id] ? 'Processing...' : 'Process with AI'}
                </button>
                <button
                  onClick={() => deleteFile(file.id, file.file_url)}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 inline-flex"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {files.length === 0 && (
        <p className="text-center text-gray-500 mt-8">
          No files uploaded yet. Upload your first file above!
        </p>
      )}

      {/* Processed Reports */}
      {processedReports.length > 0 && (
        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Generated Reports</h3>
          <div className="space-y-4">
            {processedReports.map(report => (
              <div key={report.id} className="p-4 bg-white rounded border flex justify-between items-center">
                <div>
                  <h4 className="font-medium">Report - {report.business_data.fileName}</h4>
                  <p className="text-sm text-gray-600">Generated on {new Date(report.created_at).toLocaleDateString("en-GB")}</p>
                </div>
                <div className="space-x-2">
                  <a 
                    href={report.pdf_url} 
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    PDF
                  </a>
                  <a 
                    href={report.ppt_url}
                    className="bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600 text-sm"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    PPT
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileList;
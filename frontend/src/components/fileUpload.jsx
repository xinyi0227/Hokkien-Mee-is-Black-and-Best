import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import axios from 'axios';

const FileUpload = () => {
  const [files, setFiles] = useState([]);
  const [uploader, setUploader] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [processedReports, setProcessedReports] = useState([]);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('business_data')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setFiles(data);
    } catch (error) {
      console.error('Error fetching files:', error);
      setError('Failed to fetch files');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fileInput = e.target.elements.file;
    const file = fileInput.files[0];
    
    if (!file) {
      setError('Please select a file');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      // 2. Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // 3. Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('business_files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 4. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('business_files')
        .getPublicUrl(filePath);

      // 5. Insert record into database
      const { error: dbError } = await supabase
        .from('business_data')
        .insert([{
          fileName: file.name,
          uploader: uploader || 'Anonymous',
          file_url: publicUrl
        }]);

      if (dbError) throw dbError;

      // Reset form and refresh list
      fileInput.value = '';
      setUploader('');
      fetchFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error.message || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (id, fileUrl) => {
    try {
      // Extract path from URL
      const path = fileUrl.split('/').pop();
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('business_files')
        .remove([`uploads/${path}`]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('business_data')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      setError('Failed to delete file');
    }
  };

   const processFileWithGemini = async (fileId) => {
  setIsProcessing(true);
  try {
    const response = await axios.post('/api/process-file/', {
      file_id: fileId,
      analysis_type: 'data_cleaning_and_analysis'
    });
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
  }
};


  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">File Upload Manager</h1>
      
      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Upload New File</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700">
            {error}
          </div>
        )}
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your Name (optional):
          </label>
          <input
            type="text"
            value={uploader}
            onChange={(e) => setUploader(e.target.value)}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your name"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select File (CSV/Excel):
          </label>
          <input
            type="file"
            name="file"
            accept=".csv,.xlsx,.xls"
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>
        
        <button
          type="submit"
          disabled={isUploading}
          className={`flex items-center justify-center bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors ${
            isUploading ? 'opacity-75 cursor-not-allowed' : ''
          }`}
        >
          {isUploading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </>
          ) : 'Upload File'}
        </button>
      </form>

      {/* File List */}
      <div className="space-y-4">
        {files.map((file) => (
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
                  Uploaded by: {file.uploader}
                </p>
              </div>
              <div className="flex space-x-2">
                <a
                  href={file.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Download
                </a>
                <button
                  onClick={() => deleteFile(file.id, file.file_url)}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
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

      {/* Processing Button */}
      {files.length > 0 && (
        <div>
          <h3>Process Files with AI</h3>
          {files.map(file => (
            <div key={file.id} className="file-item">
              <span>{file.fileName}</span>
              <button 
                onClick={() => processFileWithGemini(file.id)}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Process with AI'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Processed Reports */}
      {processedReports.length > 0 && (
        <div>
          <h3>Generated Reports</h3>
          {processedReports.map(report => (
            <div key={report.id} className="report-item">
              <a href={report.pdf_url} download>Download PDF Report</a>
              <a href={report.ppt_url} download>Download PPT Report</a>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default FileUpload;
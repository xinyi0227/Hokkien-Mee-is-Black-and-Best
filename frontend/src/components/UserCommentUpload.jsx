import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { Navigate } from 'react-router-dom';
import axios from 'axios';

const CommentFileUpload = ({ onUploadSuccess }) => {
  const [user, setUser] = useState(null);
  const [redirect, setRedirect] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);

  useEffect(() => {
      const fetchUser = async () => {
          const email = localStorage.getItem("user_email");
          if (!email) {
              setRedirect(true);
              return;
          }

          const { data, error } = await supabase
              .from("employee")
              .select("email, employee_id")
              .eq("email", email)
              .single();

          if (error) {
              console.error(error);
              setRedirect(true);
          } else if (data) {
              setUser(data);
          } else {
              setRedirect(true);
          }
      };

      fetchUser();
  }, []);

  if (redirect) {
      return <Navigate to="/login" replace />;
  }

  if (!user) return null;

  const fetchFiles = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('business_data')
        .select('*')
        .eq('uploader', user.employee_id)
        .in('UseCase', 'comments');
        
      if (error) throw error;
      setFiles(data || []);
      
    } catch (error) {
      console.error('Error fetching files:', error);
      setError('Error fetching files: ' + error.message);
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
      const filetype = "comments";

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
          uploader: user.employee_id,
          file_url: publicUrl,
          UseCase: filetype
        }]);

      if (dbError) throw dbError;

      onUploadSuccess(user.employee_id);

      // Reset form and refresh list
      fileInput.value = '';
      if (onUploadSuccess) {
        onUploadSuccess(user.employee_id);
      }
      fetchFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error.message || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  };


  return (
    <div className="mx-auto p-6">
      
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

    </div>
  );
};

export default CommentFileUpload;
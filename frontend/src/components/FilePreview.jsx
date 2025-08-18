
const FilePreviewModal = ({ file, onClose }) => {
  if (!file) return null;

  const getPreviewContent = () => {
    const extension = file.fileName.split('.').pop().toLowerCase();
    
    if (['csv', 'xlsx', 'xls'].includes(extension)) {
      return (
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-700 mb-4">
            CSV/Excel preview would be implemented here
          </p>
          <a 
            href={file.file_url} 
            className="text-blue-500 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Open full data
          </a>
        </div>
      );
    } else {
      return (
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-700">
            Preview not available for this file type
          </p>
        </div>
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b p-4">
          <h3 className="text-lg font-semibold">{file.fileName}</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 flex justify-center">
          {getPreviewContent()}
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
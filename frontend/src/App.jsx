import Header from './components/header'
import TaskList from './components/TaskList'
import {
    BrowserRouter as Router,
    Routes,
    Route,
} from "react-router-dom";
import FileUpload from './components/fileUpload';
import FileList from './components/fileList';
import { useState } from 'react';

import MeetingList from './components/MeetingList';
import MeetingSetup from "./components/MeetingSetup";

function App() {
  // file upload and listing
  const [currentUploader, setCurrentUploader] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadSuccess = (uploaderName) => {
    setCurrentUploader(uploaderName);
    setRefreshKey(prev => prev + 1); // Trigger refresh of FileList
  };
  
  return (
    <Router>
      <Header/>
      <Routes>
        {/* Main route */}
        <Route path="/" element={
          <div className="min-h-screen bg-gray-100">
            <TaskList />
          </div>
        } />
        
        {/* CSV Upload route */}
        <Route path="/files" element={
          <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              
              <FileUpload onUploadSuccess={handleUploadSuccess} />
              
              {currentUploader && (
                <div className="mt-8">
                  <FileList key={refreshKey} uploader={currentUploader} />
                </div>
              )}
            </div>
          </div>
        } />
         {/* Meeting Summary route */}
        <Route path="/meeting" element={
          <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-4xl mx-auto">
              <MeetingList />
            </div>
          </div>
        } />

        {/* Meeting Setup route */}
        <Route path="/setup" element={<MeetingSetup />} />
      </Routes>
    </Router>
  )
}

export default App
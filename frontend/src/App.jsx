import TaskList from './components/TaskList'
import {
    BrowserRouter as Router,
    Routes,
    Route,
} from "react-router-dom";

import { supabase } from './lib/supabase'

import MeetingGenerator from './components/meetingGenerator';
import MeetingGenerator2 from './components/meetingGenerator2';
import { useEffect, useState } from 'react';
import MeetingList from './components/MeetingList';
import MeetingSetup from "./components/MeetingSetup";
import MeetingToday from "./components/MeetingToday";
import MeetingFuture from "./components/MeetingFuture";
import MeetingPast from "./components/MeetingPast";
import ComplaintList from "./components/ComplaintList";
import ComplaintUpload from "./components/ComplaintUpload";
import ComplaintDetails from "./components/ComplaintDetails";
import Login from './components/Login';
import Details from "./components/Details";
import Register from './components/Register'
import FilePage from './components/filePage';
import ArchiveList from './components/ArchiveList';
import CommentFilePage from './components/CommentAnalyser';
import FAQ from "./components/Faq";
import FaqAdmin from "./components/FaqAdmin";
import Transcript from "./components/Transcript";
import MeetingAttachments from "./components/MeetingAttachments";


function App() {
  // file upload and listing
  const [currentUploader, setCurrentUploader] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [currentUser, setCurrentUser] = useState(null)

  const handleUploadSuccess = (uploaderName) => {
    setCurrentUploader(uploaderName);
    setRefreshKey(prev => prev + 1); // Trigger refresh of FileList
  };

  useEffect(() => {
    const fetchUser = async () => {
      const email = localStorage.getItem('user_email')
      if (!email) {
        setCurrentUser(null)
        return
      }

      try {
        const { data, error } = await supabase
          .from('employee')
          .select('employee_id, email, role, department_id')
          .eq('email', email)
          .single()

        if (error) {
          console.error("Error fetching user:", error)
          setCurrentUser(null)
        } else {
          setCurrentUser(data)
        }
      } catch (err) {
        console.error("Unexpected error:", err)
        setCurrentUser(null)
      }
    }

    fetchUser()
  }, [])

  return (
    <Router>
      <Routes>
        {/* Main route */}
        <Route
          path="/"
          element={
            <div className="min-h-screen bg-gray-100">
              <Login onLoginSuccess={setCurrentUser} />
            </div>
          }
        />

        <Route path="/register" element={<Register />} />
        
        {/* Task list page */}
        <Route
          path="/tasks"
          element={
            <div className="min-h-screen bg-gray-100">
              {currentUser ? (
                <TaskList currentUser={currentUser} />
              ) : (
                <div className="text-center mt-20 text-gray-600">
                  Loading user...
                </div>
              )}
            </div>
          }
        />

        <Route path="/meetingGenerator"
          element={
            <div className="min-h-screen bg-gray-100">
              <MeetingGenerator />
            </div>
          }
        />

        <Route 
          path="/transcript/:meetingId" 
          element={
            <div className="min-h-screen bg-gray-100">
              <Transcript />
            </div>
          } 
        />

    <Route path="/meetingAttachments/:meetingId" element={ <div className="min-h-screen bg-gray-100">
      <MeetingAttachments />
    </div>} />

 <Route path="/meetingGenerator/:meetingId" element={<MeetingGenerator />} />

        {/* <Route
          path="/MeetingGenerator2"
          element={
            <div className="min-h-screen bg-gray-100">
              <MeetingGenerator2 />
            </div>
          }
        /> */}

        <Route
          path="/details"
          element={
            <div className="min-h-screen bg-gray-100">
              <Details />
            </div>
          }
        />
        
        <Route 
          path="/archive" 
          element={
            <ArchiveList currentUser={currentUser} />
          } 
        />

        <Route 
          path="/faq" 
          element={
            <FAQ />
          }
        />

        <Route path="/faq-admin" element={<FaqAdmin />} />

        {/* CSV Upload route */}
        <Route
          path="/files"
          element={
            <>
              <FilePage />
            </>
          }
        />

        {/* Meeting Summary route */}
        <Route
          path="/meetingsToday"
          element={<MeetingToday />} />
        <Route
          path="/meetingsFuture"
          element={<MeetingFuture />} />
        <Route
          path="/meetingsPast"
          element={<MeetingPast />} />

        {/* Meeting Setup route */}
        <Route path="/setup" element={<MeetingSetup />} />

        {/* Comment Analyser */}
        <Route 
          path="/feedbackAnalyser" 
          element={<CommentFilePage />} 
        />
        {/* <Route path="/report/:reportId" element={<FeedbackReportViewer />} /> */}

        {/* Complaint route */}
        <Route
          path="/complaintList"
          element={<ComplaintList />} />
        <Route
          path="/complaintUpload"
          element={<ComplaintUpload />} />
        <Route
          path="/complaintDetails/:complaint_id"
          element={<ComplaintDetails />} />

      </Routes>
    </Router>
  );
}

export default App;

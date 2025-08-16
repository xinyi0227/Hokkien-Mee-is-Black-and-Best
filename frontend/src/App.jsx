import TaskList from './components/TaskList'
import {
    BrowserRouter as Router,
    Routes,
    Route,
} from "react-router-dom";
import MeetingGenerator from './components/meetingGenerator';
import MeetingGenerator2 from './components/meetingGenerator2';
import MeetingList from './components/MeetingList';
import MeetingSetup from "./components/MeetingSetup";
import Login from './components/Login';
import Details from "./components/Details";
import Register from './components/Register'
import FilePage from './components/filePage';

import Transcript from "./components/Transcript";

function App() {
  // file upload and listing
  const [currentUploader, setCurrentUploader] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  

  return (
    <Router>
      <Routes>
        {/* Main route */}
        <Route
          path="/"
          element={
            <div className="min-h-screen bg-gray-100">
              <Login />
            </div>
          }
        />

        <Route path="/register" element={<Register />} />
        
        {/* Task list page */}
        <Route
          path="/tasks"
          element={
            <div className="min-h-screen bg-gray-100">
              <TaskList />
            </div>
          }
        />

        <Route path="/meetingGenerator" element={<div className="min-h-screen bg-gray-100">
            <MeetingGenerator /> </div>} />

        <Route 
  path="/transcript/:meetingId" 
  element={
    <div className="min-h-screen bg-gray-100">
      <Transcript />
    </div>
  } 
/>


        <Route
          path="/MeetingGenerator2"
          element={
            <div className="min-h-screen bg-gray-100">
              <MeetingGenerator2 />
            </div>
          }
        />

        <Route
          path="/details"
          element={
            <div className="min-h-screen bg-gray-100">
              <Details />
            </div>
          }
        />

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
          path="/meeting"
          element={<MeetingList />} />

        {/* Meeting Setup route */}
        <Route path="/setup" element={<MeetingSetup />} />
      </Routes>
    </Router>
  );
}

export default App;

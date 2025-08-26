import React, { useState, useEffect } from "react";
import { useLocation,useNavigate  } from "react-router-dom";
import Header from './header'
import "../styles/uploadMeetingAudio.css";   // adjust path if needed


const Meeting = () => {
  const location = useLocation();
  const meetingId = location.state?.meetingId;

  const [meetingData, setMeetingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [hasUploadedFiles, setHasUploadedFiles] = useState(false);


  // Audio upload states
  const [mainFile, setMainFile] = useState(null);
  const [individualFiles, setIndividualFiles] = useState([]);
  const [individualMapping, setIndividualMapping] = useState([]); // map mic -> employee
  const [isUploading, setIsUploading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [employees, setEmployees] = useState([]); // all employees from DB
  const navigate = useNavigate();

   // --- Fetch meeting data & check uploaded files ---
useEffect(() => {
  if (!meetingId) return;

  const fetchMeetingFiles = async () => {
    try {
      // Fetch meeting details
      const meetingRes = await fetch(`http://localhost:8000/api/meetings_detail/${meetingId}/`);
      if (!meetingRes.ok) throw new Error("Failed to fetch meeting data");
      const meeting = await meetingRes.json();
      setMeetingData(meeting);

      // Fetch meeting files
    // Fetch meeting files
      const filesRes = await fetch(`http://localhost:8000/api/meeting_files_check/?meeting_id=${meetingId}`);
      if (!filesRes.ok) throw new Error("Failed to fetch meeting files");
      const data = await filesRes.json();

      console.log(data.has_meeting_org_file); // true or false
      setHasUploadedFiles(data.has_meeting_org_file);

      // Determine number of individual mics
      const mics = [meeting.meeting_mic1, meeting.meeting_mic2, meeting.meeting_mic3];
      const micCount = mics.filter((m) => m !== null && m !== "").length;
      setIndividualFiles(Array(micCount).fill(null));
      setIndividualMapping(Array(micCount).fill(null));

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  fetchMeetingFiles();
}, [meetingId]);



  // --- Fetch meeting data ---
  useEffect(() => {
    if (!meetingId) {
      setError("No meeting selected.");
      setLoading(false);
      return;
    }

    fetch(`http://localhost:8000/api/meetings_detail/${meetingId}/`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch meeting data");
        return res.json();
      })
      .then((data) => {
        setMeetingData(data);

        // Determine how many individuals based on mic fields
        const mics = [data.meeting_mic1, data.meeting_mic2, data.meeting_mic3];
        const micCount = mics.filter((m) => m !== null && m !== "").length;

        setIndividualFiles(Array(micCount).fill(null));
        setIndividualMapping(Array(micCount).fill(null));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [meetingId]);

  // --- Fetch employee data ---
  useEffect(() => {
    fetch("http://localhost:8000/api/employees/") // endpoint to get all employees
      .then((res) => res.json())
      .then((data) => setEmployees(data))
      .catch((err) => console.error(err));
  }, []);

  // --- Handle file changes ---
  const handleMainFileChange = (e) => setMainFile(e.target.files[0]);

  const handleIndividualFileChange = (index, file) => {
    const updatedFiles = [...individualFiles];
    updatedFiles[index] = file;
    setIndividualFiles(updatedFiles);
  };

  const handleEmployeeSelect = (index, employeeId) => {
    const updatedMapping = [...individualMapping];
    updatedMapping[index] = employeeId;
    setIndividualMapping(updatedMapping);
  };

  // --- Submit form ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mainFile) return setError("Main meeting audio is required");

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("main_audio", mainFile);

      individualFiles.forEach((file, idx) => {
        if (file) {
          formData.append(`individual_audio_${idx + 1}`, file);
          formData.append(`employee_id_${idx + 1}`, individualMapping[idx]); // map mic -> employee
        }
      });

      const res = await fetch("http://localhost:8000/api/transcript/", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setTranscript(data.text || "No transcript found");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };
const handleUpload = async () => {
  // Validation: Main file must exist
  if (!mainFile) {
    alert("Please choose the main meeting audio file.");
    return;
  }

// Validation: Every individual file must be chosen
for (let i = 0; i < individualFiles.length; i++) {
  if (!individualFiles[i]) {
    // Get the employee ID from meeting data
    const employeeId = meetingData[`meeting_mic${i + 1}`];
    console.log(`Mic ${i+1} maps to employee ID:`, employeeId);

    // Find matching employee in employees list
    const employee = employees.find(emp => emp.employee_id == employeeId); // loose equality to avoid type mismatch
    console.log("Matched employee:", employee);

    // Build the label
    const label = employee
      ? `${employee.employee_name} Audio`
      : `Individual Audio ${i + 1}`;

    alert(`Please choose a file for ${label}.`);
    return;
  }
}


  setIsUploading(true);
  setError("");

  try {
    const formData = new FormData();
    formData.append("meeting_id", meetingId);
    formData.append("main_audio", mainFile);
    individualFiles.forEach((file, idx) => {
      formData.append(`individual_audio_${idx + 1}`, file);
      formData.append(`employee_id_${idx + 1}`, individualMapping[idx]);
    });

    const res = await fetch("http://localhost:8000/api/meeting_files/", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "File upload failed");
      fetchMeetingData();
      return;
    }

    alert("Files uploaded successfully!");
    setUploadSuccess(true);
    fetchMeetingData();

  } catch (err) {
    alert(err.message);
  } finally {
    setIsUploading(false);
  }
};


// helper to reload meeting data
const fetchMeetingData = () => {
  fetch(`http://localhost:8000/api/meetings_detail/${meetingId}/`)
    .then((res) => res.json())
    .then((data) => setMeetingData(data))
    .catch((err) => setError(err.message));
};
// const handleTranscribe = async () => {
//   setIsTranscribing(true);
//   setError("");
//   try {
//     const res = await fetch(`http://localhost:8000/api/transcript/${meetingId}/`, {
//       method: "POST",   // must be POST
//     });
//     if (!res.ok) throw new Error("Transcription failed");
//     const data = await res.json();

//     // Convert file URLs into HTML audio elements
//     const audioHTML = data.files.map(url => `<audio controls src="${url}" class="mb-2 w-full"></audio>`).join("");
//     setTranscript(audioHTML);
//   } catch (err) {
//     setError(err.message);
//   } finally {
//     setIsTranscribing(false);
//   }
// };

const handleTranscribe = () => {
  navigate(`/transcript/${meetingId}`);
};


  if (loading) return <p>Loading meeting info...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
     <>
    <Header />
    <div className="p-6 min-h-screen bg-gray-200 dark:bg-gray-900">
    <div className="max-w-4xl mx-auto p-6" >
        <h1 className="text-3xl font-bold mb-6 dark:text-white">Meeting Generator</h1>

      {meetingData && (
        <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow">
            <h2 className="text-2xl font-semibold mb-2 dark:text-white">{meetingData.meeting_title}</h2>
            <p className="dark:text-gray-200"><strong>Date:</strong> {meetingData.meeting_date || "N/A"}</p>
            <p className="dark:text-gray-200"><strong>Time:</strong> {meetingData.meeting_time}</p>
            <p className="dark:text-gray-200"><strong>Location:</strong> {meetingData.meeting_location}</p>
          </div>
      )}

       {/* Conditional rendering */}
        {!hasUploadedFiles && !uploadSuccess ? (
      <form className="mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Upload Audio Files</h2>

            {/* Main File */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Main Meeting Audio:</label>
              <input
                type="file"
                accept="audio/*"
                onChange={handleMainFileChange}
                className="block w-full text-sm text-gray-500 dark:text-gray-300
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  dark:file:bg-blue-900 dark:file:text-blue-300 dark:hover:file:bg-blue-800"
              />
            </div>

            {/* Individual files */}
            {individualFiles.map((_, idx) => {
              const employeeId = meetingData[`meeting_mic${idx + 1}`];
              const employee = employees.find(emp => emp.employee_id == employeeId);

              return (
                <div key={idx} className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {employee ? `${employee.employee_name} Audio` : `Individual Audio ${idx + 1}`}:
                  </label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleIndividualFileChange(idx, e.target.files[0])}
                    className="block w-full text-sm text-gray-500 dark:text-gray-300
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-green-50 file:text-green-700
                      hover:file:bg-green-100
                      dark:file:bg-green-900 dark:file:text-green-300 dark:hover:file:bg-green-800"
                  />
                </div>
              )
            })}

            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
              className="btn-custom"
            >
              {isUploading ? "Uploading..." : "Upload Files"}
            </button>
          </form>
  ) : (
      //  {uploadSuccess && (
 <div className="mt-4">
            <button
              onClick={handleTranscribe}
              disabled={isTranscribing}
              className="btn-custom"
            >
              {isTranscribing ? "Transcribing..." : "Summary the audio"}
            </button>
          </div>
        )}

        {transcript && (
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-2 dark:text-white">Transcript / Audio Files:</h3>
            <div className="dark:text-gray-200" dangerouslySetInnerHTML={{ __html: transcript }} />
          </div>
        )}
      </div>
    </div>
  </>
);
};

export default Meeting;

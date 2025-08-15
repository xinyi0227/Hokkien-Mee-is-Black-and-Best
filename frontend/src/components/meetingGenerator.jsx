import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

const Meeting = () => {
  const location = useLocation();
  const meetingId = location.state?.meetingId;

  const [meetingData, setMeetingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Audio upload states
  const [mainFile, setMainFile] = useState(null);
  const [individualFiles, setIndividualFiles] = useState([]);
  const [individualMapping, setIndividualMapping] = useState([]); // map mic -> employee
  const [isUploading, setIsUploading] = useState(false);
  const [transcript, setTranscript] = useState("");

  const [employees, setEmployees] = useState([]); // all employees from DB

  // --- Fetch meeting data ---
  useEffect(() => {
    if (!meetingId) {
      setError("No meeting selected.");
      setLoading(false);
      return;
    }

    fetch(`http://localhost:8000/api/meetings/${meetingId}/`)
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

  if (loading) return <p>Loading meeting info...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Meeting Generator</h1>

      {meetingData && (
        <div className="mb-6 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-2xl font-semibold mb-2">{meetingData.meeting_title}</h2>
          <p><strong>Date:</strong> {meetingData.meeting_date || "N/A"}</p>
          <p><strong>Time:</strong> {meetingData.meeting_time}</p>
          <p><strong>Location:</strong> {meetingData.meeting_location}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Upload Audio Files</h2>

        {/* Main File */}
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Main Meeting Audio:</label>
           <input
            type="file"
            accept="audio/*"
            onChange={handleMainFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>

        {/* Individual files + employee select */}
       {individualFiles.map((_, idx) => {
  const employeeId = meetingData[`meeting_mic${idx + 1}`];
  const employee = employees.find(emp => emp.employee_id == employeeId);

  return (
    <div key={idx} className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {employee ? `${employee.employee_name} Audio` : `Individual Audio ${idx + 1}`}:
      </label>
      <input
        type="file"
        accept="audio/*"
        onChange={(e) => handleIndividualFileChange(idx, e.target.files[0])}
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-lg file:border-0
          file:text-sm file:font-semibold
          file:bg-green-50 file:text-green-700
          hover:file:bg-green-100"
      />
    </div>
  )
})}


         <button
          type="submit"
          disabled={isUploading}
          className={`flex items-center justify-center bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors ${
            isUploading ? "opacity-75 cursor-not-allowed" : ""
          }`}
        >
          {isUploading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 
                    5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 
                    3 7.938l3-2.647z"
                ></path>
              </svg>
              Uploading...
            </>
          ) : (
            "Upload & Transcribe"
          )}
        </button>
      </form>

      {transcript && (
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-2">Transcript:</h3>
          <p className="whitespace-pre-wrap">{transcript}</p>
        </div>
      )}
    </div>
  );
};

export default Meeting;

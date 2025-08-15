import React, { useState } from "react";
import { useLocation } from "react-router-dom";

const Meeting = () => {
  const [mainFile, setMainFile] = useState(null);
  const [numIndividuals, setNumIndividuals] = useState(0);
  const [individualFiles, setIndividualFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");

  // for from meeting list  
  const location = useLocation();
  const meetingId = location.state?.meetingId; // get meetingId passed from previous page
  const [meetingData, setMeetingData] = useState(null);

    useEffect(() => {
    if (meetingId) {
      // Example API call to get meeting data by ID
      fetch(`http://localhost:8000/api/meetings/${meetingId}/`)
        .then((res) => res.json())
        .then((data) => setMeetingData(data))
        .catch((err) => console.error(err));
    }
  }, [meetingId]);

  if (!meetingId) return <p>No meeting selected.</p>;


  const handleMainFileChange = (e) => {
    setMainFile(e.target.files[0]);
    setError("");
  };

  const handleNumChange = (e) => {
    let value = parseInt(e.target.value, 10);
    if (value > 3) value = 3; // limit to max 3
    if (value < 1) value = 1; // min 1
    setNumIndividuals(value);
    // Reset the array when number changes
    setIndividualFiles(Array(value).fill(null));
  };

  const handleIndividualFileChange = (index, file) => {
    const updatedFiles = [...individualFiles];
    updatedFiles[index] = file;
    setIndividualFiles(updatedFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mainFile) {
      setError("Please select the main meeting audio file");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("main_audio", mainFile);

      // Append individual files
      individualFiles.forEach((file, idx) => {
        if (file) {
          formData.append(`individual_audio_${idx + 1}`, file);
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Audio to Transcript</h1>

      <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Upload Audio Files</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700">
            {error}
          </div>
        )}

        {/* Main Meeting File */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Main Meeting Audio File:
          </label>
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

        {/* Number of Individuals */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Number of Individual Voice Files (max 3):
          </label>
          <input
            type="number"
            min="1"
            max="3"
            value={numIndividuals}
            onChange={handleNumChange}
            className="border rounded px-3 py-2 w-20"
          />
        </div>

        {/* Individual File Uploads */}
        {Array.from({ length: numIndividuals }).map((_, index) => (
          <div key={index} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Individual Voice File {index + 1}:
            </label>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => handleIndividualFileChange(index, e.target.files[0])}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-green-50 file:text-green-700
                hover:file:bg-green-100"
            />
          </div>
        ))}

        {/* Submit */}
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

      {/* Transcript Output */}
      {transcript && (
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-2">Transcript:</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{transcript}</p>
        </div>
      )}
    </div>
  );
};

export default Meeting;

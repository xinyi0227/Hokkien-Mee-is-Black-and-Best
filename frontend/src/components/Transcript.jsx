// TranscriptPage.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const TranscriptPage = () => {
  const { meetingId } = useParams();
  const [meetingData, setMeetingData] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`http://localhost:8000/api/transcript/${meetingId}/`, { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        setMeetingData(data.meeting);
        setFiles(data.files || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [meetingId]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Meeting Transcript & Audio</h1>

      {meetingData && (
        <div className="mb-6 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-2xl font-semibold mb-2">{meetingData.title}</h2>
          <p><strong>Date:</strong> {meetingData.date}</p>
          <p><strong>Time:</strong> {meetingData.time}</p>
          <p><strong>Location:</strong> {meetingData.location}</p>
        </div>
      )}

      <div className="space-y-4">
        {files.map((url, idx) => (
  <audio key={idx} controls src={url} className="mb-2 w-full"></audio>
))}

      </div>
    </div>
  );
};

export default TranscriptPage;

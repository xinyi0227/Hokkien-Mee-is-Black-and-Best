import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const TranscriptPage = () => {
  const { meetingId } = useParams();
  const [meetingData, setMeetingData] = useState(null);
  const [audioFiles, setAudioFiles] = useState([]);
  const [transcriptFiles, setTranscriptFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");

  useEffect(() => {
    fetch(`http://localhost:8000/api/transcript/${meetingId}/`, { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        setMeetingData(data.meeting);
        setAudioFiles(data.audio_files || []);
        setTranscriptFiles(data.transcript_files || []);
        setTranscript(data.transcript || "");
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

          <p><strong>Mic Employees:</strong></p>
          <ul className="ml-4 list-disc">
            {meetingData.mics.map((name, idx) => (
              <li key={idx}>{name || `Mic ${idx + 1} not assigned`}</li>
            ))}
          </ul>

          <p><strong>Departments:</strong></p>
          <ul className="ml-4 list-disc">
            {meetingData.departments.map((dept, idx) => (
              <li key={idx}>{dept}</li>
            ))}
          </ul>

          <p><strong>Participants:</strong></p>
          <ul className="ml-4 list-disc">
            {meetingData.participants.map((participant, idx) => (
              <li key={idx}>{participant}</li>
            ))}
          </ul>

          {/* 📝 Transcript preview */}
          {transcript && (
            <div className="mt-6 p-4 bg-white border rounded">
              <h3 className="text-xl font-semibold mb-2">Transcript Preview</h3>
              <p className="whitespace-pre-wrap">{transcript}</p>
            </div>
          )}
        </div>
      )}

      {/* 🎵 Audio Files */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold mb-2">Audio Files</h3>
        {audioFiles.length > 0 ? (
          audioFiles.map((url, idx) => (
            <div key={idx} className="mb-4">
              <audio controls src={url} className="w-full"></audio>
              <p className="text-sm text-gray-500">URL: {url}</p>
            </div>
          ))
        ) : (
          <p>No audio files found.</p>
        )}
      </div>

      {/* 📂 Transcript Files */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold mb-2">Transcript Files</h3>
        {transcriptFiles.length > 0 ? (
          <ul className="list-disc ml-6">
            {transcriptFiles.map((url, idx) => (
              <li key={idx}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p>No transcript files found.</p>
        )}
      </div>
    </div>
  );
};

export default TranscriptPage;

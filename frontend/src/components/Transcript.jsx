import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import jsPDF from "jspdf";


const TranscriptPage = () => {
  const { meetingId } = useParams();
  const [meetingData, setMeetingData] = useState(null);
  const [audioFiles, setAudioFiles] = useState([]);
  const [transcriptFiles, setTranscriptFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [geminiResult, setGeminiResult] = useState(""); // 📝 Gemini result state


  useEffect(() => {
    fetch(`http://localhost:8000/api/transcript/${meetingId}/`, { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        setMeetingData(data.meeting);
        setAudioFiles(data.audio_files || []);
        setTranscriptFiles(data.transcript_files || []);
        setTranscript(data.transcript || "");
        setGeminiResult(data.gemini); // 📌 Make sure backend sends this

      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [meetingId]);

   // 📌 Function to download Gemini result as PDF
const downloadGeminiPDF = () => {
  try {
    // ✅ no need to use "parsed", just use geminiResult directly
    const doc = new jsPDF();

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Meeting Summary of ${meetingData.title}`, 10, 20);

    // Summary
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Summary", 10, 35);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(doc.splitTextToSize(geminiResult.summary || "No summary provided", 180), 10, 42);

    // Risks
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Risks, Blockers, or Dependencies", 10, 60);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(doc.splitTextToSize(geminiResult.risks || "None mentioned", 180), 10, 68);

    // Tasks
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Tasks Assigned", 10, 85);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    if (geminiResult.tasks && geminiResult.tasks.length > 0) {
      geminiResult.tasks.forEach((t, idx) => {
        doc.text(`${idx + 1}) ${t.task} -> ${t.assignee || "Unassigned"}`, 10, 93 + idx * 7);
      });
    } else {
      doc.text("No tasks recorded", 10, 93);
    }

    // Next Steps
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Next Steps", 10, 120);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(doc.splitTextToSize(geminiResult.next_steps || "Not specified", 180), 10, 128);

    // Save
    doc.save(`Meeting_Summary_of_${meetingData.title}.pdf`);
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Failed to generate PDF. Make sure the AI response is valid JSON.");
  }
};


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
    

      {/* 🤖 Gemini Result */}
     {geminiResult && (
        <div className="mt-6 p-4 bg-white border rounded">
          <h3 className="text-xl font-semibold mb-2">Gemini Result</h3>
          <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-2 rounded">
            {JSON.stringify(geminiResult, null, 2)}
          </pre>

          <button
            onClick={downloadGeminiPDF}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Download Gemini Result as PDF
          </button>
        </div>
      )}

    </div>
  );
};

export default TranscriptPage;

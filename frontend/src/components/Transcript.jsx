import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import jsPDF from "jspdf";
import { FiTrash2, FiX } from 'react-icons/fi'
import { MdFormatListBulletedAdd } from "react-icons/md";
import { useNavigate } from "react-router-dom";

const TranscriptPage = () => {
  const { meetingId } = useParams();
  const [meetingData, setMeetingData] = useState(null);
const [audioFiles, setAudioFiles] = useState([]);
const [transcriptFiles, setTranscriptFiles] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");
const [transcript, setTranscript] = useState("");

// order fixed 👇
const [geminiResult, setGeminiResult] = useState(null);
const [editableSummary, setEditableSummary] = useState([]);
const [editableTasks, setEditableTasks] = useState({});
const [geminiReady, setGeminiReady] = useState(false);

  const navigate = useNavigate();  

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


useEffect(() => {
  if (geminiResult !== null) {
    setEditableSummary(geminiResult.summary || []);
    setEditableTasks(geminiResult.tasks || {});

    const hasSummary = Array.isArray(geminiResult.summary) && geminiResult.summary.length > 0;
    const hasTasks = geminiResult.tasks && Object.keys(geminiResult.tasks).length > 0;

    setGeminiReady(hasSummary || hasTasks);
  }
}, [geminiResult]);


const handleApprove = async () => {

  try {
    const response = await fetch(`http://localhost:8000/api/approve_summary/${meetingData.ID}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: editableSummary,   // summary points
        tasks: editableTasks        // structured tasks
      }),
    });

    if (response.ok) {
      alert("Summary and tasks saved successfully!");
      navigate("/setup");
    } else {
      alert("Failed to save data.");
    }
  } catch (error) {
    console.error("Error saving data:", error);
  }
};


   // 📌 Function to download Gemini result as PDF
// const downloadGeminiPDF = () => {
//   try {
//     const doc = new jsPDF("p", "mm", "a4"); // portrait, millimeters, A4
//     const pageWidth = doc.internal.pageSize.getWidth();
//     const pageHeight = doc.internal.pageSize.getHeight();
//     const margin = 15; // left/right margin
//     const usableWidth = pageWidth - margin * 2;

//     let yOffset = 20;

//     // Title
//     doc.setFont("helvetica", "bold");
//     doc.setFontSize(16);
//     doc.text(`Meeting Summary of ${meetingData.title}`, margin, yOffset);
//     yOffset += 10;

//     // Summary Section
//     doc.setFont("helvetica", "bold");
//     doc.setFontSize(12);
//     doc.setTextColor(0, 102, 204); // blue color for heading
//     doc.text("Summary", margin, yOffset);
//     yOffset += 10;

//     doc.setFont("helvetica", "normal");
//     doc.setFontSize(11);
//     doc.setTextColor(0, 0, 0); // reset back to black for task details

//     if (geminiResult.summary && geminiResult.summary.length > 0) {
//       geminiResult.summary.forEach((point) => {
//         let wrappedText = doc.splitTextToSize(`~ ${point}`, usableWidth);
//         doc.text(wrappedText, margin, yOffset);
//         yOffset += wrappedText.length * 7;

//         // ✅ Auto add new page if overflow
//         if (yOffset > pageHeight - margin) {
//           doc.addPage();
//           yOffset = margin;
//         }
//       });
//     } else {
//       doc.text("No summary provided", margin, yOffset);
//       yOffset += 10;
//     }

//     // Tasks Section
//     yOffset += 10;
//     doc.setFont("helvetica", "bold");
//     doc.setFontSize(12);
//     doc.setTextColor(0, 102, 204); // blue color for heading
//     doc.text("Tasks Assigned", margin, yOffset);
//     yOffset += 10;

//     doc.setFont("helvetica", "normal");
//     doc.setFontSize(11);
//     doc.setTextColor(0, 0, 0); // reset back to black for task details

//     if (geminiResult.tasks && Object.keys(geminiResult.tasks).length > 0) {
//     Object.entries(geminiResult.tasks).forEach(([name, tasks]) => {
//       doc.setFont("helvetica", "bold");
//       doc.text(`${name}:`, margin, yOffset);
//       yOffset += 7;

//       doc.setFont("helvetica", "normal");
//       tasks.forEach((task, idx) => {
//         let taskBlock = [
//           `${idx + 1}) ${task.task_title}`,
//           `   Content: ${task.task_content}`,
//           `   Urgency: ${task.urgent_level}`,
//           `   Deadline: ${task.deadline || "Not specified"}`
//         ];
//         let wrappedTask = doc.splitTextToSize(taskBlock.join("\n"), usableWidth);
//         doc.text(wrappedTask, margin + 5, yOffset);
//         yOffset += wrappedTask.length * 7;

//         if (yOffset > pageHeight - margin) {
//           doc.addPage();
//           yOffset = margin;
//         }
//       });
//       yOffset += 5;
//     });

//     } else {
//       doc.text("No tasks recorded", margin, yOffset);
//     }

//     // Save
//     doc.save(`Meeting_Summary_of_${meetingData.title}.pdf`);
//   } catch (error) {
//     console.error("Error generating PDF:", error);
//     alert("Failed to generate PDF. Make sure the AI response is valid JSON.");
//   }
// };


if (loading) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white/80">
      {/* Spinner */}
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent border-solid rounded-full animate-spin"></div>
      
      {/* Loading text */}
      <p className="mt-4 text-lg font-semibold text-blue-600 animate-pulse">
        Loading...
      </p>
    </div>
  );
}

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

          {/* <p><strong>Mic Employees:</strong></p>
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
          </ul>*/}

          <p><strong>Participants:</strong></p>
          <ul className="ml-4 list-disc">
            {meetingData.participants.map((participant, idx) => (
              <li key={idx}>{participant}</li>
            ))}
          </ul> 

          {/* 📝 Transcript preview */}
          {/*transcript && (
            <div className="mt-6 p-4 bg-white border rounded">
              <h3 className="text-xl font-semibold mb-2">Transcript Preview</h3>
              <p className="whitespace-pre-wrap">{transcript}</p>
            </div>
          )*/}
        </div>
      )}

        {/* 🎵 Audio File */}
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-2">Audio File</h3>
          {audioFiles ? (
            <div className="mb-4">
              <audio controls src={audioFiles} className="w-full"></audio>
              <p className="text-sm text-gray-500">URL: {audioFiles}</p>
            </div>
          ) : (
            <p>No audio file found.</p>
          )}
        </div>


      {/* 📂 Transcript Files */}
      {/* <div className="mt-6">
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
     */}

      {/* 🤖 Gemini Result */}
     {/* {geminiResult && (
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
      )} */}


      {/* Editable Summary + Tasks */}
      <div className="p-6 bg-white rounded-lg shadow-md mt-6">
        <h2 className="text-xl font-bold mb-4">
          Meeting Summary of {meetingData.title}
        </h2>

 {!geminiReady ? (
    // ⏳ Show loading state until Gemini has real content
    <div className="flex flex-col items-center justify-center p-6">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-3 text-blue-600 font-semibold">Analyzing meeting with Gemini...</p>
    </div>
  ) : (
    <>
        {/* Summary */}
        <h3 className="text-lg font-semibold text-blue-600">Summary</h3>
        {editableSummary.length > 0 ? (
          editableSummary.map((point, idx) => (
            <div key={idx} className="flex items-start gap-2 mb-2">
              <textarea
                className="w-full border rounded p-2 text-gray-700"
                value={point}
                onChange={(e) => {
                  const newSummary = [...editableSummary];
                  newSummary[idx] = e.target.value;
                  setEditableSummary(newSummary);
                }}
              />
              <button
                onClick={() => {
                  setEditableSummary(editableSummary.filter((_, i) => i !== idx));
                }}
              className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50  mt-3"
              >
                <FiTrash2 size={17} />
              </button>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No summary provided</p>
        )}
        <button
          onClick={() => setEditableSummary([...editableSummary, ""])}
          className="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          + Add Point
          
        </button>

        

        {/* Tasks */}
        <h3 className="text-lg font-semibold text-blue-600 mt-6">Tasks Assigned</h3>
        {Object.keys(editableTasks).length > 0 ? (
          Object.entries(editableTasks).map(([name, tasks]) => (
            <div key={name} className="mb-6 border rounded-lg p-3 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <p className="font-semibold">{name}:</p>
                <div>
                  <button
                    className="bg-red-500 text-white px-2 py-1 rounded text-sm mr-2"
                    onClick={() => {
                      const newTasks = { ...editableTasks };
                      delete newTasks[name];
                      setEditableTasks(newTasks);
                    }}
                  >
                    Delete Employee
                  </button>
                </div>
              </div>

              {/* Tasks per employee */}
              {tasks.map((task, idx) => (
                <div key={idx} className="border rounded p-2 mb-2 bg-gray-50">
                  <p>
                    <span className="font-semibold">Title:</span>
                    <input
                      type="text"
                      className="ml-1 border rounded p-1 w-full"
                      value={task.task_title}
                      onChange={(e) => {
                        const newTasks = { ...editableTasks };
                        newTasks[name][idx].task_title = e.target.value;
                        setEditableTasks(newTasks);
                      }}
                    />
                  </p>
                  <p>
                    <span className="font-semibold">Content:</span>
                    <textarea
                      className="ml-1 border rounded p-1 w-full"
                      value={task.task_content}
                      onChange={(e) => {
                        const newTasks = { ...editableTasks };
                        newTasks[name][idx].task_content = e.target.value;
                        setEditableTasks(newTasks);
                      }}
                    />
                  </p>
                  <p>
                    <span className="font-semibold">Urgency level:</span>
                    <input
                      type="text"
                      className="ml-1 border rounded p-1 w-full"
                      value={task.urgent_level}
                      onChange={(e) => {
                        const newTasks = { ...editableTasks };
                        newTasks[name][idx].urgent_level = e.target.value;
                        setEditableTasks(newTasks);
                      }}
                    />
                  </p>
                  <p>
                    <span className="font-semibold">Deadline:</span>
                    <input
                      type="text"
                      className="ml-1 border rounded p-1 w-full"
                      value={task.deadline || ""}
                      onChange={(e) => {
                        const newTasks = { ...editableTasks };
                        newTasks[name][idx].deadline = e.target.value;
                        setEditableTasks(newTasks);
                      }}
                    />
                  </p>

                  {/* Delete Task Button */}
                  <button
                    className="bg-red-400 text-white px-2 py-1 mt-2 rounded text-sm"
                    onClick={() => {
                      const newTasks = { ...editableTasks };
                      newTasks[name].splice(idx, 1);
                      setEditableTasks(newTasks);
                    }}
                  >
                    <FiTrash2 size={17} />
                  </button>
                </div>
              ))}

              {/* Add Task Button */}
              <button
                className="bg-green-500 text-white px-3 py-1 rounded text-sm mt-2"
                onClick={() => {
                  const newTasks = { ...editableTasks };
                  newTasks[name].push({
                    task_title: "",
                    task_content: "",
                    urgent_level: "",
                    deadline: "",
                  });
                  setEditableTasks(newTasks);
                }}
              >
              <MdFormatListBulletedAdd size={20} />
              </button>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No tasks recorded</p>
        )}

        {/* Add Employee Dropdown */}
        <div className="mt-4">
          <label className="font-semibold mr-2">Add Employee:</label>
          <select
            onChange={(e) => {
              const employeeName = e.target.value;
              if (employeeName && !editableTasks[employeeName]) {
                setEditableTasks({
                  ...editableTasks,
                  [employeeName]: [
                    {
                      task_title: "",
                      task_content: "",
                      urgent_level: "",
                      deadline: "",
                    },
                  ],
                });
              }
            }}
            defaultValue=""
            className="border rounded p-1"
          >
            <option value="" disabled>
              Select participant
            </option>
            {meetingData.participants.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Approve Button */}
        <button
          onClick={handleApprove}
         className="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Approve & Save
        </button>
      </>
  )}
</div>
    </div>
  );
};

export default TranscriptPage;
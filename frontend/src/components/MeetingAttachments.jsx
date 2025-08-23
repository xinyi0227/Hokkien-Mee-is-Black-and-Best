import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useNavigate,useLocation  } from "react-router-dom";


export default function MeetingAttachments() {
  const { meetingId } = useParams();
  const [attachments, setAttachments] = useState([]);
  const [meetingDetails, setMeetingDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const fromPage = location.state?.from;

const handleBack = () => {
  if (fromPage === "today") navigate("/meetingsToday");
  else if (fromPage === "past") navigate("/meetingsPast");
  else navigate(-1); // fallback if no state
};

 useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/meeting_full/${meetingId}/`);
      if (!response.ok) throw new Error("Failed to fetch meeting data");

      const data = await response.json();
      setMeetingDetails(data.meeting);
      setAttachments(data.attachments);
    } catch (error) {
      console.error("Error fetching meeting data:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [meetingId]);


  if (loading) return <p className="p-6">Loading meeting data...</p>;

  return (
    <div className="p-6">
      {meetingDetails && (
        <div className="mb-4">
          <h1 className="text-2xl font-bold">{meetingDetails.meeting_title}</h1>
          <p className="text-gray-600">Meeting date: {meetingDetails.meeting_date}</p>
          <p className="text-gray-600">Meeeting time: {meetingDetails.meeting_time}</p>
          <p className="text-gray-600">Meeeting location: {meetingDetails.meeting_location}</p>
          <p className="text-gray-800">{meetingDetails.summary}</p>
        </div>
      )}

  <h2 className="text-xl font-semibold mb-3">Attachments</h2>
    {attachments.length === 0 || attachments.every(file => !file.meeting_summary_url) ? (
      <>
        <p className="text-red-600">
          No meeting summary available. You may forget to summary audios, click the button below to make a summary.
        </p>

         <button
            onClick={() => navigate(`/meetingGenerator/${meetingId}`, { state: { meetingId } })}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Go summary audio
          </button>
      </>
    ) : (
      <ul className="space-y-3">
        {attachments.map((file, idx) => (
          file.meeting_summary_url ? (  // Only render if summary exists
            <li key={idx} className="p-3 bg-gray-100 rounded-lg shadow flex justify-between items-center">
              <span>{file.meeting_summary_url.split("/").pop()}</span> {/* Just show file name */}
              <a
                href={file.meeting_summary_url}
                download
                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              >
                Download
              </a>
            </li>
          ) : null
        ))}
      </ul>
    )}

      <button
        onClick={handleBack}
        className="mt-8 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
      >
        ← Back
      </button>
    </div>
  );
}

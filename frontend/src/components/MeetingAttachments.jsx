import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/meetingAttachment.css";   // adjust path if needed

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
<div className="p-6 min-h-screen bg-[#dcdcdd] dark:bg-gray-900">
  {meetingDetails && (
    <div className="mb-4">
      <h1 className="text-2xl font-bold text-black dark:text-gray-100">
        {meetingDetails.meeting_title}
      </h1>

      <p>
        <span className="text-black font-medium dark:text-gray-100">
          Meeting date:
        </span>{" "}
        <span className="text-gray-600 dark:text-gray-300">
          {meetingDetails.meeting_date}
        </span>
      </p>
      <p>
        <span className="text-black font-medium dark:text-gray-100">
          Meeting time:
        </span>{" "}
        <span className="text-gray-600 dark:text-gray-300">
          {meetingDetails.meeting_time}
        </span>
      </p>
      <p>
        <span className="text-black font-medium dark:text-gray-100">
          Meeting location:
        </span>{" "}
        <span className="text-gray-600 dark:text-gray-300">
          {meetingDetails.meeting_location}
        </span>
      </p>

      <p className="text-gray-800 dark:text-gray-200">
        {meetingDetails.summary}
      </p>
    </div>
  )}

      <h2 className="text-xl font-semibold mb-3 text-black dark:text-gray-100">
    Meeting Summary
  </h2>

  {attachments.length === 0 ||
  attachments.every((file) => !file.meeting_summary_url) ? (
    <>
      <p className="text-red-600 dark:text-red-400">
        No meeting summary available. You may forget to summary audios,
        click the button below to make a summary.
      </p>

      <button
        onClick={() =>
          navigate(`/meetingGenerator/${meetingId}`, { state: { meetingId } })
        }
        className="btn-custom mt-4"
      >
        Go summary audio
      </button>
    </>
  ) : (
    <ul className="space-y-3">
      {attachments.map((file, idx) =>
        file.meeting_summary_url ? (
          <li
            key={idx}
            className="attachment-box border border-gray-300 dark:border-gray-700 p-3 rounded-md"
          >
            <span className="text-gray-700 dark:text-gray-200">
              {file.meeting_summary_url.split("/").pop()}
            </span>
            <a
              href={file.meeting_summary_url}
              download
              className="btn-custom"
            >
              Download
            </a>
          </li>
        ) : null
      )}
    </ul>
  )}

  <button onClick={handleBack} className="btn-custom mt-8 block">
    ← Back
  </button>
</div>
  );
}

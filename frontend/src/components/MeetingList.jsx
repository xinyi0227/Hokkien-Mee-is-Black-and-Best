import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function MeetingList() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  // Filters
  const [filterDept, setFilterDept] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterTime, setFilterTime] = useState("");

  // Fetch meetings from API
  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const response = await fetch("/api/meetings");
        const data = await response.json();
        setMeetings(data);
      } catch (error) {
        console.error("Failed to fetch meetings:", error);
      }
    };
    fetchMeetings();
  }, []);

  const openModal = (meeting) => setSelectedMeeting(meeting);
  const closeModal = () => setSelectedMeeting(null);

  // Filter meetings
  const filteredMeetings = meetings.filter((m) => {
    return (
      (filterDept ? m.department_id === parseInt(filterDept) : true) &&
      (filterDate ? m.meeting_date === filterDate : true) &&
      (filterTime ? m.meeting_time === filterTime : true)
    );
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Meetings</h1>
        <button
          onClick={() => navigate("/setup")}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Filter By:</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="">All Departments</option>
            {/* Replace with dynamic departments if available */}
            <option value="1">Engineering</option>
            <option value="2">Sales</option>
            <option value="3">Marketing</option>
          </select>

          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="p-2 border rounded"
          />

          <input
            type="time"
            value={filterTime}
            onChange={(e) => setFilterTime(e.target.value)}
            className="p-2 border rounded"
          />
        </div>
      </div>

      {/* Meeting cards */}
      {filteredMeetings.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMeetings.map((m) => (
            <div
              key={m.meeting_id}
              className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition cursor-pointer"
              onClick={() => openModal(m)}
            >
              <h2 className="text-xl font-semibold mb-2">{m.meeting_title}</h2>
              <p className="text-gray-600"><strong>Date:</strong> {m.meeting_date}</p>
              <p className="text-gray-600"><strong>Time:</strong> {m.meeting_time}</p>
              <p className="text-gray-600"><strong>Department:</strong> {m.department_id}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No meetings match your filters.</p>
      )}

      {/* Modal */}
      {selectedMeeting && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold mb-4">{selectedMeeting.meeting_title}</h2>
            <p><strong>Date:</strong> {selectedMeeting.meeting_date}</p>
            <p><strong>Time:</strong> {selectedMeeting.meeting_time}</p>
            <p><strong>Department:</strong> {selectedMeeting.department_id}</p>
            <p><strong>Location:</strong> {selectedMeeting.meeting_location}</p>
            <p><strong>Participants:</strong> {[
              selectedMeeting.meeting_mic1,
              selectedMeeting.meeting_mic2,
              selectedMeeting.meeting_mic3
            ].filter(Boolean).join(", ")}</p>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => navigate("/meetingGenerator", { state: { meetingId: selectedMeeting.meeting_id } })}
                className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

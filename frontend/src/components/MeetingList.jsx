import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function MeetingList() {
  const navigate = useNavigate();
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  // Filters
  const [filterDept, setFilterDept] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterTime, setFilterTime] = useState("");

  const meetings = [
    {
      title: "Weekly Standup",
      meetingDate: "2025-08-15",
      meetingTime: "09:00",
      department: "Engineering",
      location: "Room 201",
      participants: ["Alice", "Bob", "Charlie"],
      agenda: "Discuss weekly updates and blockers.",
    },
    {
      title: "Sales Strategy Meeting",
      meetingDate: "2025-08-20",
      meetingTime: "14:00",
      department: "Sales",
      location: "Zoom Link",
      participants: ["David", "Eve", "Frank"],
      agenda: "Plan Q3 sales targets and marketing campaigns.",
    },
    {
      title: "Marketing Brainstorm",
      meetingDate: "2025-08-20",
      meetingTime: "10:00",
      department: "Marketing",
      location: "Room 305",
      participants: ["Alice", "David"],
      agenda: "Plan new social media campaign.",
    },
  ];

  const openModal = (meeting) => setSelectedMeeting(meeting);
  const closeModal = () => setSelectedMeeting(null);

  // Filtered meetings
  const filteredMeetings = meetings.filter((m) => {
    return (
      (filterDept ? m.department === filterDept : true) &&
      (filterDate ? m.meetingDate === filterDate : true) &&
      (filterTime ? m.meetingTime === filterTime : true)
    );
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Meetings</h1>
        <button
          onClick={() => navigate("/setup")}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add
        </button>
      </div>

      {/* Filter controls */}
    <div className="mb-6">
    <h2 className="text-lg font-semibold mb-2">Filter By:</h2>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Department filter */}
        <select
        value={filterDept}
        onChange={(e) => setFilterDept(e.target.value)}
        className="p-2 border rounded"
        >
        <option value="">All Departments</option>
        <option value="Engineering">Engineering</option>
        <option value="Sales">Sales</option>
        <option value="Marketing">Marketing</option>
        </select>

        {/* Date filter */}
        <input
        type="date"
        value={filterDate}
        onChange={(e) => setFilterDate(e.target.value)}
        className="p-2 border rounded"
        />

        {/* Time filter */}
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
          {filteredMeetings.map((m, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition cursor-pointer"
              onClick={() => openModal(m)}
            >
              <h2 className="text-xl font-semibold mb-2">{m.title}</h2>
              <p className="text-gray-600">
                <span className="font-medium">Date:</span> {m.meetingDate}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Time:</span> {m.meetingTime}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Department:</span> {m.department}
              </p>
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
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>

            {/* Meeting details */}
            <h2 className="text-2xl font-bold mb-4">{selectedMeeting.title}</h2>
            <p><strong>Date:</strong> {selectedMeeting.meetingDate}</p>
            <p><strong>Time:</strong> {selectedMeeting.meetingTime}</p>
            <p><strong>Department:</strong> {selectedMeeting.department}</p>
            <p><strong>Location:</strong> {selectedMeeting.location}</p>
            <p><strong>Participants:</strong> {selectedMeeting.participants.join(", ")}</p>
            <p><strong>Agenda:</strong> {selectedMeeting.agenda}</p>

            {/* Next button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => navigate("/upload-audio")}
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

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function MeetingList() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [employees, setEmployees] = useState([]);

  // Filters
  const [filterDept, setFilterDept] = useState("");
  const [filterDate, setFilterDate] = useState("");

  // Fetch meetings
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

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch("/api/departments");
        const data = await response.json();
        setDepartments(data);
      } catch (error) {
        console.error("Failed to fetch departments:", error);
      }
    };
    fetchDepartments();
  }, []);

  //Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch("/api/employees");
        const data = await response.json();
        setEmployees(data);
      } catch (error) {
        console.error("Failed to fetch employees:", error);
      }
    };
    fetchEmployees();
  }, []);

  const getDeptName = (deptIds) => {
    if (!deptIds) return "Unknown";

    // Convert to array (handles both string like "2,3" and arrays)
    const idsArray = String(deptIds)
      .split(",")
      .map(id => id.trim());

    // Map each id to a department name
    const names = idsArray.map(id => {
      const dept = departments.find(d => String(d.department_id) === id);
      return dept ? dept.department_name : "Unknown";
    });

    return names.join(", ");
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => String(e.employee_id) === String(employeeId));
    return emp ? emp.employee_name : "Unknown";
  };

  const openModal = (meeting) => setSelectedMeeting(meeting);
  const closeModal = () => setSelectedMeeting(null);

  // Filter meetings
  const filteredMeetings = meetings.filter((m) => {
    const deptMatch = filterDept
      ? String(m.meeting_department)
          .split(",")
          .map(id => id.trim())
          .includes(String(filterDept))
      : true;

    const dateMatch = filterDate ? m.meeting_date === filterDate : true;

    return deptMatch && dateMatch;
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.department_id} value={dept.department_id}>
                {dept.department_name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
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
              <p className="text-gray-600"><strong>Department:</strong> {getDeptName(m.meeting_department)}</p>
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
            <p><strong>Department:</strong> {getDeptName(selectedMeeting.meeting_department)}</p>
            <p><strong>Location:</strong> {selectedMeeting.meeting_location}</p>
            <p><strong>Participants:</strong> {String(selectedMeeting.meeting_participant || "")
                .split(",")                      // split string into array of IDs
                .map(id => id.trim())             // remove extra spaces
                .filter(Boolean)                  // remove empty values
                .map(id => getEmployeeName(id))   // map to employee names
                .join(", ")}</p>

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

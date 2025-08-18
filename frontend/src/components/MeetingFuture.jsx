import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from './header';

export default function MeetingFuture() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [meetingFiles, setMeetingFiles] = useState([]);

  const [filterDept, setFilterDept] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterTitle, setFilterTitle] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const meetingsPerPage = 6;

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const response = await fetch("/api/meetingsFuture");
        const data = await response.json();

        // Sort meetings by date ascending (oldest → newest)
        const sortedMeetings = data.sort(
          (a, b) => new Date(a.meeting_date) - new Date(b.meeting_date)
        );

        setMeetings(sortedMeetings);
      } catch (error) {
        console.error("Failed to fetch meetings:", error);
      }
    };
    fetchMeetings();
  }, []);

  useEffect(() => {
    const fetchMeetingFiles = async () => {
      try {
        const response = await fetch("/api/view_meeting_files");
        const data = await response.json();
        setMeetingFiles(data);
      } catch (error) {
        console.error("Failed to fetch meeting files:", error);
      }
    };
    fetchMeetingFiles();
  }, []);

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

  const hasUploadedFiles = (meetingId) => {
    return meetingFiles.some(file => file.meeting === meetingId);
  };

  const getDeptName = (deptIds) => {
    if (!deptIds) return "Unknown";
    const idsArray = String(deptIds).split(",").map(id => id.trim());
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

  const filteredMeetings = meetings.filter((m) => {
    const deptMatch = filterDept
      ? String(m.meeting_department)
          .split(",")
          .map(id => id.trim())
          .includes(String(filterDept))
      : true;

    const dateMatch = filterDate ? m.meeting_date === filterDate : true;

    const titleMatch = filterTitle
      ? m.meeting_title.toLowerCase().includes(filterTitle.toLowerCase())
      : true;

    return deptMatch && dateMatch && titleMatch;
  });

  // Pagination calculations
  const indexOfLastMeeting = currentPage * meetingsPerPage;
  const indexOfFirstMeeting = indexOfLastMeeting - meetingsPerPage;
  const currentMeetings = filteredMeetings.slice(indexOfFirstMeeting, indexOfLastMeeting);
  const totalPages = Math.ceil(filteredMeetings.length / meetingsPerPage);

  return (
    <><Header />
    <div className="min-h-screen bg-gray-100 pt-12 px-4">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Future's Meetings</h1>
          {/* <button
            onClick={() => navigate("/setup")}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
          >
            + Add
          </button> */}
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
                min={new Date(Date.now() + 86400000).toISOString().split("T")[0]} // tomorrow
            />
            <input
              type="text"
              placeholder="Search by title"
              value={filterTitle}
              onChange={(e) => setFilterTitle(e.target.value)}
              className="p-2 border rounded"
            />

          </div>
        </div>

        {/* Meeting cards */}
        {currentMeetings.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentMeetings.map((m) => (
              <div
                key={m.meeting_id}
                className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition cursor-pointer"
                onClick={() => openModal(m)}
              >
                <h2 className="text-xl font-semibold mb-2">
                  <span>{m.meeting_title}</span>
                  {hasUploadedFiles(m.meeting_id) && (
                    <span className="bg-green-200 text-green-700 text-sm px-2 py-0.5 rounded-full ml-2">
                      Uploaded
                    </span>
                  )}
                </h2>
                
                <p className="text-gray-600"><strong>Date:</strong> {m.meeting_date}</p>
                <p className="text-gray-600"><strong>Time:</strong> {m.meeting_time}</p>
                <p className="text-gray-600"><strong>Department:</strong> {getDeptName(m.meeting_department)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No meetings match your filters.</p>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 rounded ${currentPage === page ? "bg-blue-600 text-white" : "bg-gray-200"}`}
              >
                {page}
              </button>
            ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
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
                  .split(",")
                  .map(id => id.trim())
                  .filter(Boolean)
                  .map(id => getEmployeeName(id))
                  .join(", ")}</p>

              <div className="mt-6 flex justify-end gap-3">
              {hasUploadedFiles(selectedMeeting.meeting_id) ? (
                <>
                  <button
                    onClick={() => navigate(`/meetingAttachments/${selectedMeeting.meeting_id}`)}
                    className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700"
                  >
                    📎 Attachment
                  </button>
                </>
              ) : (
                <button
                  onClick={() =>
                    navigate("/meetingGenerator", { state: { meetingId: selectedMeeting.meeting_id } })
                  }
                  className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700"
                >
                  Next →
                </button>
              )}
            </div>

            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

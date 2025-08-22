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
  const [currentUser, setCurrentUser] = useState(null);

  const [filterDept, setFilterDept] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterTitle, setFilterTitle] = useState("");
  const [showAll, setShowAll] = useState(false); // For manager/boss

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const meetingsPerPage = 6;

  const isMeetingOver = (meeting) => {
          if (!meeting.meeting_date || !meeting.meeting_time) return false;
          const meetingDateTime = new Date(`${meeting.meeting_date}T${meeting.meeting_time}`);
          return new Date() >= meetingDateTime;
        };

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [meetRes, deptRes, empRes, filesRes] = await Promise.all([
          fetch("/api/meetingsFuture"),
          fetch("/api/departments"),
          fetch("/api/employees"),
          fetch("/api/view_meeting_files"),
        ]);

        const meetingsData = await meetRes.json();
        const departmentsData = await deptRes.json();
        const employeesData = await empRes.json();
        const filesData = await filesRes.json();

        setMeetings(meetingsData);
        setDepartments(departmentsData);
        setEmployees(employeesData);
        setMeetingFiles(filesData);

        const userEmail = localStorage.getItem("user_email");
        if (userEmail) {
          const emp = employeesData.find((e) => e.email === userEmail);
          if (emp) setCurrentUser(emp);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };

    fetchData();
  }, []);

  // Set manager default department filter
  useEffect(() => {
    if (currentUser?.role === "manager") {
      setFilterDept(currentUser.department_id);
    }
  }, [currentUser]);

  const hasUploadedFiles = (meetingId) => {
    return meetingFiles.some(file => file.meeting === meetingId);
  };

  const getDeptName = (deptIds) => {
    if (!deptIds) return "Unknown";
    return String(deptIds)
      .split(",")
      .map((id) => departments.find((d) => String(d.department_id) === id.trim())?.department_name || "Unknown")
      .join(", ");
  };

  const getEmployeeInfo = (employeeId) => {
    const emp = employees.find((e) => String(e.employee_id) === String(employeeId));
    if (!emp) return `Unknown (ID: ${employeeId})`;
    const deptName = departments.find((d) => String(d.department_id) === String(emp.department_id))?.department_name || emp.department_id;
    return `${emp.employee_name} (${deptName})`;
  };

  const filteredMeetings = meetings.filter((m) => {
    if (!currentUser) return false;

    const participantIds = String(m.meeting_participant || "").split(",").map(id => id.trim());
    const meetingDeptIds = String(m.meeting_department || "").split(",").map(id => id.trim());

    // EMPLOYEE: always only their own meetings
    if (currentUser.role === "employee") {
      if (!participantIds.includes(String(currentUser.employee_id))) return false;
    }

    // MANAGER / BOSS
    if (currentUser.role === "manager") {
      if (!showAll) {
        if (!participantIds.includes(String(currentUser.employee_id))) return false;
      } else {
        if (!meetingDeptIds.includes(String(currentUser.department_id))) return false;
      }
    }

    if (currentUser.role === "boss") {
      if (!showAll) {
        if (!participantIds.includes(String(currentUser.employee_id))) return false;
      }
    }

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
    <>
      <Header />
      <div className="min-h-screen bg-gray-100 pt-12 px-4">
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Future's Meetings</h1>
          </div>

          {/* Filters */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Filter By:</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(currentUser?.role === "manager" || currentUser?.role === "boss") && (
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="p-2 border rounded"
                  disabled={currentUser?.role === "manager"} // disable for manager
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept.department_id} value={dept.department_id}>
                      {dept.department_name}
                    </option>
                  ))}
                </select>
              )}

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
            {(currentUser?.role === "manager" || currentUser?.role === "boss") && (
              <div className="mt-3">
                <button
                  onClick={() => setShowAll(prev => !prev)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {showAll ? "Show Mine" : "Show All"}
                </button>
              </div>
            )}
          </div>

          {/* Meeting cards */}
          {currentMeetings.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentMeetings.map((m) => (
                <div
                  key={m.meeting_id}
                  className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition cursor-pointer"
                  onClick={() => setSelectedMeeting(m)}
                >
                  <h2 className="text-xl font-semibold mb-2">
                    {m.meeting_title}
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
                  onClick={() => setSelectedMeeting(null)}
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
                  .map(id => getEmployeeInfo(id))
                  .join(", ")}</p>

                <div className="mt-6 flex justify-end gap-3">
                {isMeetingOver(selectedMeeting) && (
                  hasUploadedFiles(selectedMeeting.meeting_id) ? (
                    <button
                      onClick={() => navigate(`/meetingAttachments/${selectedMeeting.meeting_id}`)}
                      className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700"
                    >
                      📎 Attachment
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate("/meetingGenerator", { state: { meetingId: selectedMeeting.meeting_id } })}
                      className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700"
                    >
                      Upload Audios →
                    </button>
                  )
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

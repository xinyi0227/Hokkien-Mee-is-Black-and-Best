import { useEffect, useState } from "react";
import Header from "./header";
import { useNavigate } from "react-router-dom";
import Select from "react-select";

export default function ComplaintList() {
  const [complaints, setComplaints] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [filters, setFilters] = useState({
    departments: [],
    handledBy: [],
    status: "",
    complaintDate: "",
  });
  const [selectedComplaint, setSelectedComplaint] = useState(null); // For modal
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const complaintsPerPage = 10;

  const [viewMine, setViewMine] = useState(true);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [complaintsRes, employeesRes, departmentsRes] = await Promise.all([
          fetch("/api/complaintList"),
          fetch("/api/employees"),
          fetch("/api/departments"),
        ]);
        setComplaints(await complaintsRes.json());
        setEmployees(await employeesRes.json());
        setDepartments(await departmentsRes.json());
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Set current user
  useEffect(() => {
    const userEmail = localStorage.getItem("user_email");
    if (userEmail && employees.length > 0) {
      const emp = employees.find((e) => e.email === userEmail);
      if (emp) setCurrentUser(emp);
    }
  }, [employees]);

  const getEmployeeInfo = (employeeId) => {
    const emp = employees.find((e) => String(e.employee_id) === String(employeeId));
    if (!emp) return `Unknown (ID: ${employeeId})`;
    const dept = departments.find((d) => String(d.department_id) === String(emp.department_id));
    return `${emp.employee_name} (${dept ? dept.department_name : emp.department_id})`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "In Progress":
        return <span className="px-2 py-1 rounded bg-yellow-300 text-yellow-800">{status}</span>;
      case "Pending":
        return <span className="px-2 py-1 rounded bg-orange-300 text-orange-800">{status}</span>;
      case "Resolved":
        return <span className="px-2 py-1 rounded bg-green-300 text-green-800">{status}</span>;
      default:
        return <span className="px-2 py-1 rounded bg-gray-200 text-gray-800">Unknown</span>;
    }
  };

  const handleFilterChange = (e) => {
    const { name, value, selectedOptions, type } = e.target;
    if (type === "select-multiple") {
      const values = Array.from(selectedOptions).map((opt) => opt.value);
      setFilters({ ...filters, [name]: values });
    } else {
      setFilters({ ...filters, [name]: value });
    }
  };

  const filterComplaints = (c) => {
  if (!currentUser) return false;

  const empId = String(c.employee || c.employee_id);
  const complaintEmp = employees.find((e) => String(e.employee_id) === empId);
  if (!complaintEmp) return false;

  if (currentUser.role === "employee") {
    // Employee sees only their own
    if (String(complaintEmp.employee_id) !== String(currentUser.employee_id)) return false;
  } else if (currentUser.role === "manager") {
    if (viewMine) {
      // Show only self
      if (String(complaintEmp.employee_id) !== String(currentUser.employee_id)) return false;
    } else {
      // Show all in department
      if (String(complaintEmp.department_id) !== String(currentUser.department_id)) return false;
    }
  } // Boss: ignore viewMine, can see all
  else if (currentUser.role === "boss") {
    // Boss can see everything, optionally "Show Mine" can filter their own
    if (viewMine && String(complaintEmp.employee_id) !== String(currentUser.employee_id)) return false;
  }

  // Filters
  if (filters.departments.length > 0 && !filters.departments.map(String).includes(String(complaintEmp.department_id))) return false;
  if (filters.handledBy.length > 0 && !filters.handledBy.map(String).includes(String(complaintEmp.employee_id))) return false;
  if (filters.status && c.status !== filters.status) return false;
  if (filters.complaintDate) {
    const complaintDate = new Date(c.complaint_date).toDateString();
    const selectedDate = new Date(filters.complaintDate).toDateString();
    if (complaintDate !== selectedDate) return false;
  }

  return true;
};

  const displayedComplaints = currentUser ? complaints.filter(filterComplaints) : [];

  const getFilteredEmployees = () => {
    if (!currentUser) return [];
    if (currentUser.role === "boss") return employees;
    if (currentUser.role === "manager")
      return employees.filter((e) => String(e.department_id) === String(currentUser.department_id));
    return [];
  };

  // Pagination calculations
  const indexOfLastComplaint = currentPage * complaintsPerPage;
  const indexOfFirstComplaint = indexOfLastComplaint - complaintsPerPage;
  const currentComplaints = displayedComplaints.slice(indexOfFirstComplaint, indexOfLastComplaint);
  const totalPages = Math.ceil(displayedComplaints.length / complaintsPerPage);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-100 pt-12 px-4">
        <div className="max-w-7xl mx-auto bg-white p-8 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Customer Complaints</h1>
            <button
              onClick={() => navigate("/complaintUpload")}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              + Add Complaint
            </button>
          </div>

          {currentUser && (currentUser.role === "manager" || currentUser.role === "boss") && (
            <div className="mb-4 flex gap-2">
              <button
                className={`px-3 py-1 rounded ${viewMine ? "bg-blue-600 text-white" : "bg-gray-200"}`}
                onClick={() => setViewMine(true)}
              >
                Show Mine
              </button>
              <button
                className={`px-3 py-1 rounded ${!viewMine ? "bg-blue-600 text-white" : "bg-gray-200"}`}
                onClick={() => setViewMine(false)}
              >
                Show All
              </button>
            </div>
          )}

          {/* Filter Section */}
          {currentUser && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Filter By:</h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {/* Department Filter */}
                {(currentUser.role === "boss" || currentUser.role === "manager") && (
                  <div className="w-64">
                    <Select
                      isMulti
                      name="departments"
                      options={
                        currentUser.role === "boss"
                          ? departments.map(d => ({ value: d.department_id, label: d.department_name }))
                          : departments
                            .filter(d => String(d.department_id) === String(currentUser.department_id))
                            .map(d => ({ value: d.department_id, label: d.department_name }))
                      }
                      value={filters.departments
                        .map(depId => {
                          const d = departments.find(d => String(d.department_id) === String(depId));
                          return d ? { value: d.department_id, label: d.department_name } : null;
                        })
                        .filter(Boolean) // remove nulls
                      }
                      onChange={(selectedOptions) =>
                        setFilters({
                          ...filters,
                          departments: selectedOptions ? selectedOptions.map(opt => opt.value) : [],
                        })
                      }
                      placeholder="Select Departments"
                      isSearchable
                    />
                  </div>
                )}

                {/* Handled By Filter */}
                {(currentUser.role === "boss" || currentUser.role === "manager") && (
                  <div className="w-64">
                    <Select
                      isMulti
                      name="handledBy"
                      options={getFilteredEmployees().map(e => ({ value: e.employee_id, label: e.employee_name }))}
                      value={filters.handledBy
                        .map(empId => {
                          const e = employees.find(e => String(e.employee_id) === String(empId));
                          return e ? { value: e.employee_id, label: e.employee_name } : null;
                        })
                        .filter(Boolean) // remove nulls
                      }
                      onChange={(selectedOptions) =>
                        setFilters({
                          ...filters,
                          handledBy: selectedOptions ? selectedOptions.map(opt => opt.value) : [],
                        })
                      }
                      placeholder="Select Employees"
                      isSearchable
                    />
                  </div>
                )}

                {/* Status Filter */}
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="border px-2 py-1 rounded"
                >
                  <option value="">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>

                {/* Date Filter */}
                <input
                  type="date"
                  name="complaintDate"
                  value={filters.complaintDate}
                  onChange={handleFilterChange}
                  className="border px-2 py-1 rounded"
                />
              </div>
            </div>
          )}

          {/* Complaint Table */}
          {loading ? (
            <p className="text-gray-500">Loading complaints...</p>
          ) : displayedComplaints.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 border">No</th>
                    <th className="px-4 py-2 border">Complaint Date</th>
                    <th className="px-4 py-2 border">Handled By</th>
                    <th className="px-4 py-2 border">Customer Name</th>
                    <th className="px-4 py-2 border">Customer Contact</th>
                    <th className="px-4 py-2 border">Summary</th>
                    <th className="px-4 py-2 border">Status</th>
                    <th className="px-4 py-2 border">More</th>
                  </tr>
                </thead>
                <tbody>
                  {currentComplaints.map((c, index) => (
                    <tr key={c.complaint_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 border">{indexOfFirstComplaint + index + 1}</td>
                      <td className="px-4 py-2 border">{c.complaint_date}</td>
                      <td className="px-4 py-2 border">{getEmployeeInfo(c.employee)}</td>
                      <td className="px-4 py-2 border">{c.customer_name}</td>
                      <td className="px-4 py-2 border">{c.customer_contact}</td>
                      <td className="px-4 py-2 border max-w-xs">
                        {c.complaint_summary.length > 100 ? (
                          <span title={c.complaint_summary}>
                            {c.complaint_summary.substring(0, 100)}...
                          </span>
                        ) : (
                          c.complaint_summary
                        )}
                      </td>
                      <td className="px-4 py-2 border">{getStatusBadge(c.status)}</td>
                      <td className="px-4 py-2 border text-center">
                        <button
                          onClick={() => setSelectedComplaint(c)}
                          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No complaints found.</p>
          )}
        </div>

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
        {selectedComplaint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white w-full max-w-2xl p-6 rounded-xl shadow-xl relative">
              {/* Close Button */}
              <button
                onClick={() => setSelectedComplaint(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl font-bold"
              >
                &times;
              </button>

              {/* Edit Button */}
              <button
                onClick={() => navigate(`/complaintDetails/${selectedComplaint.complaint_id}`)}
                className="absolute top-4 right-16 bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
              >
                Edit
              </button>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Complaint Details</h2>
              <div className="space-y-3 text-gray-700">
                <p><strong>Date:</strong> {selectedComplaint.complaint_date}</p>
                <p><strong>Handled By:</strong> {getEmployeeInfo(selectedComplaint.employee)}</p>
                <p><strong>Customer:</strong> {selectedComplaint.customer_name}</p>
                <p><strong>Contact:</strong> {selectedComplaint.customer_contact}</p>
                <p><strong>Summary:</strong> {selectedComplaint.complaint_summary}</p>
                <p><strong>Solution:</strong> {selectedComplaint.solution || "N/A"}</p>
                <p><strong>Status:</strong> {getStatusBadge(selectedComplaint.status)}</p>

                {selectedComplaint.complaint_audio && (
                  <div className="mt-4">
                    <p className="font-semibold">Audio Recording:</p>
                    <audio
                      id="complaintAudio"
                      controls
                      className="w-full rounded border border-gray-300"
                      src={selectedComplaint.complaint_audio}
                    >
                      Your browser does not support the audio element.
                    </audio>

                    {/* Custom clickable progress bar */}
                    <div
                      className="h-2 bg-gray-200 rounded mt-2 cursor-pointer"
                      onClick={(e) => {
                        const audio = document.getElementById("complaintAudio");
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left; // where user clicked
                        const width = rect.width;
                        const percent = clickX / width;
                        audio.currentTime = percent * audio.duration;
                        audio.play();
                      }}
                    >
                      <div className="h-2 bg-blue-600 rounded" style={{ width: `${(document.getElementById("complaintAudio")?.currentTime || 0) / (document.getElementById("complaintAudio")?.duration || 1) * 100}%` }}></div>
                    </div>
                  </div>
                )}


                {selectedComplaint.complaint_transcript && (
                  <div className="mt-4 bg-gray-50 p-4 rounded border border-gray-200">
                    <p className="font-semibold mb-2">Transcript:</p>
                    <p className="whitespace-pre-wrap">{selectedComplaint.complaint_transcript}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

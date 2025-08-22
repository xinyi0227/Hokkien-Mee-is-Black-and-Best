import { useEffect, useState } from "react";
import Header from "./header";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import jsPDF from "jspdf";

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

  const downloadPDF = (complaint) => {
    if (!complaint) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let currentY = 30;

    // Add company header with logo and information
    const addHeader = () => {
      // Company logo (replace with actual logo path)
      // const img = new Image();
      // img.src = '/path/to/company-logo.png';
      // doc.addImage(img, 'PNG', margin, 15, 40, 15);

      // Company info
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text("Company Name Inc.", margin, 15);
      doc.text("123 Business Avenue", margin, 20);
      doc.text("New York, NY 10001", margin, 25);

      // Report title
      doc.setFontSize(18);
      doc.setTextColor(60, 90, 150);
      doc.setFont("helvetica", "bold");
      doc.text("COMPLAINT REPORT", pageWidth / 2, 25, { align: "center" });

      // Horizontal line
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(margin, 35, pageWidth - margin, 35);

      currentY = 45;
    };

    // Add footer with page numbers and generation info
    const addFooter = () => {
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, 285);
      doc.text(`Page 1 of 1`, pageWidth / 2, 285, { align: "center" });
      doc.text("Confidential - For internal use only", pageWidth - margin, 285, { align: "right" });
    };

    // Create a section with title and content
    const addSection = (title, content, isMultiLine = false) => {
      // Section title
      doc.setFontSize(12);
      doc.setTextColor(60, 90, 150);
      doc.setFont("helvetica", "bold");
      doc.text(title, margin, currentY);
      currentY += 7;

      // Section content
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);
      doc.setFont("helvetica", "normal");

      if (isMultiLine) {
        const lines = doc.splitTextToSize(content, contentWidth);
        doc.text(lines, margin, currentY);
        currentY += lines.length * 6 + 5;
      } else {
        doc.text(content, margin, currentY);
        currentY += 8;
      }

      currentY += 5; // Extra spacing after section
    };

    // Create a two-column section
    const addTwoColumnSection = (leftTitle, leftContent, rightTitle, rightContent) => {
      const colWidth = contentWidth / 2;

      // Left column
      doc.setFontSize(11);
      doc.setTextColor(60, 90, 150);
      doc.setFont("helvetica", "bold");
      doc.text(leftTitle, margin, currentY);
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.setFont("helvetica", "normal");
      doc.text(leftContent, margin, currentY + 6);

      // Right column
      doc.setFontSize(11);
      doc.setTextColor(60, 90, 150);
      doc.setFont("helvetica", "bold");
      doc.text(rightTitle, margin + colWidth, currentY);
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.setFont("helvetica", "normal");
      doc.text(rightContent, margin + colWidth, currentY + 6);

      currentY += 15;
    };

    // Create a status badge
    const addStatusBadge = (status) => {
      let color;
      switch (status.toLowerCase()) {
        case 'resolved': color = [76, 175, 80]; break; // Green
        case 'in progress': color = [33, 150, 243]; break; // Blue
        case 'pending': color = [255, 193, 7]; break; // Amber
        case 'rejected': color = [244, 67, 54]; break; // Red
        default: color = [158, 158, 158]; // Gray
      }

      doc.setFillColor(...color);
      doc.setDrawColor(...color);
      doc.roundedRect(pageWidth - margin - 30, currentY - 7, 30, 8, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(status.toUpperCase(), pageWidth - margin - 15, currentY - 2, { align: "center" });
      doc.setTextColor(80, 80, 80);
    };

    // Start building the PDF
    addHeader();

    // Complaint ID with status badge
    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "bold");
    doc.text(`Complaint #${complaint.complaint_id}`, margin, currentY);
    addStatusBadge(complaint.status);
    currentY += 15;

    // Basic information in two columns
    addTwoColumnSection("Date Filed:", complaint.complaint_date, "Handled By:", getEmployeeInfo(complaint.employee));
    addTwoColumnSection("Customer:", complaint.customer_name, "Contact:", complaint.customer_contact);

    // Summary section
    addSection("Complaint Summary:", complaint.complaint_summary, true);

    // Solution section
    addSection("Solution Provided:", complaint.solution || "No solution provided yet.", true);

    // Add a notes section if needed
    if (complaint.notes) {
      addSection("Additional Notes:", complaint.notes, true);
    }

    // Add signature lines if resolved
    if (complaint.status.toLowerCase() === 'resolved') {
      currentY += 10;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, currentY, margin + 80, currentY);
      doc.line(pageWidth - margin - 80, currentY, pageWidth - margin, currentY);
      currentY += 5;
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("Customer Signature", margin, currentY);
      doc.text("Company Representative", pageWidth - margin - 80, currentY);
    }

    // Add footer
    addFooter();

    // Save the PDF
    doc.save(`Complaint_Report_${complaint.complaint_id}.pdf`);
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
                {/* Edit Button */}
                <button
                  onClick={() => navigate(`/complaintDetails/${selectedComplaint.complaint_id}`)}
                  className="absolute top-4 right-16 bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
                >
                  Edit
                </button>


                <button
                  onClick={() => downloadPDF(selectedComplaint)}
                  className="absolute top-4 right-32 bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
                >
                  Download as PDF
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

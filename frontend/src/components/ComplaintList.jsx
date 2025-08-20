import { useEffect, useState } from "react";
import Header from "./header";
import { useNavigate } from "react-router-dom";

export default function ComplaintList() {
  const [complaints, setComplaints] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [complaintsRes, employeesRes] = await Promise.all([
          fetch("/api/complaintList"),
          fetch("/api/employees"),
        ]);
        const complaintsData = await complaintsRes.json();
        const employeesData = await employeesRes.json();

        setComplaints(complaintsData);
        setEmployees(employeesData);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getEmployeeName = (employeeId) => {
    if (employees.length === 0) return "Loading...";
    const emp = employees.find(e => String(e.employee_id) === String(employeeId));
    return emp ? emp.employee_name : `Unknown (ID: ${employeeId})`;
  };

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

          {loading ? (
            <p className="text-gray-500">Loading complaints...</p>
          ) : complaints.length > 0 ? (
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
                  {complaints.map((c, index) => (
                    <tr key={c.complaint_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 border">{index + 1}</td>
                      <td className="px-4 py-2 border">{c.complaint_date}</td>
                      <td className="px-4 py-2 border">{getEmployeeName(c.employee)}</td>
                      <td className="px-4 py-2 border">{c.customer_name}</td>
                      <td className="px-4 py-2 border">{c.customer_contact}</td>
                      <td className="px-4 py-2 border">{c.complaint_summary}</td>
                      <td className="px-4 py-2 border">{c.status}</td>
                      <td className="px-4 py-2 border text-center">
                        <button
                          onClick={() =>
                            window.open(`/complaints/${c.complaint_id}`, "_blank")
                          }
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
      </div>
    </>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import Header from "./header";

export default function ComplaintUpload() {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [complaintDate, setComplaintDate] = useState("");
    const [employeeId, setEmployeeId] = useState(null);
    const [customerName, setCustomerName] = useState("");
    const [customerContact, setCustomerContact] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [complaintAudio, setComplaintAudio] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const response = await fetch("/api/employees");
                const data = await response.json();
                setEmployees(data);
            } catch (err) {
                console.error("Failed to fetch employees:", err);
            }
        };

        const fetchDepartments = async () => {
            try {
                const response = await fetch("/api/departments");
                const data = await response.json();
                setDepartments(data);
            } catch (error) {
                console.error("Failed to fetch departments:", error);
            }
        };

        fetchEmployees();
        fetchDepartments();
    }, []);

    useEffect(() => {
        const userEmail = localStorage.getItem("user_email");
        if (userEmail && employees.length > 0) {
            const emp = employees.find((e) => e.email === userEmail);
            if (emp) {
                setCurrentUser(emp);
                setEmployeeId({
                    value: emp.employee_id,
                    label: `${emp.employee_name} (${getDeptName(emp.department_id)})`
                });
            }
        }
    }, [employees]);

    const getEmployeeInfo = (employeeId) => {
        const emp = employees.find((e) => String(e.employee_id) === String(employeeId));
        if (!emp) return `Unknown (ID: ${employeeId})`;
        const dept = departments.find((d) => String(d.department_id) === String(emp.department_id));
        return `${emp.employee_name} (${dept ? dept.department_name : emp.department_id})`;
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


    const handleComplaintAudioChange = (e) => {
        setComplaintAudio(e.target.files[0]); // store the selected file
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Clear previous errors
        setError("");
        setFieldErrors({});

        if (!complaintDate || !employeeId || !complaintAudio || !customerName || !customerContact) {
            setError("All fields are required.");
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append("complaint_date", complaintDate);
            formData.append("employee_id", employeeId.value);
            formData.append("complaint_audio", complaintAudio);  // Match your serializer field name
            formData.append("customer_name", customerName);
            formData.append("customer_contact", customerContact);

            // Fixed URL to match your Django URL pattern
            const response = await fetch("http://localhost:8000/api/complaint-upload/", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle DRF validation errors
                if (data) {
                    const fieldErrors = {};
                    Object.keys(data).forEach(key => {
                        if (Array.isArray(data[key])) {
                            fieldErrors[key] = data[key];
                        }
                    });
                    setFieldErrors(fieldErrors);
                    setError(data.non_field_errors ? data.non_field_errors.join(", ") : "Upload failed");
                } else {
                    setError("Upload failed");
                }
                return;
            }

            console.log("Complaint uploaded:", data);
            navigate("/complaintList");
        } catch (err) {
            console.error(err);
            setError("Failed to upload complaint.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Header />
            <div className="min-h-screen bg-gray-100 pt-12 px-4">
                <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-lg">
                    <h1 className="text-2xl font-bold mb-6">Upload Customer Complaint</h1>

                    {error && <p className="text-red-600 mb-4">{error}</p>}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Complaint Date */}
                        <div>
                            <label className="block font-medium mb-1">Complaint Date</label>
                            <input
                                type="date"
                                value={complaintDate}
                                onChange={(e) => setComplaintDate(e.target.value)}
                                className="p-2 border rounded w-full"
                                max={new Date().toISOString().split("T")[0]}
                                required
                            />
                            {fieldErrors.complaint_date && (
                                <p className="text-red-600 mt-1">{fieldErrors.complaint_date.join(", ")}</p>
                            )}
                        </div>

                        {/* Employee (Searchable Select) */}
                        <div>
                            <label className="block font-medium mb-1">Handled By</label>
                            <input
                                type="text"
                                value={employeeId ? employeeId.label : ""}
                                className="p-2 border rounded w-full bg-gray-100"
                                disabled
                            />
                        </div>

                        {/* Customer Name */}
                        <div>
                            <label className="block font-medium mb-1">Customer Name</label>
                            <input
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                className="p-2 border rounded w-full"
                                required
                            />
                            {fieldErrors.customer_name && (
                                <p className="text-red-600 mt-1">{fieldErrors.customer_name.join(", ")}</p>
                            )}
                        </div>

                        {/* Customer Contact */}
                        <div>
                            <label className="block font-medium mb-1">Customer Contact</label>
                            <input
                                type="text"
                                value={customerContact}
                                onChange={(e) => setCustomerContact(e.target.value)}
                                className="p-2 border rounded w-full"
                                required
                            />
                            {fieldErrors.customer_contact && (
                                <p className="text-red-600 mt-1">{fieldErrors.customer_contact.join(", ")}</p>
                            )}
                        </div>

                        {/* File Upload */}
                        <div>
                            <label className="block font-medium mb-1">Upload Audio File</label>
                            <input
                                type="file"
                                accept="audio/*"
                                onChange={handleComplaintAudioChange}
                                className="w-full"
                                required
                            />
                            {fieldErrors.complaint_audio && (
                                <p className="text-red-600 mt-1">{fieldErrors.complaint_audio.join(", ")}</p>
                            )}
                        </div>

                        {/* Submit */}
                        <div className="flex justify-end gap-4">
                            <button
                                type="button"
                                onClick={() => navigate("/complaintList")}
                                className="bg-gray-500 text-white px-5 py-2 rounded-lg hover:bg-gray-600"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? "Uploading..." : "Upload Complaint"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
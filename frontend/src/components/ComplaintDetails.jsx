import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "./header";

export default function ComplaintDetails() {
    const { complaint_id } = useParams();
    const navigate = useNavigate();

    const [complaint, setComplaint] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        customer_name: "",
        customer_contact: "",
        complaint_summary: "",
        solution: "",
        status: "",
        employee_id: "",
        complaint_transcript: "",
    });
    const [aiLoading, setAiLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [complaintRes, employeesRes, departmentsRes] = await Promise.all([
                    fetch(`/api/complaintDetails/${complaint_id}`),
                    fetch("/api/employees"),
                    fetch("/api/departments"),
                ]);

                const complaintData = await complaintRes.json();
                setComplaint(complaintData);

                setFormData({
                    customer_name: complaintData.customer_name,
                    customer_contact: complaintData.customer_contact,
                    solution: complaintData.solution || "",
                    complaint_summary: complaintData.complaint_summary,
                    status: complaintData.status,
                    employee_id: complaintData.employee_id,
                    complaint_transcript: complaintData.complaint_transcript,
                });

                setEmployees(await employeesRes.json());
                setDepartments(await departmentsRes.json());
            } catch (err) {
                console.error("Failed to fetch data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [complaint_id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const updatedFields = {};

            Object.keys(formData).forEach((key) => {
                let value = formData[key];

                // Treat empty strings as null
                if (value === "") {
                    value = null;
                }

                // Only include if changed
                if (value !== complaint[key]) {
                    updatedFields[key] = value;
                }
            });

            if (Object.keys(updatedFields).length === 0) {
                alert("No changes detected!");
                return;
            }

            const res = await fetch(`/api/complaintDetails/${complaint_id}/`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedFields),
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error("Update failed:", errorText);
                alert("Failed to update complaint. Check console for details.");
                return;
            }

            const updatedComplaint = await res.json();

            setComplaint(updatedComplaint);
            setFormData({
                customer_name: updatedComplaint.customer_name || "",
                customer_contact: updatedComplaint.customer_contact || "",
                solution: updatedComplaint.solution || "",
                complaint_summary: updatedComplaint.complaint_summary || "",
                status: updatedComplaint.status || "",
                employee_id: updatedComplaint.employee_id || "",
                complaint_transcript: updatedComplaint.complaint_transcript || "",
            });

            alert("Complaint updated successfully!");
        } catch (err) {
            console.error("Error submitting update:", err);
            alert("An unexpected error occurred.");
        }
    };

    const handleGenerateAI = async () => {
        setAiLoading(true);
        try {
            const res = await fetch(`/api/complaintDetails/${complaint_id}/generate_ai_summary/`, {
                method: "POST",
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error("AI generation failed:", errorText);
                alert("Failed to generate AI summary. Check console.");
                return;
            }

            const data = await res.json();
            setFormData(prev => ({
                ...prev,
                complaint_summary: data.ai_summary,
                solution: data.ai_solution,
            }));

            alert("AI summary and solution generated!");
            window.location.reload();
        } catch (err) {
            console.error("Error generating AI:", err);
            alert("Unexpected error during AI generation.");
        } finally {
            setAiLoading(false);
        }
    };


    const getEmployeeName = (empId) => {
        const emp = employees.find(e => String(e.employee_id) === String(empId));
        return emp ? emp.employee_name : "Unknown";
    };

    if (loading) return <p className="text-gray-500 p-4">Loading...</p>;

    return (
        <>
            <Header />
            <main className="min-h-screen pt-2 px-4 bg-gray-50 dark:bg-gray-950">
                <div className="max-w-7xl mx-auto p-8 rounded-lg shadow-lg dark:bg-dark-800 dark:text-gray-200">
                   <h1 className="text-2xl font-bold mb-4">Complaint Details</h1>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div>
                            <label className="block mb-1">Complaint ID</label>
                            <input
                                value={complaint.complaint_id}
                                disabled
                                className="border px-2 py-1 rounded w-full bg-gray-100 dark:bg-gray-900 dark:text-gray-200"
                            />
                        </div>

                        <div>
                            <label className="block mb-1">Date</label>
                            <input
                                value={complaint.complaint_date}
                                disabled
                                className="border px-2 py-1 rounded w-full bg-gray-100 dark:bg-gray-900 dark:text-gray-200"
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block mb-1">Handled By</label>
                                <select
                                    name="employee_id"
                                    value={formData.employee_id}
                                    onChange={handleChange}
                                    className="border px-2 py-1 rounded w-full dark:bg-gray-900 dark:text-gray-200"
                                >
                                    {employees.map(e => (
                                        <option key={e.employee_id} value={e.employee_id}>
                                            {e.employee_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex-1">
                                <label className="block mb-1">Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="border px-2 py-1 rounded w-full dark:bg-gray-900 dark:text-gray-200"
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Resolved">Resolved</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block mb-1">Customer Name</label>
                                <input
                                    name="customer_name"
                                    value={formData.customer_name}
                                    onChange={handleChange}
                                    className="border px-2 py-1 rounded w-full dark:bg-gray-900 dark:text-gray-200"
                                />
                            </div>

                            <div className="flex-1">
                                <label className="block mb-1">Customer Contact</label>
                                <input
                                    name="customer_contact"
                                    value={formData.customer_contact}
                                    onChange={handleChange}
                                    className="border px-2 py-1 rounded w-full dark:bg-gray-900 dark:text-gray-200"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block mb-1">Solution</label>
                            <textarea
                                name="solution"
                                value={formData.solution}
                                onChange={handleChange}
                                className="border px-2 py-1 rounded w-full dark:bg-gray-900 dark:text-gray-200"
                            />
                        </div>

                        <div>
                            <label className="block mb-1">Summary</label>
                            <textarea
                                name="complaint_summary"
                                value={formData.complaint_summary}
                                onChange={handleChange}
                                className="border px-2 py-1 rounded w-full dark:bg-gray-900 dark:text-gray-200"
                            />
                        </div>

                        {complaint.complaint_audio && (
                            <div>
                                <label className="block mb-1">Audio Recording</label>
                                <audio controls className="w-full rounded border border-gray-300 dark:bg-gray-900 dark:text-gray-200" src={complaint.complaint_audio} />
                            </div>
                        )}

                        <div>
                            <label className="block mb-1">Transcript</label>
                            <textarea
                                name="complaint_transcript"
                                value={formData.complaint_transcript}
                                onChange={handleChange}
                                className="border px-2 py-1 rounded w-full dark:bg-gray-900 dark:text-gray-200"
                                rows={6}
                            />
                        </div>
                        <div className="flex justify-between mt-4">
                            {/* Left side: Generate button */}
                            <button
                                type="button"
                                onClick={handleGenerateAI}
                                disabled={aiLoading}
                                className={`px-4 py-2 rounded text-white ${aiLoading ? "bg-[#1985a1] cursor-not-allowed" : "bg-[#1985a1] hover:bg-[#89c2d9]"
                                    }`}
                            >
                                {aiLoading ? "Generating..." : "Generate AI Summary"}
                            </button>


                            {/* Right side: Save + Back */}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => window.location.href = "/complaintList"}
                                    className="bg-gray-300 text-white px-4 py-2 rounded hover:bg-gray-400"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    className="bg-[#aad576] text-white px-4 py-2 rounded hover:bg-[#c1fba4]"
                                >
                                    Save
                                </button>
                            </div>
                        </div>


                    </form>
                </div>
            </main>
        </>
    );
}

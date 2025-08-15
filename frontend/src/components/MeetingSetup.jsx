import { useState, useEffect, useRef } from "react";
import axios from "axios";

// Multi-select dropdown component
function MultiSelectDropdown({ options, selectedOptions, setSelectedOptions, label, labelKey, idKey }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toggle individual option
  const toggleOption = (option) => {
    const id = option[idKey];
    setSelectedOptions(prev =>
      prev.some(o => o[idKey] === id)
        ? prev.filter(o => o[idKey] !== id)
        : [...prev, option]
    );
  };

  // Check if all options are selected
  const allSelected = options.length > 0 && options.every(opt =>
    selectedOptions.some(sel => sel[idKey] === opt[idKey])
  );

  return (
    <div className="mb-4 relative" ref={ref}>
      <label className="block font-semibold mb-2">{label}</label>
      <div
        className="border rounded p-2 cursor-pointer flex justify-between items-center"
        onClick={() => setOpen(!open)}
      >
        <span>
          {selectedOptions.length
            ? selectedOptions.map(o => o[labelKey]?.trim() ?? "").join(", ")
            : `Select ${label}`}
        </span>
        <span className="ml-2">{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div className="absolute mt-1 w-full bg-white border rounded shadow-lg max-h-40 overflow-y-auto z-10">
          {/* Select All */}
          <label className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSelectedOptions(allSelected ? [] : [...options])}
            />
            Select All
          </label>

          {/* Individual options */}
          {options.map(option => {
            const id = option[idKey];
            const isChecked = selectedOptions.some(sel => sel[idKey] === id);
            return (
              <label
                key={id}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleOption(option)}
                />
                {option[labelKey]?.trim() ?? ""}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Meeting setup component
function MeetingSetup({ onSetupComplete }) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [departments, setDepartments] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [location, setLocation] = useState("");
  const [micAssignments, setMicAssignments] = useState({ mic1: "", mic2: "", mic3: "" });

  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [availablePeople, setAvailablePeople] = useState([]);

  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);
  const isToday = meetingDate === today;

  // Fetch departments and employees
  useEffect(() => {
    axios.get(`http://localhost:8000/api/departments/`)
      .then(res => setAvailableDepartments(res.data))
      .catch(err => console.error("Error fetching departments:", err));

    axios.get(`http://localhost:8000/api/employees/`)
      .then(res => setAvailablePeople(res.data))
      .catch(err => console.error("Error fetching employees:", err));
  }, []);

  // Filter participants based on selected departments
  useEffect(() => {
    setParticipants(prev =>
      prev.filter(p =>
        departments.some(dept => dept.department_id === p.department_id)
      )
    );
  }, [departments]);

  const handleMicChange = (mic, value) => {
    setMicAssignments(prev => ({ ...prev, [mic]: value }));
  };

  const nextStep = () => {
    if (!title || !meetingDate || !meetingTime) {
      alert("Please fill all required fields in Step 1");
      return;
    }
    setStep(2);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (departments.length === 0 || participants.length === 0) {
      alert("Please fill all required fields in Step 2");
      return;
    }

    onSetupComplete({
      title,
      meetingDate,
      meetingTime,
      departments: departments.map(d => d.department_id),
      participants: participants.map(p => p.employee_id),
      location,
      micAssignments
    });
  };

  // Filter participants dynamically for dropdown
  const filteredParticipants = availablePeople.filter(person =>
    departments.some(dept => Number(dept.department_id) === Number(person.department_id))
  );

  return (
    <div className="min-h-screen bg-gray-100 pt-12 px-4">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">

        {/* Step 1: Basic Details */}
        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); nextStep(); }}>
            <h1 className="text-2xl font-bold mb-6 text-center">Meeting Basic Details</h1>

            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block font-semibold mb-2">Meeting Name</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Enter meeting title"
                />
              </div>
              <div>
                <label className="block font-semibold mb-2">Meeting Date</label>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => { setMeetingDate(e.target.value); setMeetingTime(""); }}
                  min={today}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block font-semibold mb-2">Meeting Time</label>
                <input
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  min={isToday ? currentTime : undefined}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                Next →
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Participants & Details */}
        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <h1 className="text-2xl font-bold mb-6 text-center">Meeting Participants & Details</h1>

            <div className="grid grid-cols-2 gap-8">
              {/* Left Column */}
              <div>
                <MultiSelectDropdown
                  options={availableDepartments}
                  selectedOptions={departments}
                  setSelectedOptions={setDepartments}
                  label="Departments"
                  labelKey="department_name"
                  idKey="department_id"
                />

                <MultiSelectDropdown
                  options={filteredParticipants}
                  selectedOptions={participants}
                  setSelectedOptions={setParticipants}
                  label="Participants"
                  labelKey="employee_name"
                  idKey="employee_id"
                />
              </div>

              {/* Right Column */}
              <div>
                <div className="mb-4">
                  <label className="block font-semibold mb-2">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder="Room 301 / Zoom link"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">Mic Assignments</label>
                  <div className="space-y-2">
                    {["mic1", "mic2", "mic3"].map((mic) => (
                      <div key={mic} className="flex items-center gap-2">
                        <span className="w-20 capitalize">{mic}</span>
                        <select
                          value={micAssignments[mic]}
                          onChange={(e) => handleMicChange(mic, e.target.value)}
                          className="w-full p-2 border rounded"
                          disabled={participants.length === 0}
                        >
                          <option value="">Select participant</option>
                          {participants.map((p) => (
                            <option
                              key={p.employee_id}
                              value={p.employee_name}
                              disabled={Object.values(micAssignments).includes(p.employee_name) && micAssignments[mic] !== p.employee_name}
                            >
                              {p.employee_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="mt-8 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="bg-gray-400 text-white px-6 py-2 rounded hover:bg-gray-500"
              >
                ← Back
              </button>
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
              >
                Save Meeting
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}

export default MeetingSetup;

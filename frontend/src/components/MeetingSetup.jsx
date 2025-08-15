import { useState, useRef, useEffect } from "react";
import { supabase } from '../lib/supabase.js';

// Multi-select dropdown component with Select All
function MultiSelectDropdown({ options, selectedOptions, setSelectedOptions, label }) {
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

  const toggleOption = (option) => {
    setSelectedOptions(prev =>
      prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOptions.length === options.length) {
      setSelectedOptions([]);
    } else {
      setSelectedOptions([...options]);
    }
  };

  return (
    <div className="mb-4 relative" ref={ref}>
      <label className="block font-semibold mb-2">{label}</label>
      <div
        className="border rounded p-2 cursor-pointer flex justify-between items-center"
        onClick={() => setOpen(!open)}
      >
        <span>{selectedOptions.length ? selectedOptions.join(", ") : `Select ${label}`}</span>
        <span className="ml-2">{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div className="absolute mt-1 w-full bg-white border rounded shadow-lg max-h-40 overflow-y-auto z-10">
          <label className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer font-medium text-blue-600">
            <input
              type="checkbox"
              checked={selectedOptions.length === options.length}
              onChange={toggleSelectAll}
            />
            Select All
          </label>
          {options.map(option => (
            <label key={option} className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedOptions.includes(option)}
                onChange={() => toggleOption(option)}
              />
              {option}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function MeetingSetup({ onSetupComplete }) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [departments, setDepartments] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [location, setLocation] = useState("");
  const [micAssignments, setMicAssignments] = useState({ mic1: "", mic2: "", mic3: "" });

  const availableDepartments = ["HR", "Engineering", "Sales", "Marketing", "Finance"];
  const availablePeople = ["Alice", "Bob", "Charlie", "David", "Eve", "Frank"];

  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);
  const isToday = meetingDate === today;

  const handleMicChange = (mic, value) => {
    setMicAssignments(prev => ({
      ...prev,
      [mic]: value
    }));
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
      departments,
      participants,
      location,
      micAssignments
    });
  };

  

  return (
    <div className="min-h-screen bg-gray-100 pt-12 px-4">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        
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
                  onChange={(e) => {
                    setMeetingDate(e.target.value);
                    setMeetingTime("");
                  }}
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

        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <h1 className="text-2xl font-bold mb-6 text-center">
              Meeting Participants & Details
            </h1>

            <div className="grid grid-cols-2 gap-8">
              {/* Left Column */}
              <div>
                {/* Departments */}
                <MultiSelectDropdown
                  options={availableDepartments}
                  selectedOptions={departments}
                  setSelectedOptions={setDepartments}
                  label="Departments"
                />

                {/* Participants */}
                <MultiSelectDropdown
                  options={availablePeople}
                  selectedOptions={participants}
                  setSelectedOptions={setParticipants}
                  label="Participants"
                />
              </div>

              {/* Right Column */}
              <div>
                {/* Location */}
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

                {/* Mic Assignments */}
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
                          {participants
                            .filter(
                              (p) =>
                                !Object.entries(micAssignments).some(
                                  ([key, val]) =>
                                    key !== mic && val === p
                                )
                            )
                            .map((p) => (
                              <option key={p} value={p}>
                                {p}
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

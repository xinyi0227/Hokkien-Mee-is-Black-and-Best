import { useState } from "react";

function MeetingSetup({ onSetupComplete }) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [department, setDepartment] = useState("");
  const [participants, setParticipants] = useState([]);
  const [location, setLocation] = useState("");
  const [agenda, setAgenda] = useState("");
  const [priority, setPriority] = useState("Medium");

  const availableDepartments = ["HR", "Engineering", "Sales", "Marketing", "Finance"];
  const availablePeople = ["Alice", "Bob", "Charlie", "David", "Eve", "Frank"];

  const handleParticipantChange = (name) => {
    setParticipants(prev =>
      prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
    );
  };

  const [micAssignments, setMicAssignments] = useState({
  mic1: "",
  mic2: "",
  mic3: ""
});

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
    if (!department || participants.length === 0) {
      alert("Please fill all required fields in Step 2");
      return;
    }
    onSetupComplete({
      title,
      meetingDate,
      meetingTime,
      department,
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

            {/* Three in a row */}
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
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block font-semibold mb-2">Meeting Time</label>
                <input
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
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
        {/* Department */}
        <div className="mb-4">
          <label className="block font-semibold mb-2">Department</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Select department</option>
            {availableDepartments.map((dep) => (
              <option key={dep} value={dep}>
                {dep}
              </option>
            ))}
          </select>
        </div>

        {/* Participants */}
        <div className="mb-6">
          <label className="block font-semibold mb-2">Participants</label>
          <label className="flex items-center gap-2 font-medium text-blue-600">
            <input
              type="checkbox"
              checked={participants.length === availablePeople.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setParticipants([...availablePeople]);
                } else {
                  setParticipants([]);
                }
              }}
            />
            Select All
          </label>
          <div className="mt-2 space-y-1">
            {availablePeople.map((person) => (
              <label key={person} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={participants.includes(person)}
                  onChange={() => handleParticipantChange(person)}
                />
                {person}
              </label>
            ))}
          </div>
        </div>

        
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
                            key !== mic && val === p // exclude already assigned
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

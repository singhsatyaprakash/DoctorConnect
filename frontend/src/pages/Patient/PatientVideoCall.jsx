import React from "react";
import PatientNavbar from '../../patientComponent/PatientNavbar';
import PatientFooter from '../../patientComponent/PatientFooter';

const sampleSessions = [
  { id:1, doctor: "Dr. Priya Mehta", time: "Today 4:00 PM" },
];

export default function PatientVideoCall(){
  const join = (s) => {
    alert(`Joining video session with ${s.doctor}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PatientNavbar />
      <main className="lg:pl-64 p-6">
        <h1 className="text-xl font-semibold mb-4">Video Sessions</h1>
        <div className="space-y-3">
          {sampleSessions.length === 0 && <div className="text-gray-500">No upcoming video sessions.</div>}
          {sampleSessions.map(s => (
            <div key={s.id} className="bg-white p-4 rounded shadow flex items-center justify-between">
              <div>
                <div className="font-medium">{s.doctor}</div>
                <div className="text-sm text-gray-500">{s.time}</div>
              </div>
              <button onClick={() => join(s)} className="px-3 py-2 bg-blue-600 text-white rounded">Join</button>
            </div>
          ))}
        </div>
      </main>
      <PatientFooter />
    </div>
  );
}

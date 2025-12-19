// Appointments.jsx
import React, { useState } from 'react';
import DoctorNavbar from '../../doctorComponent/DoctorNavbar';import { FaCalendarAlt, FaClock, FaVideo, FaUser } from 'react-icons/fa';

const Appointments = () => {
  const [appointments, setAppointments] = useState([
    {
      id: 1,
      time: '09:00 AM',
      patient: 'John Smith',
      type: 'Consultation',
      status: 'upcoming'
    },
    {
      id: 2,
      time: '10:30 AM',
      patient: 'Sarah Williams',
      type: 'Follow-up',
      status: 'upcoming'
    },
    {
      id: 3,
      time: '02:00 PM',
      patient: 'Michael Brown',
      type: 'New Patient',
      status: 'upcoming'
    },
    {
      id: 4,
      time: '03:30 PM',
      patient: 'Emma Davis',
      type: 'Video Call',
      status: 'upcoming'
    },
    {
      id: 5,
      time: '05:00 PM',
      patient: 'James Wilson',
      type: 'Check-up',
      status: 'upcoming'
    },
    {
      id: 6,
      time: '06:00 PM',
      patient: 'Chris D.',
      type: 'Check-up',
      status: 'upcoming'
    }
  ]);

  const [filter, setFilter] = useState('all');

  return (
    <div className="min-h-screen bg-gray-50">
      <DoctorNavbar />
      
      <main className="p-4 md:p-6 lg:ml-64">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Welcome back, Dr. Satyal</h1>
            <p className="text-gray-500">Friday, December 19, 2025</p>
          </div>

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-700">All Appointments</h2>
            <div className="flex gap-2">
              <button 
                className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-red-500 text-white' : 'bg-white text-gray-600'}`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button 
                className={`px-4 py-2 rounded-lg ${filter === 'upcoming' ? 'bg-red-500 text-white' : 'bg-white text-gray-600'}`}
                onClick={() => setFilter('upcoming')}
              >
                Upcoming
              </button>
              <button 
                className={`px-4 py-2 rounded-lg ${filter === 'completed' ? 'bg-red-500 text-white' : 'bg-white text-gray-600'}`}
                onClick={() => setFilter('completed')}
              >
                Completed
              </button>
            </div>
          </div>

          {/* Appointments List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {appointments
              .filter(app => filter === 'all' || app.status === filter)
              .map((appointment) => (
                <div 
                  key={appointment.id}
                  className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FaClock className="text-red-500" />
                      <span className="font-semibold text-gray-800">{appointment.time}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs ${
                      appointment.status === 'upcoming' 
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {appointment.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <FaUser className="text-red-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{appointment.patient}</h3>
                      <p className="text-sm text-gray-500">{appointment.type}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition">
                      Start Session
                    </button>
                    <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                      Reschedule
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <h3 className="text-gray-500 text-sm">Total Today</h3>
              <p className="text-2xl font-bold text-gray-800">6</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <h3 className="text-gray-500 text-sm">Completed</h3>
              <p className="text-2xl font-bold text-gray-800">0</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <h3 className="text-gray-500 text-sm">Pending</h3>
              <p className="text-2xl font-bold text-gray-800">6</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Appointments;
// VideoSessionManagement.jsx
import React, { useState } from 'react';
import DoctorNavbar from '../../doctorComponent/DoctorNavbar';
import { Link } from 'react-router-dom';
import { FaVideo, FaCalendarAlt, FaHistory, FaPlay, FaUser } from 'react-icons/fa';

const VideoSessionManagement = () => {
  const [upcomingSessions] = useState([
    {
      id: 1,
      patient: 'Emma Davis',
      time: '03:30 PM',
      type: 'Follow-up consultation',
      duration: '30 mins'
    },
    {
      id: 2,
      patient: 'James Wilson',
      time: '05:00 PM',
      type: 'Initial consultation',
      duration: '45 mins'
    }
  ]);

  const [sessionHistory] = useState([
    {
      id: 1,
      patient: 'John Smith',
      time: '09:00 AM',
      date: 'Today',
      status: 'completed'
    },
    {
      id: 2,
      patient: 'Alice Johnson',
      time: '10:00 AM',
      date: 'Yesterday',
      status: 'completed'
    },
    {
      id: 3,
      patient: 'Robert Brown',
      time: '02:00 PM',
      date: 'Dec 17, 2025',
      status: 'completed'
    }
  ]);

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

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
              <FaVideo className="text-red-500" />
              Video Session Management
            </h2>
            <p className="text-gray-500">Manage your telemedicine appointments</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upcoming Sessions */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                  <FaCalendarAlt />
                  Upcoming Sessions
                </h3>
                <span className="text-sm text-gray-500">{upcomingSessions.length} sessions</span>
              </div>

              {upcomingSessions.map((session) => (
                <div key={session.id} className="bg-white rounded-xl shadow-sm border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <FaUser className="text-red-500 text-xl" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">{session.patient}</h4>
                        <p className="text-sm text-gray-500">{session.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-800">{session.time}</div>
                      <div className="text-sm text-gray-500">{session.duration}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/doctor/video-call/${session.id}`}
                      className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-2"
                    >
                      <FaPlay />
                      Join Call
                    </Link>
                    <button className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 transition">
                      Reschedule
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Session History */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                    <FaHistory />
                    Session History
                  </h3>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    {sessionHistory.map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <FaUser className="text-green-500" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-800">{session.patient}</h4>
                            <p className="text-sm text-gray-500">{session.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-800">{session.time}</div>
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-600 rounded-full">
                            {session.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="mt-6 bg-white rounded-xl shadow-sm border p-4">
                <h4 className="font-semibold text-gray-700 mb-3">Video Call Stats</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Calls Today</span>
                    <span className="font-semibold text-gray-800">2</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Completed</span>
                    <span className="font-semibold text-green-600">3</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Duration</span>
                    <span className="font-semibold text-gray-800">35 min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Video Settings */}
          <div className="mt-8 bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Video Call Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Consultation Time
                </label>
                <select className="w-full p-3 border border-gray-300 rounded-lg">
                  <option>30 minutes</option>
                  <option>45 minutes</option>
                  <option>60 minutes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buffer Time Between Calls
                </label>
                <select className="w-full p-3 border border-gray-300 rounded-lg">
                  <option>15 minutes</option>
                  <option>30 minutes</option>
                  <option>45 minutes</option>
                </select>
              </div>
            </div>
            <button className="mt-6 bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition">
              Save Settings
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VideoSessionManagement;
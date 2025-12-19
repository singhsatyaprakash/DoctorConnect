// PatientChats.jsx
import React, { useState, useEffect } from 'react';
import DoctorNavbar from '../../doctorComponent/DoctorNavbar';
import { Link } from 'react-router-dom';
import { FaCommentMedical, FaUserCircle, FaClock } from 'react-icons/fa';
import socket from '../../utils/socket';

const PatientChats = () => {
  const [patients, setPatients] = useState([
    {
      id: 1,
      name: 'John Smith',
      lastMessage: 'Thank you for the consultation, feeling much better now!',
      time: '10 min ago',
      unread: 0,
      online: true
    },
    {
      id: 2,
      name: 'Sarah Williams',
      lastMessage: 'When should I take the medication?',
      time: '25 min ago',
      unread: 2,
      online: false
    },
    {
      id: 3,
      name: 'Robert Johnson',
      lastMessage: 'Feeling much better now!',
      time: '1 hour ago',
      unread: 0,
      online: true
    },
    {
      id: 4,
      name: 'Lisa Anderson',
      lastMessage: 'Can we reschedule to tomorrow?',
      time: '2 hours ago',
      unread: 1,
      online: false
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [onlinePatients, setOnlinePatients] = useState(0);

  useEffect(() => {
    // Connect to socket for real-time updates
    socket.on('patient-online', (patientId) => {
      setPatients(prev => prev.map(p => 
        p.id === patientId ? { ...p, online: true } : p
      ));
    });

    socket.on('patient-offline', (patientId) => {
      setPatients(prev => prev.map(p => 
        p.id === patientId ? { ...p, online: false } : p
      ));
    });

    socket.on('new-message', (data) => {
      setPatients(prev => prev.map(p => 
        p.id === data.patientId 
          ? { 
              ...p, 
              lastMessage: data.message,
              time: 'Just now',
              unread: p.unread + 1
            } 
          : p
      ));
    });

    return () => {
      socket.off('patient-online');
      socket.off('patient-offline');
      socket.off('new-message');
    };
  }, []);

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar - Patient List */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border">
              <div className="p-4 border-b">
                <h2 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
                  <FaCommentMedical className="text-red-500" />
                  Patient Chats
                </h2>
              </div>

              <div className="p-4">
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="Search patients..."
                    className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <FaUserCircle className="absolute left-3 top-3.5 text-gray-400" />
                </div>

                <div className="space-y-3">
                  {filteredPatients.map((patient) => (
                    <Link
                      key={patient.id}
                      to={`/doctor/chat/${patient.id}`}
                      className="block p-3 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                              <FaUserCircle className="text-red-500 text-xl" />
                            </div>
                            {patient.online && (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-800">{patient.name}</h3>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <FaClock className="text-xs" />
                              {patient.time}
                            </div>
                          </div>
                        </div>
                        {patient.unread > 0 && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                            {patient.unread}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{patient.lastMessage}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Chat Area - Placeholder */}
            <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border">
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-4">
                  <FaCommentMedical className="text-red-500 text-4xl" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Select a patient to start chatting</h3>
                <p className="text-gray-500">Choose from the patient list to view messages and start conversation</p>
                <div className="mt-6 flex flex-wrap gap-4 justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-2xl font-bold text-green-600">2</span>
                    </div>
                    <p className="text-sm text-gray-600">Online</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-2xl font-bold text-blue-600">3</span>
                    </div>
                    <p className="text-sm text-gray-600">Unread</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PatientChats;
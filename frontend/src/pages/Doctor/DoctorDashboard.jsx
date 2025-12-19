// DoctorDashboard.jsx (Updated)
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import DoctorNavbar from '../../doctorComponent/DoctorNavbar';
import noProfile from '../../assets/noProfile.webp';
import { 
  Calendar, MessageSquare, Video, CheckSquare, 
  FileText, Pill, Lightbulb, User, Clock, 
  Phone, Bell, TrendingUp, Activity,
  Users, Stethoscope, BarChart, Target
} from 'lucide-react';
import { DoctorProvider, useDoctor } from '../../contexts/DoctorContext'; // <-- added

function DashboardContent() {
  const { doctor, loading, isAuthenticated } = useDoctor();

  const name = doctor?.name || 'Dr. Satyal';
  const specialization = doctor?.specialization || 'Cardiologist';
  const verified = !!doctor?.isVerified;
  const profileImage = doctor?.profileImage || undefined;

  const [isOnline, setIsOnline] = useState(true);
  const [checklist, setChecklist] = useState([
    { id: 1, task: 'Review morning lab results', completed: true },
    { id: 2, task: 'Follow up with Mrs. Johnson', completed: false },
    { id: 3, task: 'Update patient charts', completed: false },
    { id: 4, task: 'Prepare for afternoon rounds', completed: false },
    { id: 5, task: 'Team sync meeting at 4 PM', completed: false }
  ]);
  
  const [appointments] = useState([
    { id: 1, time: '02:00 PM', patient: 'Michael Brown', type: 'New Patient', status: 'upcoming' },
    { id: 2, time: '03:30 PM', patient: 'Emma Davis', type: 'Video Call', status: 'upcoming' },
    { id: 3, time: '05:00 PM', patient: 'James Wilson', type: 'Check-up', status: 'upcoming' }
  ]);

  const [chats] = useState([
    { id: 1, patient: 'John Smith', message: 'Thank you for the consultation, feeling much better now!', time: '10 min ago', unread: 0 },
    { id: 2, patient: 'Sarah Williams', message: 'When should I take the medication?', time: '25 min ago', unread: 2 },
    { id: 3, patient: 'Lisa Anderson', message: 'Can we reschedule to tomorrow?', time: '2 hours ago', unread: 1 }
  ]);

  const toggleChecklist = (id) => {
    setChecklist(checklist.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const completedTasks = checklist.filter(item => item.completed).length;
  const totalTasks = checklist.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <DoctorNavbar />
      
      <div className="p-4 md:p-6 lg:ml-64">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Welcome back, {name}</h1>
              <p className="text-gray-500">{specialization} {verified && <span className="inline-block ml-2 text-sm text-green-600 font-medium">Verified</span>}</p>
            </div>
            <div className="flex items-center gap-4">
              {/* optional profile image */}
              <div className="w-14 h-14 rounded-full overflow-hidden border bg-white">
                <img src={profileImage || noProfile} alt="profile" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-3xl font-bold">6</p>
              <p className="text-sm opacity-90">Today's Appointments</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <MessageSquare className="w-8 h-8 opacity-80" />
                <span className="bg-white text-purple-600 text-xs font-bold px-2 py-1 rounded-full">New</span>
              </div>
              <p className="text-3xl font-bold">12</p>
              <p className="text-sm opacity-90">Unread Messages</p>
            </div>
            
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <CheckSquare className="w-8 h-8 opacity-80" />
                <span className="text-sm opacity-90">60%</span>
              </div>
              <p className="text-3xl font-bold">5</p>
              <p className="text-sm opacity-90">Pending Tasks</p>
            </div>
            
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-md p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-3xl font-bold">42</p>
              <p className="text-sm opacity-90">Active Patients</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today's Checklist */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-6 h-6 text-red-500" />
                    <h2 className="text-xl font-semibold">Today's Tasks</h2>
                  </div>
                  <span className="text-sm text-gray-500">
                    {completedTasks}/{totalTasks} completed
                  </span>
                </div>
                <div className="space-y-3">
                  {checklist.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <input 
                        type="checkbox" 
                        checked={item.completed}
                        onChange={() => toggleChecklist(item.id)}
                        className="w-5 h-5 text-red-500 rounded focus:ring-red-500"
                      />
                      <span className={`flex-1 ${item.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {item.task}
                      </span>
                    </div>
                  ))}
                  <button className="w-full py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition">
                    + Add New Task
                  </button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Stethoscope className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-800">24</p>
                  <p className="text-sm text-gray-600">Weekly Consultations</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Target className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-800">94%</p>
                  <p className="text-sm text-gray-600">Patient Satisfaction</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <BarChart className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-800">18</p>
                  <p className="text-sm text-gray-600">Cases Resolved</p>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Upcoming Appointments */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-6 h-6 text-red-500" />
                    <h2 className="text-xl font-semibold">Upcoming Appointments</h2>
                  </div>
                  <Link 
                    to="/doctor/appointments"
                    className="text-sm text-red-500 hover:text-red-600"
                  >
                    View All →
                  </Link>
                </div>
                <div className="space-y-3">
                  {appointments.map(apt => (
                    <div key={apt.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:shadow-sm transition">
                      <div className="w-16 text-center bg-red-50 rounded-lg py-2">
                        <p className="text-sm font-bold text-red-600">{apt.time}</p>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{apt.patient}</p>
                        <p className="text-sm text-gray-500">{apt.type}</p>
                      </div>
                      <Link
                        to={`/doctor/video-call/${apt.id}`}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                      >
                        <Video className="w-5 h-5" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Messages */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-red-500" />
                    <h2 className="text-xl font-semibold">Recent Messages</h2>
                  </div>
                  <Link 
                    to="/doctor/chats"
                    className="text-sm text-red-500 hover:text-red-600"
                  >
                    View All →
                  </Link>
                </div>
                <div className="space-y-3">
                  {chats.map(chat => (
                    <Link
                      key={chat.id}
                      to={`/doctor/chat/${chat.id}`}
                      className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:shadow-sm transition block"
                    >
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-sm text-gray-800 truncate">{chat.patient}</h3>
                          {chat.unread > 0 && (
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{chat.unread}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate">{chat.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{chat.time}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <Link 
              to="/doctor/appointments" 
              className="bg-white p-4 rounded-xl shadow-sm border text-center hover:shadow-md transition"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium">Appointments</span>
            </Link>
            
            <Link 
              to="/doctor/chats" 
              className="bg-white p-4 rounded-xl shadow-sm border text-center hover:shadow-md transition"
            >
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm font-medium">Patient Chats</span>
            </Link>
            
            <Link 
              to="/doctor/video-sessions" 
              className="bg-white p-4 rounded-xl shadow-sm border text-center hover:shadow-md transition"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Video className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm font-medium">Video Sessions</span>
            </Link>
            
            <Link 
              to="/doctor/medicines" 
              className="bg-white p-4 rounded-xl shadow-sm border text-center hover:shadow-md transition"
            >
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Pill className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-sm font-medium">Medications</span>
            </Link>
            
            <Link 
              to="/doctor/notes" 
              className="bg-white p-4 rounded-xl shadow-sm border text-center hover:shadow-md transition"
            >
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <FileText className="w-5 h-5 text-yellow-600" />
              </div>
              <span className="text-sm font-medium">Notes</span>
            </Link>
            
            <Link 
              to="/doctor/case-studies" 
              className="bg-white p-4 rounded-xl shadow-sm border text-center hover:shadow-md transition"
            >
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Stethoscope className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="text-sm font-medium">Case Studies</span>
            </Link>
            
            <Link 
              to="/doctor/share-ideas" 
              className="bg-white p-4 rounded-xl shadow-sm border text-center hover:shadow-md transition"
            >
              <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Lightbulb className="w-5 h-5 text-pink-600" />
              </div>
              <span className="text-sm font-medium">Share Ideas</span>
            </Link>
            
            <Link 
              to="/doctor/settings" 
              className="bg-white p-4 rounded-xl shadow-sm border text-center hover:shadow-md transition"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Bell className="w-5 h-5 text-gray-600" />
              </div>
              <span className="text-sm font-medium">Settings</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DoctorDashboard() {
  return (
    <DoctorProvider>
      <DashboardContent />
    </DoctorProvider>
  );
}
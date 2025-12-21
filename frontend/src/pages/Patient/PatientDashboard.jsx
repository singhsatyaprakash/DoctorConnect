import React from "react";
import { Link } from "react-router-dom";
import {
  FaCalendarAlt,
  FaComments,
  FaVideo,
  FaStar,
  FaArrowUp,
} from "react-icons/fa";
import { usePatientAuth } from "../../contexts/PatientContext";
import PatientNavbar from "../../patientComponent/PatientNavbar";

const StatCard = ({ title, value, subtitle, icon: Icon, trend }) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border hover:shadow-md transition">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <h3 className="text-3xl font-bold mt-1">{value}</h3>
      </div>
      <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
        <Icon />
      </div>
    </div>
    <div className="mt-3 text-sm text-gray-500">
      {subtitle}
      {trend && (
        <span className="ml-2 text-green-600 inline-flex items-center gap-1">
          <FaArrowUp /> {trend}
        </span>
      )}
    </div>
  </div>
);

const ActionCard = ({ title, desc, icon: Icon, to }) => (
  <Link
    to={to}
    className="bg-white rounded-xl p-5 shadow-sm border hover:shadow-md transition flex items-center gap-4"
  >
    <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
      <Icon className="text-xl" />
    </div>
    <div>
      <h4 className="font-semibold text-gray-800">{title}</h4>
      <p className="text-sm text-gray-500">{desc}</p>
    </div>
  </Link>
);

const PatientDashboard = () => {
  const { patient, loading } = usePatientAuth();

  if (loading) return <div className="p-6">Loading...</div>;
  if (!patient) return <div className="p-6">No patient data</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <PatientNavbar />

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              Welcome back, {patient.name?.split(" ")[0] || "Patient"} 👋
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Here's what's happening with your health journey
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <StatCard
              title="Upcoming Appointments"
              value={patient.upcomingAppointments || 3}
              subtitle="Next: Today at 2:00 PM"
              icon={FaCalendarAlt}
              trend="+2 this week"
            />
            <StatCard
              title="Active Chats"
              value={patient.activeChats || 5}
              subtitle="2 unread messages"
              icon={FaComments}
              trend="+3 new today"
            />
            <StatCard
              title="Video Consultations"
              value={patient.videoConsults || 12}
              subtitle="This month"
              icon={FaVideo}
              trend="+40% from last month"
            />
            <StatCard
              title="Your Reviews"
              value={patient.reviewsCount || 8}
              subtitle="Average rating: 4.8"
              icon={FaStar}
              trend="2 pending"
            />
          </div>

          {/* Quick Actions */}
          <div className="mt-12">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Quick Actions
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ActionCard
                title="Book Appointment"
                desc="Find a doctor now"
                icon={FaCalendarAlt}
                to="/patient/appointments"
              />
              <ActionCard
                title="Start Chat"
                desc="Talk to your doctor"
                icon={FaComments}
                to="/patient/chats"
              />
              <ActionCard
                title="View History"
                desc="Past consultations"
                icon={FaVideo}
                to="/patient/history"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PatientDashboard;

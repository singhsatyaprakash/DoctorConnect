import React from 'react';
import DoctorNavbar from '../../doctorComponent/DoctorNavbar';
import TodoList from '../../doctorComponent/TodoList';
import Calender from '../../component/calender';
import UpcomingAppointments from '../../doctorComponent/UpcomingAppointments';

export default function DoctorDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <DoctorNavbar />
      <div className="p-4 md:p-6 lg:ml-64">
        <div className="max-w-5xl mx-auto">
          <TodoList />
          <Calender/>
          <UpcomingAppointments/>
        </div>
      </div>
    </div>
  );
}
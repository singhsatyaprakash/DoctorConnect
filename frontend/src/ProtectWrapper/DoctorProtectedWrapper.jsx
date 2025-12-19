import React from 'react';
import { Navigate } from 'react-router-dom';
import { useDoctor } from '../contexts/DoctorContext';

const DoctorProtectedWrapper = ({ children }) => {
  const { loading, isAuthenticated } = useDoctor();

  if (loading) {
    return (
      <div className="w-full h-40 flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/register/doctor" replace />;
  }

  return <>{children}</>;
};

export default DoctorProtectedWrapper;
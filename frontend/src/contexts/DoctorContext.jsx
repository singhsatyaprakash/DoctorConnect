import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:3000';
const DoctorContext = createContext(null);

export const DoctorProvider = ({ children }) => {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    if (!token) {
      setDoctor(null);
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/doctors/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.success) {
        setDoctor(res.data.data);
        setIsAuthenticated(true);
      } else {
        setDoctor(null);
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('Fetch doctor profile error:', err?.response?.data || err.message);
      setDoctor(null);
      setIsAuthenticated(false);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setDoctor(null);
    setIsAuthenticated(false);
  };

  return (
    <DoctorContext.Provider value={{ doctor, loading, isAuthenticated, error, refresh: fetchProfile, logout }}>
      {children}
    </DoctorContext.Provider>
  );
};

// safe hook: returns context or safe defaults so Navbar can be used without provider
export const useDoctor = () => {
  const ctx = useContext(DoctorContext);
  if (ctx) return ctx;
  return {
    doctor: null,
    loading: false,
    isAuthenticated: false,
    error: null,
    refresh: () => {},
    logout: () => {}
  };
};

export default DoctorContext;

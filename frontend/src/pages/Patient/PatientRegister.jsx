import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PatientRegisterNavbar from "./PatientRegisterNavbar";

const PatientRegister = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', age: '', password: '', confirmPassword: '' });
  const navigate = useNavigate();
  const API_URL = import.meta?.env?.VITE_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:3000';

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/patients/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          age: form.age,
          password: form.password
        })
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'Registration failed');
        return;
      }
      // store token and redirect
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('role', 'patient');
      navigate(data.data.redirectTo || '/patient/dashboard');
    } catch (err) {
      console.error('Register error', err);
      alert('Registration error');
    }
  };

  return (
    <>
      {/* Navbar */}
      <PatientRegisterNavbar />

      {/* Page Wrapper */}
      <div className="min-h-screen flex items-center justify-center bg-green-50 px-4 pt-24">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 sm:p-8">
          
          {/* Heading */}
          <h2 className="text-2xl font-bold text-center text-gray-800">
            Patient Signup
          </h2>
          <p className="text-center text-sm text-gray-500 mt-1">
            Create your account to consult doctors
          </p>

          {/* Form */}
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-600">
                Full Name
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                type="text"
                placeholder="Enter your full name"
                className="w-full mt-1 px-4 py-2 border rounded-md
                           focus:outline-none focus:ring-2 focus:ring-green-400"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-600">
                Email
              </label>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                type="email"
                placeholder="Enter your email"
                className="w-full mt-1 px-4 py-2 border rounded-md
                           focus:outline-none focus:ring-2 focus:ring-green-400"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-600">
                Phone Number
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                type="tel"
                placeholder="Enter phone number"
                className="w-full mt-1 px-4 py-2 border rounded-md
                           focus:outline-none focus:ring-2 focus:ring-green-400"
                required
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-sm font-medium text-gray-600">
                Age
              </label>
              <input
                name="age"
                value={form.age}
                onChange={handleChange}
                type="number"
                min="0"
                placeholder="Your age"
                className="w-full mt-1 px-4 py-2 border rounded-md
                           focus:outline-none focus:ring-2 focus:ring-green-400"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-600">
                Password
              </label>
              <input
                name="password"
                value={form.password}
                onChange={handleChange}
                type="password"
                placeholder="Create password"
                className="w-full mt-1 px-4 py-2 border rounded-md
                           focus:outline-none focus:ring-2 focus:ring-green-400"
                required
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-600">
                Confirm Password
              </label>
              <input
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                type="password"
                placeholder="Confirm password"
                className="w-full mt-1 px-4 py-2 border rounded-md
                           focus:outline-none focus:ring-2 focus:ring-green-400"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-green-500 text-white py-2 rounded-md
                         font-semibold hover:bg-green-600 transition"
            >
              Sign Up
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{" "}
            <Link
              to="/"
              className="text-green-600 font-semibold hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default PatientRegister;

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUserMd, FaBars, FaTimes } from "react-icons/fa";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b">
      <div className="w-full px-6 py-3 flex items-center justify-between">

        {/* LEFT: Logo */}
        <div className="flex items-center gap-2">
          <FaUserMd className="text-red-500 text-2xl" />
          <span className="text-xl font-bold text-gray-800">
            Doc<span className="text-red-500">Connect</span>
          </span>
        </div>

        {/* DESKTOP MENU */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-700">
          <Link to="/" className="hover:text-red-500 transition">
            Home
          </Link>
          <Link to="/about" className="hover:text-red-500 transition">
            About
          </Link>
          <Link to="/contact" className="hover:text-red-500 transition">
            Contact
          </Link>

          <button
            onClick={() => navigate("/login")}
            className="px-5 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition"
          >
            Login
          </button>
        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          className="md:hidden text-2xl text-gray-700"
          onClick={() => setOpen(!open)}
        >
          {open ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {/* MOBILE MENU */}
      {open && (
        <div className="md:hidden bg-white border-t shadow-md">
          <div className="flex flex-col px-6 py-4 gap-4 text-gray-700 font-medium">
            <Link onClick={() => setOpen(false)} to="/">
              Home
            </Link>
            <Link onClick={() => setOpen(false)} to="/about">
              About
            </Link>
            <Link onClick={() => setOpen(false)} to="/contact">
              Contact
            </Link>

            <button
              onClick={() => {
                setOpen(false);
                navigate("/login");
              }}
              className="mt-2 w-full py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600"
            >
              Login
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

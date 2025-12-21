import React, { useEffect, useState, useContext } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import axios from 'axios'
import { MdEmail, MdPhone, MdChat, MdCall, MdVideocam, MdStar } from 'react-icons/md'
import PatientContext from '../../contexts/PatientContext'
import PatientNavbar from '../../patientComponent/PatientNavbar'
import noProfile from '../../assets/noProfile.webp'

const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return ''
  const parts = email.split('@')
  if (parts.length !== 2) return email[0] ? `${email[0]}***` : ''
  const [local, domain] = parts
  const localMasked = local.length > 2 ? local[0] + '***' + local.slice(-1) : (local[0] || '') + '*'
  const domainParts = (domain || '').split('.')
  const domainMain = domainParts[0] || ''
  const domainMasked = domainMain ? domainMain[0] + '***' : '***'
  const tld = domainParts.slice(1).join('.') || '***'
  return `${localMasked}@${domainMasked}.${tld}`
}

const maskPhone = (phone) => {
  if (!phone) return ''
  const digits = phone.replace(/\D/g,'')
  if (digits.length <= 4) return '****'
  const last = digits.slice(-3)
  return '****' + last
}

const DoctorBookingProcess = () => {
  const { doctorId } = useParams();
  const location = useLocation();
  const { patient } = useContext(PatientContext) || {};
  const [doctor, setDoctor] = useState(location.state?.doctor || null);
  const [loading, setLoading] = useState(!doctor);
  const [revealContact, setRevealContact] = useState(false);//untill payment will not happpens later on it will be implemented

  const [mode, setMode] = useState('video');

  const [bookingLoading, setBookingLoading] = useState(false);
  const [message, setMessage] = useState('');

  // NEW: date + slots from bookingHistoryDoctor
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    if (doctor) return;
    setLoading(true);
    let cancelled = false;

    const load = async () => {
      try {
        // try primary endpoint
        let res;
        try {
          res = await axios.get(`${import.meta.env.VITE_API_URL}/doctors/${doctorId}`);
        } catch (e) {
          console.log(e.message);
          // f
          res = await axios.get(`${import.meta.env.VITE_API_URL}/doctors/search`, {
            params: { doctorId }
          });
        }
        const data = res?.data;
        const doc = data?.success ? data.data : data;
        if (!cancelled) setDoctor(doc);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [doctor, doctorId]);

  // NEW: fetch availability whenever date/mode/doctor changes
  useEffect(() => {
    const docId = doctor?._id || doctorId;
    if (!docId || !selectedDate || !mode) return;

    let cancelled = false;
    setSlotsLoading(true);
    setMessage('');

    (async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/appointments/availability`, {
          params: { doctorId: docId, date: selectedDate, type: mode }
        });
        const data = res?.data?.data;
        if (!cancelled) setSlots(data?.slots || []);
      } catch (err) {
        if (!cancelled) setSlots([]);
        console.error(err);
        if (!cancelled) setMessage(err?.response?.data?.message || 'Failed to load slots');
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [doctor?._id, doctorId, selectedDate, mode]);

  const unlockContact = async () => {
    // simulate a small purchase flow; reveal locally and optionally ping backend
    try {
      const fee = doctor?.contactRevealFee ?? 50;
      setMessage('Processing payment...');
      // optionally: await axios.post('/payments/reveal-contact', { doctorId, patientId: patient?._id })
      // simulate delay
      await new Promise(r => setTimeout(r, 800));
      setRevealContact(true);
      setMessage(`Contact unlocked for ₹${fee}`);
    } catch (err) {
      setMessage('Payment failed');
    }
  };

  const bookSlot = async (slot) => {
    if (!patient || !patient._id) {
      setMessage('Please login as patient to book.');
      return;
    }
    const docId = doctor?._id || doctorId;
    if (!docId) {
      setMessage('Doctor not found.');
      return;
    }

    setBookingLoading(true);
    setMessage('');

    try {
      const payload = {
        patientId: patient._id,
        doctorId: docId,
        date: selectedDate,        // YYYY-MM-DD
        type: mode,                // chat/voice/video/in-person
        startTime: slot.startTime, // "HH:mm"
        endTime: slot.endTime      // "HH:mm"
      };

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/appointments/book-slot`, payload);
      const j = res?.data;
      if (!j?.success) throw new Error(j?.message || 'Booking failed');

      setMessage('Booked successfully');

      // refetch availability after booking
      const again = await axios.get(`${import.meta.env.VITE_API_URL}/appointments/availability`, {
        params: { doctorId: docId, date: selectedDate, type: mode }
      });
      setSlots(again?.data?.data?.slots || []);
    } catch (err) {
      console.error(err);
      setMessage(err?.response?.data?.message || err?.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  }

  if (loading) return <div>Loading doctor...</div>;
  if (!doctor) return <div>Doctor not found</div>;

  // slots already filtered by backend for mode + free; keep defensive filter
  const availableSlots = (slots || []).filter(s => s && s.startTime && s.endTime);

  return (
  <>
    <PatientNavbar />

    <main className="lg:pl-64 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Doctor Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col md:flex-row gap-6">
          <img
            src={doctor.profileImage || noProfile}
            alt={doctor.name}
            className="w-32 h-32 rounded-xl object-cover border"
          />

          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800">
              {doctor.name}
            </h2>

            <p className="text-sm text-gray-600 mt-1">
              {doctor.specialization} • {doctor.experience} yrs experience
            </p>

            <div className="flex items-center gap-3 mt-3 text-sm">
              <span className={`px-2 py-1 rounded-full text-xs font-medium 
                ${doctor.isVerified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {doctor.isVerified ? 'Verified' : 'Not Verified'}
              </span>

              <span className={`px-2 py-1 rounded-full text-xs font-medium 
                ${doctor.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {doctor.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="mt-3 text-sm text-gray-600 flex items-center gap-2">
              <MdStar className="text-yellow-500" />
              <span>{doctor.rating ?? 0} Rating • {doctor.totalReviews ?? 0} Reviews</span>
            </div>
          </div>
        </div>

        {/* About + Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">

          {/* About */}
          <div className="bg-white rounded-xl p-5 shadow-sm md:col-span-2">
            <h3 className="font-semibold text-gray-800 mb-2">About Doctor</h3>
            <p className="text-sm text-gray-600">
              {doctor.bio || 'No bio provided.'}
            </p>

            <div className="mt-4">
              <h4 className="font-medium text-gray-700 mb-1">Qualifications</h4>
              <ul className="list-disc list-inside text-sm text-gray-600">
                {(doctor.qualifications || []).length === 0
                  ? <li>Not specified</li>
                  : doctor.qualifications.map((q, i) => <li key={i}>{q}</li>)
                }
              </ul>
            </div>

            <div className="mt-4">
              <h4 className="font-medium text-gray-700 mb-1">Languages</h4>
              <p className="text-sm text-gray-600">
                {(doctor.languages || []).join(', ') || 'Not specified'}
              </p>
            </div>
          </div>

          {/* Fees & Availability */}
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3">Consultation Fees</h3>

            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex items-center gap-2">
                <MdChat className="text-gray-500" />
                <span>Chat: ₹{doctor.consultationFee?.chat ?? 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <MdCall className="text-gray-500" />
                <span>Voice: ₹{doctor.consultationFee?.voice ?? 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <MdVideocam className="text-gray-500" />
                <span>Video: ₹{doctor.consultationFee?.video ?? 0}</span>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="font-medium text-gray-700 mb-1">Availability</h4>
              <p className="text-sm text-gray-600">
                {doctor.availability?.from || 'N/A'} – {doctor.availability?.to || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-xl p-5 shadow-sm mt-6">
          <h3 className="font-semibold text-gray-800 mb-2">Contact Details</h3>

          <div className="text-sm text-gray-600 space-y-2">
            <div className="flex items-center gap-2">
              <MdEmail className="text-gray-500" />
              <span>{revealContact ? doctor.email : maskEmail(doctor.email)}</span>
              {!revealContact && (
                <button
                  onClick={unlockContact}
                  className="ml-2 text-xs text-green-600 hover:underline"
                >
                  Unlock for ₹{doctor?.contactRevealFee ?? 50}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <MdPhone className="text-gray-500" />
              <span>{revealContact ? doctor.phone : maskPhone(doctor.phone)}</span>
            </div>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="bg-white rounded-xl p-5 shadow-sm mt-6">
          <h3 className="font-semibold text-gray-800 mb-3">Choose Consultation Mode</h3>

          <div className="flex gap-6 text-sm">
            {['chat', 'voice', 'video', 'in-person'].map(m => (
              <label key={m} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={mode === m}
                  onChange={() => setMode(m)}
                />
                <span className="capitalize">{m}</span>
              </label>
            ))}
          </div>

          {/* NEW: Date selection */}
          <div className="mt-4 flex items-center gap-3">
            <label className="text-sm text-gray-700 font-medium">Select date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        {/* Slots */}
        <div className="bg-white rounded-xl p-5 shadow-sm mt-6">
          <h3 className="font-semibold text-gray-800 mb-2">
            Available Slots ({mode}) — {selectedDate}
          </h3>

          {slotsLoading && (
            <p className="text-sm text-gray-500">Loading slots...</p>
          )}

          {!slotsLoading && availableSlots.length === 0 && (
            <p className="text-sm text-gray-500">No slots available.</p>
          )}

          <ul className="space-y-3">
            {availableSlots.map((slot) => (
              <li
                key={`${slot.type}-${slot.startTime}-${slot.endTime}`}
                className="flex items-center justify-between border rounded-lg p-3"
              >
                <div>
                  <div className="text-sm font-medium text-gray-800">
                    {slot.startTime} – {slot.endTime}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">
                    {slot.type}
                  </div>
                </div>

                <button
                  onClick={() => bookSlot(slot)}
                  disabled={bookingLoading}
                  className="px-4 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Book
                </button>
              </li>
            ))}
          </ul>
        </div>

        {message && (
          <div className="mt-4 text-sm text-green-600">
            {message}
          </div>
        )}
      </div>
    </main>
  </>
  )
}

export default DoctorBookingProcess

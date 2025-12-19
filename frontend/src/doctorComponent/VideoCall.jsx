// VideoCall.jsx
import React, { useState, useEffect, useRef } from 'react';
import DoctorNavbar from './DoctorNavbar'
import { useParams } from 'react-router-dom';
import { 
  FaVideo, 
  FaVideoSlash, 
  FaMicrophone, 
  FaMicrophoneSlash,
  FaPhoneSlash,
  FaUser,
  FaUsers,
  FaStethoscope,
  FaClipboard
} from 'react-icons/fa';

const VideoCall = () => {
  const { sessionId } = useParams();
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [patientNotes, setPatientNotes] = useState('');
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // Simulate WebRTC connection
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const endCall = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    // Navigate back or show call ended screen
    window.history.back();
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // Implement recording logic
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <DoctorNavbar />
      
      <div className="p-4">
        {/* Call Header */}
        <div className="max-w-6xl mx-auto mb-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                <FaStethoscope className="text-xl" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Video Consultation</h1>
                <p className="text-gray-300">Session ID: {sessionId}</p>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-mono font-bold">{formatTime(callDuration)}</div>
              <div className="text-sm text-gray-300">Duration</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {/* Main Video Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Remote Video (Patient) */}
            <div className="bg-gray-800 rounded-xl overflow-hidden relative h-[400px]">
              <div ref={remoteVideoRef} className="w-full h-full bg-gray-700 flex items-center justify-center">
                {/* Placeholder for patient video */}
                <div className="text-center">
                  <div className="w-32 h-32 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaUser className="text-6xl text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Emma Davis</h3>
                  <p className="text-gray-300">Patient</p>
                </div>
              </div>
              
              {/* Connection Status */}
              <div className="absolute top-4 left-4">
                <div className="flex items-center gap-2 bg-black/50 text-white px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Connected
                </div>
              </div>
            </div>

            {/* Local Video (Doctor) */}
            <div className="bg-gray-800 rounded-xl overflow-hidden relative h-[200px]">
              <div ref={localVideoRef} className="w-full h-full bg-gray-900 flex items-center justify-center">
                {/* Placeholder for doctor video */}
                <div className="text-center">
                  <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <FaUser className="text-4xl text-white" />
                  </div>
                  <h3 className="font-semibold text-white">Dr. Satyal</h3>
                </div>
              </div>
              
              <div className="absolute top-2 right-2 text-sm text-white bg-black/50 px-2 py-1 rounded">
                You
              </div>
            </div>
          </div>

          {/* Controls and Notes Sidebar */}
          <div className="space-y-4">
            {/* Call Controls */}
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <FaVideo />
                Call Controls
              </h3>
              
              <div className="flex justify-center gap-4 mb-4">
                <button
                  onClick={() => setVideoEnabled(!videoEnabled)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center ${
                    videoEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                  } transition`}
                >
                  {videoEnabled ? (
                    <FaVideo className="text-white text-xl" />
                  ) : (
                    <FaVideoSlash className="text-white text-xl" />
                  )}
                </button>
                
                <button
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center ${
                    audioEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                  } transition`}
                >
                  {audioEnabled ? (
                    <FaMicrophone className="text-white text-xl" />
                  ) : (
                    <FaMicrophoneSlash className="text-white text-xl" />
                  )}
                </button>
                
                <button
                  onClick={toggleRecording}
                  className={`w-14 h-14 rounded-full flex items-center justify-center ${
                    isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
                  } transition`}
                >
                  <div className={`w-6 h-6 rounded ${isRecording ? 'bg-white' : 'bg-red-500'}`}></div>
                </button>
              </div>
              
              <button
                onClick={endCall}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 transition"
              >
                <FaPhoneSlash />
                End Call
              </button>
            </div>

            {/* Patient Notes */}
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <FaClipboard />
                Consultation Notes
              </h3>
              
              <textarea
                value={patientNotes}
                onChange={(e) => setPatientNotes(e.target.value)}
                placeholder="Enter consultation notes here..."
                className="w-full h-32 bg-gray-900 text-white border border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              
              <div className="flex gap-2 mt-3">
                <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition">
                  Save
                </button>
                <button className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition">
                  Prescribe
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <button className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-lg transition">
                  Share Screen
                </button>
                <button className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-lg transition">
                  Whiteboard
                </button>
                <button className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-lg transition">
                  File Share
                </button>
                <button className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-lg transition">
                  Invite Expert
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="max-w-6xl mx-auto mt-4">
          <div className="bg-gray-800 rounded-lg p-3 flex items-center justify-between text-white text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Video: {videoEnabled ? 'On' : 'Off'}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Audio: {audioEnabled ? 'On' : 'Off'}
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500' : 'bg-gray-500'}`}></div>
                Recording: {isRecording ? 'Active' : 'Inactive'}
              </div>
            </div>
            <div className="text-gray-300">
              Patient: Emma Davis • Follow-up Consultation
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;
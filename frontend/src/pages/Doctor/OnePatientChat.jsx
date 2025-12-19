// OnePatientChat.jsx (Updated with better socket handling)
import React, { useState, useRef, useEffect } from 'react';
import DoctorNavbar from '../../doctorComponent/DoctorNavbar';
import { useParams } from 'react-router-dom';
import { 
  FaPaperPlane, 
  FaVideo, 
  FaPhone, 
  FaPaperclip, 
  FaUserCircle,
  FaClock,
  FaArrowLeft,
  FaCheckDouble
} from 'react-icons/fa';
import { useSocket } from '../../contexts/SocketContext';

const OnePatientChat = () => {
  const { patientId } = useParams();
  const { 
    socket, 
    isConnected, 
    joinChatRoom, 
    leaveChatRoom, 
    sendMessage, 
    onReceiveMessage,
    onTyping,
    sendTyping
  } = useSocket();
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      text: 'Hello Doctor, I have a question about my medication.', 
      sender: 'patient', 
      senderId: patientId,
      timestamp: '09:30 AM',
      status: 'delivered'
    },
    { 
      id: 2, 
      text: 'Hello John, what would you like to know?', 
      sender: 'doctor', 
      senderId: 'doctor-1',
      timestamp: '09:31 AM',
      status: 'read'
    }
  ]);
  
  const [patient, setPatient] = useState({
    name: 'John Smith',
    lastSeen: '10 minutes ago',
    online: true,
    isTyping: false
  });

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!isConnected) return;

    const roomId = `doctor-patient-${patientId}`;
    
    // Join chat room
    joinChatRoom(roomId, 'doctor-1', 'doctor');

    // Listen for incoming messages
    onReceiveMessage((incomingMessage) => {
      if (incomingMessage.roomId === roomId) {
        setMessages(prev => [...prev, incomingMessage.message]);
      }
    });

    // Listen for typing indicators
    onTyping(({ roomId, userId, isTyping }) => {
      if (roomId === roomId && userId === patientId) {
        setPatient(prev => ({ ...prev, isTyping }));
      }
    });

    // Cleanup on unmount
    return () => {
      leaveChatRoom(roomId);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isConnected, patientId, joinChatRoom, leaveChatRoom, onReceiveMessage, onTyping]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    sendTyping(`doctor-patient-${patientId}`, 'doctor-1', true);
    
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(`doctor-patient-${patientId}`, 'doctor-1', false);
    }, 1000);
  };

  const sendMessageHandler = (e) => {
    e.preventDefault();
    if (!message.trim() || !isConnected) return;

    const roomId = `doctor-patient-${patientId}`;
    const newMessage = sendMessage(roomId, message, 'doctor-1', 'doctor');
    
    if (newMessage) {
      setMessages(prev => [...prev, newMessage]);
      setMessage('');
      
      // Stop typing indicator
      sendTyping(roomId, 'doctor-1', false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DoctorNavbar />
      
      <main className="p-4 md:p-6 lg:ml-64">
        <div className="max-w-6xl mx-auto">
          {/* Connection Status */}
          {!isConnected && (
            <div className="mb-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              <p>⚠️ Reconnecting to chat service...</p>
            </div>
          )}

          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Welcome back, Dr. Satyal</h1>
              <p className="text-gray-500">Friday, December 19, 2025</p>
            </div>
            <button 
              onClick={() => window.history.back()} 
              className="lg:hidden flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <FaArrowLeft />
              Back
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Patient Info Sidebar */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border p-4 h-fit">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FaUserCircle className="text-red-500 text-4xl" />
                </div>
                <h3 className="font-bold text-lg text-gray-800">{patient.name}</h3>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${patient.online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className="text-sm text-gray-500">
                    {patient.isTyping 
                      ? 'Typing...' 
                      : patient.online 
                        ? 'Online' 
                        : `Last seen ${patient.lastSeen}`
                    }
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <button className="w-full flex items-center justify-center gap-2 bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition">
                  <FaVideo />
                  Start Video Call
                </button>
                <button className="w-full flex items-center justify-center gap-2 border border-red-500 text-red-500 py-3 rounded-lg hover:bg-red-50 transition">
                  <FaPhone />
                  Audio Call
                </button>
              </div>

              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold text-gray-700 mb-3">Patient Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Age:</span>
                    <span className="font-medium">45</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Visit:</span>
                    <span className="font-medium">Dec 18, 2025</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Condition:</span>
                    <span className="font-medium">Hypertension</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <FaUserCircle className="text-red-500" />
                    </div>
                    {patient.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{patient.name}</h3>
                    <p className="text-sm text-gray-500">
                      {patient.isTyping 
                        ? 'Typing...' 
                        : patient.online 
                          ? 'Online' 
                          : `Last seen ${patient.lastSeen}`
                      }
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                    <FaVideo />
                  </button>
                  <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                    <FaPhone />
                  </button>
                </div>
              </div>

              {/* Messages Container */}
              <div className="flex-1 p-4 overflow-y-auto max-h-[500px]">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'doctor' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          msg.sender === 'doctor'
                            ? 'bg-red-500 text-white rounded-br-none'
                            : 'bg-gray-100 text-gray-800 rounded-bl-none'
                        }`}
                      >
                        <p>{msg.text}</p>
                        <div className={`text-xs mt-1 flex items-center gap-1 ${
                          msg.sender === 'doctor' ? 'text-red-100' : 'text-gray-500'
                        }`}>
                          <FaClock className="text-xs" />
                          {msg.timestamp}
                          {msg.sender === 'doctor' && msg.status && (
                            <>
                              <span className="mx-1">•</span>
                              {msg.status === 'read' ? (
                                <FaCheckDouble className="text-blue-400" />
                              ) : msg.status === 'delivered' ? (
                                <FaCheckDouble />
                              ) : (
                                <span>Sent</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input */}
              <div className="p-4 border-t">
                <form onSubmit={sendMessageHandler} className="flex gap-3">
                  <button type="button" className="p-3 text-gray-600 hover:bg-gray-100 rounded-lg">
                    <FaPaperclip />
                  </button>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      handleTyping();
                    }}
                    placeholder="Type your message here..."
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    disabled={!isConnected}
                  />
                  <button
                    type="submit"
                    disabled={!message.trim() || !isConnected}
                    className={`p-3 rounded-lg transition ${
                      message.trim() && isConnected
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <FaPaperPlane />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OnePatientChat;
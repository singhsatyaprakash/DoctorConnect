const DoctorPreviewModal = ({ data, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white max-w-lg w-full rounded-xl shadow-lg p-6 relative">

        <h2 className="text-xl font-bold mb-4 text-center">
          Preview Your Details
        </h2>

        <div className="space-y-3 text-sm text-gray-700">
          <p><strong>Name:</strong> {data.name}</p>
          <p><strong>Email:</strong> {data.email}</p>
          <p><strong>Phone:</strong> {data.phone}</p>

          <hr />

          <p><strong>Specialization:</strong> {data.specialization}</p>
          <p><strong>Experience:</strong> {data.experience} years</p>
          <p><strong>Qualifications:</strong> {data.qualifications}</p>
          <p><strong>Languages:</strong> {data.languages}</p>

          <hr />

          <p><strong>Chat Fee:</strong> ₹{data.chatFee}</p>
          <p><strong>Voice Fee:</strong> ₹{data.voiceFee}</p>
          <p><strong>Video Fee:</strong> ₹{data.videoFee}</p>
          <p>
            <strong>Availability:</strong>{" "}
            {data.fromTime} – {data.toTime}
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full border border-gray-300 py-2 rounded-lg hover:bg-gray-100 transition"
        >
          Close Preview
        </button>
      </div>
    </div>
  );
};

export default DoctorPreviewModal;

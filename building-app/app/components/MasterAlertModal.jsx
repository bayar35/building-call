'use client';
import { useState, useEffect } from 'react';

export default function MasterAlertModal({ offer, masterId, onAccepted, onClose }) {
  const [timeLeft, setTimeLeft] = useState(offer.timeoutSeconds || 10);

  useEffect(() => {
    if (timeLeft <= 0) {
      onClose();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onClose]);

  const handleAccept = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000'}/api/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: offer.jobId,
          masterId: masterId,
          action: 'ACCEPT'
        })
      });
      const data = await res.json();
      if (data.success) {
        onAccepted(offer); // Зөвшөөрсөн ажлыг профайл руу дамжуулах
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000'}/api/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: offer.jobId,
          masterId: masterId,
          action: 'REJECT'
        })
      });
    } catch (err) {
      console.error(err);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border-4 border-amber-500 animate-bounce-short">
        <span className="bg-amber-100 text-amber-800 text-xs font-black px-3 py-1 rounded-full uppercase">
          🚨 Убер Урилга Ирлээ
        </span>
        <h2 className="text-2xl font-black text-slate-900 mt-4">{offer.serviceType}</h2>
        <p className="text-sm text-gray-600 mt-1">Захиалагч: <span className="font-bold text-slate-800">{offer.clientName}</span></p>

        <div className="my-6">
          <div className="text-5xl font-black text-red-600 tracking-wider">
            00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
          </div>
          <p className="text-xs text-gray-400 mt-1">Хугацаанд нь хариулахгүй бол дараагийн мастер руу шилжинэ</p>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl text-xs text-gray-600 mb-6 text-left border">
          <p>💰 {offer.escrowNote}</p>
          <p className="mt-1">🏷️ Платформ шимтгэл: <span className="font-bold">{offer.platformFee}</span></p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={handleReject}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-2xl transition-all"
          >
            Татгалзах
          </button>
          <button 
            onClick={handleAccept}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-2xl shadow-lg shadow-emerald-600/30 transition-all text-lg"
          >
            Зөвшөөрөх
          </button>
        </div>
      </div>
    </div>
  );
}
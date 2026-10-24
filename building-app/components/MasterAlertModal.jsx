'use client';
import { useState, useEffect } from 'react';

export default function MasterAlertModal({ offer, masterId, onClose }) {
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleRespond('REJECT');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleRespond = async (action) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000'}/api/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: offer.jobId,
          masterId: masterId,
          action: action
        })
      });
    } catch (err) {
      console.error(err);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border-4 border-amber-500 text-center">
        <span className="inline-block bg-amber-100 text-amber-800 text-xs px-3 py-1 rounded-full font-black">
          УБЕР УРИЛГА ИРЛЭЭ
        </span>

        <h3 className="text-xl font-black mt-3 text-gray-900">{offer.serviceType}</h3>
        <p className="text-sm text-gray-500 mt-1">Захиалагч: <span className="font-bold text-gray-800">{offer.clientName}</span></p>

        <div className="my-6">
          <div className="text-5xl font-black text-red-600 tracking-tight animate-pulse">
            00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
          </div>
          <p className="text-xs text-gray-400 mt-2">1 минутад хариулахгүй бол дараагийн мастер руу шилжинэ</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleRespond('ACCEPT')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl text-base"
          >
            ЗӨВШӨӨРӨХ
          </button>
          <button
            onClick={() => handleRespond('REJECT')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-4 rounded-xl text-base"
          >
            Татгалзах
          </button>
        </div>
      </div>
    </div>
  );
}
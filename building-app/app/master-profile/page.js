'use client';
import { useState } from 'react';
import io from 'socket.io-client';
import MasterAlertModal from '../components/MasterAlertModal';

let socket;

export default function MasterProfilePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ masterId: '', name: '', phone: '' });
  const [masterInfo, setMasterInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [offerData, setOfferData] = useState(null);
  
  // Зөвшөөрсөн ажлуудын жагсаалт болон үнэлгээ (Жишээ нь: 4.8)
  const [acceptedJobs, setAcceptedJobs] = useState([]);
  const [masterRating, setMasterRating] = useState(4.8); 

  const handleLogin = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (loginData.masterId && loginData.name) {
      setIsLoggedIn(true);
      const mId = loginData.masterId.trim();
      setMasterInfo({ ...loginData, masterId: mId });

      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
      socket = io(socketUrl);
      
      socket.emit('register_master', mId);

      socket.on('new_job_offer', (data) => {
        console.log('Шинэ ажил ирлээ:', data);
        setOfferData(data);
      });
    } else {
      setErrorMsg('Мастер ID болон нэрээ бүрэн оруулна уу.');
    }
  };

  // Үнэлгээгээр өнгө тодорхойлох функц
  const getRatingBadgeColor = (rating) => {
    if (rating >= 4.0) return 'bg-emerald-100 text-emerald-800 border-emerald-300'; // Ногоон
    if (rating >= 3.0) return 'bg-amber-100 text-amber-800 border-amber-300';       // Шар
    return 'bg-red-100 text-red-800 border-red-300';                                // Улаан
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black text-amber-600 mb-6 text-center">🔨 Мастерын Кабинет & Ажлын Жагсаалт</h1>

        {!isLoggedIn ? (
          <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
            <form onSubmit={handleLogin} className="space-y-4">
              <p className="text-sm text-gray-600 text-center mb-4">Бүртгүүлсэн Мастер ID болон нэрээ оруулж нэвтэрнэ үү.</p>
              {errorMsg && <p className="text-red-500 text-sm font-bold text-center">{errorMsg}</p>}
              
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Мастер ID:</label>
                <input 
                  type="text" 
                  value={loginData.masterId} 
                  onChange={(e) => setLoginData({ ...loginData, masterId: e.target.value })}
                  required 
                  className="w-full p-3 border rounded-xl"
                  placeholder="мастер 17"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">Таны нэр:</label>
                <input 
                  type="text" 
                  value={loginData.name} 
                  onChange={(e) => setLoginData({ ...loginData, name: e.target.value })}
                  required 
                  className="w-full p-3 border rounded-xl"
                  placeholder="дулмаа"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">Утасны дугаар:</label>
                <input 
                  type="text" 
                  value={loginData.phone} 
                  onChange={(e) => setLoginData({ ...loginData, phone: e.target.value })}
                  className="w-full p-3 border rounded-xl"
                  placeholder="789"
                />
              </div>

              <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-xl shadow-lg">
                Нэвтрэх
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Профайл болон үнэлгээ */}
            <div className="bg-white rounded-2xl shadow-md p-6 flex justify-between items-center border border-gray-100">
              <div>
                <h2 className="text-xl font-black text-slate-800">👤 {masterInfo.name}</h2>
                <p className="text-xs text-gray-500 mt-1">Системийн ID: <span className="font-bold">{masterInfo.masterId}</span></p>
              </div>
              <div className={`px-4 py-2 rounded-2xl border font-black text-lg ${getRatingBadgeColor(masterRating)}`}>
                ⭐ Үнэлгээ: {masterRating}
              </div>
            </div>

            {/* Зөвшөөрсөн болон гүйцэтгэж буй ажлуудын жагсаалт */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h3 className="text-xl font-black text-slate-800 mb-4">📋 Миний Зөвшөөрсөн Ажлын Жагсаалт</h3>
              
              {acceptedJobs.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <div className="w-4 h-4 bg-emerald-500 rounded-full animate-ping mx-auto mb-3"></div>
                  <p className="font-bold text-slate-700">Одоогоор зөвшөөрсөн ажил алга. Захиалагчаас хүсэлт хүлээж байна...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {acceptedJobs.map((job, idx) => (
                    <div key={idx} className="p-5 bg-slate-50 border rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <span className="text-xs bg-amber-500/20 text-amber-800 px-2.5 py-1 rounded-md font-bold">
                          {job.serviceType}
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-lg mt-2">Захиалагч: {job.clientName}</h4>
                        <p className="text-xs text-gray-500 mt-1">📅 Огноо: {new Date().toLocaleString()}</p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1.5 bg-amber-100 text-amber-900 text-xs font-bold rounded-xl">
                          ⏳ Хийгдэж байна
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {offerData && (
        <MasterAlertModal 
          offer={offerData} 
          masterId={masterInfo?.masterId}
          onAccepted={(acceptedJob) => {
            setAcceptedJobs((prev) => [...prev, acceptedJob]);
            setOfferData(null);
          }}
          onClose={() => setOfferData(null)} 
        />
      )}
    </main>
  );
}
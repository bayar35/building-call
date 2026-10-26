'use client';
import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import MasterAlertModal from './components/MasterAlertModal';

let socket;

const CORE_TRADES = [
  { id: 'demolition', name: '1. Өрөөний зохион байгуулалт өөрчлөх, нураах, хог ачилт' },
  { id: 'plumbing', name: '2. Сантехник (Цэвэр, бохир ус, халаалт)' },
  { id: 'electrical', name: '3. Цахилгаан, холбоо, соронзон трек' },
  { id: 'hvac', name: '4. Агааржуулалт, кондиционер' },
  { id: 'windows', name: '5. Цонх, хаалга угсралт' },
  { id: 'gypsum', name: '6. Гипс, өрлөг, тэгшилгээ' },
  { id: 'wpc_boards', name: '7. WPC / SPC Хавтан наалт' },
  { id: 'painting', name: '8. Эмульс, замаа, шпаклевк' },
  { id: 'wallpaper', name: '9. Обой наалт' },
  { id: 'tiling', name: '10. Плитачин (Гидроизоляцитай)' },
  { id: 'flooring', name: '11. Шал, паркет, мужаан' },
];

export default function HomePage() {
  const [selectedTrade, setSelectedTrade] = useState(CORE_TRADES[0].id);
  const [clientName, setClientName] = useState('Баярсайхан');
  const [status, setStatus] = useState('');
  const [activeJobId, setActiveJobId] = useState(null);
  const [acceptedMaster, setAcceptedMaster] = useState(null);

  const [currentRole, setCurrentRole] = useState('client');
  const [offerData, setOfferData] = useState(null);

  // Хэмжээ болон нэмэлт үзүүлэлтүүдийн төлөв
  const [specs, setSpecs] = useState({
    width: '',
    height: '',
    length: '',
    area: '',
    volume: '',
    duration: '',
    advancePayment: ''
  });

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    socket = io(socketUrl);

    socket.on('connect', () => {
      console.log('Socket сервертэй холбогдлоо:', socket.id);
    });

    if (currentRole.startsWith('master_')) {
      socket.emit('register_master', currentRole);
    }

    socket.on('new_job_offer', (data) => {
      console.log('Шинэ ажил ирлээ:', data);
      setOfferData(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [currentRole]);

  const handleCreateJob = async () => {
    setStatus('ТОП Мастерууд руу 10 секундийн Убер урилга илгээж байна...');
    setAcceptedMaster(null);

    const tradeName = CORE_TRADES.find(t => t.id === selectedTrade)?.name;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000'}/api/create-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName,
          serviceType: tradeName,
          specs: specs
        })
      });

      const data = await res.json();
      if (data.success) {
        setActiveJobId(data.jobId);

        socket.on(`job_update_${data.jobId}`, (update) => {
          if (update.status === 'ACCEPTED') {
            setStatus('Мастер ажлыг хүлээн авлаа. Бригад хаягийн дагуу хөдөллөө!');
            setAcceptedMaster(update.masterId);
          } else if (update.status === 'NO_MASTER_AVAILABLE') {
            setStatus('Одоогоор боломжит мастер олдсонгүй.');
          }
        });
      }
    } catch (err) {
      console.error(err);
      setStatus('Сервертэй холбогдож чадсангүй.');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 pb-12">
      <header className="bg-slate-900 text-white py-4 px-6 shadow-md flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-black tracking-wider text-amber-400">PROS-BUILDING</span>
          <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
            Escrow & Uber Model
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Мастер Бүртгүүлэх товчлуур */}
          <a 
            href="/register" 
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg shadow transition-all flex items-center gap-1"
          >
            🔨 Мастер Бүртгүүлэх
          </a>

          {/* Мастер Нэвтрэх товчлуур (Шинээр нэмэгдсэн) */}
          <a 
            href="/master-profile" 
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-2 rounded-lg shadow transition-all flex items-center gap-1"
          >
            🔐 Мастер Нэвтрэх
          </a>

          <div className="flex items-center space-x-2 text-xs ml-2">
            <span className="text-gray-400">Турших горим:</span>
            <select 
              value={currentRole} 
              onChange={(e) => setCurrentRole(e.target.value)}
              className="bg-slate-800 text-white p-1 rounded border border-slate-700"
            >
              <option value="client">Захиалагч</option>
              <option value="master_1">Мастер 1 (ТОП-1)</option>
              <option value="master_2">Мастер 2 (ТОП-2)</option>
              <option value="master_3">Мастер 3 (ТОП-3)</option>
            </select>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto mt-8 px-4">
        {currentRole === 'client' ? (
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <h1 className="text-2xl font-black text-gray-800 mb-2">Засварын Ажил Захиалах</h1>
            <p className="text-sm text-gray-500 mb-6">
              Мэргэшлийн чиглэл болон үнэлгээгээр шалгагдсан мастерууд руу UBER алгоритмаар автоматаар урилга хүргэгдэнэ.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Захиалагчийн Нэр</label>
                <input 
                  type="text" 
                  value={clientName} 
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Захиалах ажлын мэдээлэл</label>
                <select 
                  value={selectedTrade} 
                  onChange={(e) => setSelectedTrade(e.target.value)}
                  className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                >
                  {CORE_TRADES.map(trade => (
                    <option key={trade.id} value={trade.id}>{trade.name}</option>
                  ))}
                </select>
              </div>

              {/* Хэмжээ болон үзүүлэлтүүдийг сонгох / бичих хэсэг */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Өргөн (метр)</label>
                  <input 
                    type="text" 
                    list="width-options"
                    value={specs.width}
                    onChange={(e) => setSpecs({...specs, width: e.target.value})}
                    placeholder="Сонгох эсвэл бичих"
                    className="w-full p-2.5 border rounded-lg bg-white text-sm"
                  />
                  <datalist id="width-options">
                    <option value="3 м" />
                    <option value="4 м" />
                    <option value="5 м" />
                    <option value="6 м" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Өндөр (метр)</label>
                  <input 
                    type="text" 
                    list="height-options"
                    value={specs.height}
                    onChange={(e) => setSpecs({...specs, height: e.target.value})}
                    placeholder="Сонгох эсвэл бичих"
                    className="w-full p-2.5 border rounded-lg bg-white text-sm"
                  />
                  <datalist id="height-options">
                    <option value="2.5 м" />
                    <option value="2.8 м" />
                    <option value="3.0 м" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Урт (метр)</label>
                  <input 
                    type="text" 
                    list="length-options"
                    value={specs.length}
                    onChange={(e) => setSpecs({...specs, length: e.target.value})}
                    placeholder="Сонгох эсвэл бичих"
                    className="w-full p-2.5 border rounded-lg bg-white text-sm"
                  />
                  <datalist id="length-options">
                    <option value="5 м" />
                    <option value="6 м" />
                    <option value="8 м" />
                    <option value="10 м" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Талбай (м2)</label>
                  <input 
                    type="text" 
                    list="area-options"
                    value={specs.area}
                    onChange={(e) => setSpecs({...specs, area: e.target.value})}
                    placeholder="Сонгох эсвэл бичих"
                    className="w-full p-2.5 border rounded-lg bg-white text-sm"
                  />
                  <datalist id="area-options">
                    <option value="20 м²" />
                    <option value="35 м²" />
                    <option value="50 м²" />
                    <option value="80 м²" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Эзэлхүүн (м3)</label>
                  <input 
                    type="text" 
                    list="volume-options"
                    value={specs.volume}
                    onChange={(e) => setSpecs({...specs, volume: e.target.value})}
                    placeholder="Сонгох эсвэл бичих"
                    className="w-full p-2.5 border rounded-lg bg-white text-sm"
                  />
                  <datalist id="volume-options">
                    <option value="50 м³" />
                    <option value="100 м³" />
                    <option value="150 м³" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Хугацаа</label>
                  <input 
                    type="text" 
                    list="duration-options"
                    value={specs.duration}
                    onChange={(e) => setSpecs({...specs, duration: e.target.value})}
                    placeholder="Сонгох эсвэл бичих"
                    className="w-full p-2.5 border rounded-lg bg-white text-sm"
                  />
                  <datalist id="duration-options">
                    <option value="1 хоног" />
                    <option value="3 хоног" />
                    <option value="7 хоног" />
                    <option value="14 хоног" />
                  </datalist>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Урьдчилсан төлбөр</label>
                  <input 
                    type="text" 
                    list="payment-options"
                    value={specs.advancePayment}
                    onChange={(e) => setSpecs({...specs, advancePayment: e.target.value})}
                    placeholder="Сонгох эсвэл шууд бичих (Жишээ: 30%, 500,000₮)"
                    className="w-full p-2.5 border rounded-lg bg-white text-sm"
                  />
                  <datalist id="payment-options">
                    <option value="30% Эскроу урьдчилгаа" />
                    <option value="50% Эскроу урьдчилгаа" />
                    <option value="100% Эскроу урьдчилгаа" />
                  </datalist>
                </div>
              </div>

              <button 
                onClick={handleCreateJob}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-4 rounded-xl shadow-lg shadow-amber-500/20 transition-all text-lg"
              >
                Мастер Хайх (10 Секундийн Таймер Эхлүүлэх)
              </button>
            </div>

            {status && (
              <div className="mt-6 p-4 rounded-xl bg-slate-100 border border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-amber-500 rounded-full animate-ping"></div>
                  <p className="text-sm font-semibold text-slate-800">{status}</p>
                </div>
              </div>
            )}

            {acceptedMaster && (
              <div className="mt-6 p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <h3 className="text-lg font-bold">🎉 Мастертай Холбогдлоо!</h3>
                <p className="text-sm mt-1">Баталгаажсан Мастер: <span className="font-extrabold">{acceptedMaster}</span></p>
                <p className="text-xs text-emerald-700 mt-2">
                  * Төлбөр 100% Эскроу дансанд байршсаны дараа ажил эхэлнэ (5% платформ шимтгэл суутгагдана).
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
            <h2 className="text-xl font-bold">Мастерын Симуляцийн Дэлгэц</h2>
            <p className="text-sm text-gray-500 mt-1">Одоогийн бүртгэлтэй ID: <span className="font-bold text-amber-600">{currentRole}</span></p>
            <p className="text-xs text-gray-400 mt-4">Захиалагч цонхноос ажил захиалахад энд 10 секундийн таймертай поп-ап гарч ирнэ.</p>
          </div>
        )}
      </div>

      {offerData && (
        <MasterAlertModal 
          offer={offerData} 
          masterId={currentRole}
          onClose={() => setOfferData(null)} 
        />
      )}
    </main>
  );
}
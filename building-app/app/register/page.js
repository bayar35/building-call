'use client';
import { useState } from 'react';
import Link from 'next/link';

const CORE_TRADES = [
  { id: 'demolition', name: '1. Нураалт, суваглал, хог ачилт' },
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

export default function MasterRegisterPage() {
  const [formData, setFormData] = useState({
    masterId: '',
    name: '',
    phone: '',
    serviceType: CORE_TRADES[8].name, // '9. Обой наалт'
    rating: 5.0
  });

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000'}/api/register-master`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(`✅ Амжилттай бүртгэгдлээ! Мастер ID: ${data.masterId}`);
        setIsRegistered(true);
      } else {
        setMessage(`❌ Алдаа гарлаа: ${data.error || 'Бүртгэгдсэнгүй'}`);
      }
    } catch (err) {
      setMessage(`❌ Сервертэй холбогдоход алдаа гарлаа: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <h2 className="text-2xl font-black text-amber-600 mb-6 text-center">🔨 Мастер / Бригад Бүртгүүлэх</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Мастер ID (Заавал биш):</label>
            <input 
              type="text" 
              name="masterId" 
              value={formData.masterId} 
              onChange={handleChange} 
              placeholder="Жишээ: master_6"
              className="w-full p-3 border rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1">Бригад / Мастерын нэр:</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              required 
              placeholder="Бат-Эрдэнэ Бригад"
              className="w-full p-3 border rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1">Утасны дугаар:</label>
            <input 
              type="text" 
              name="phone" 
              value={formData.phone} 
              onChange={handleChange} 
              required 
              placeholder="99112233"
              className="w-full p-3 border rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1">Мэргэжлийн чиглэл:</label>
            <select 
              name="serviceType" 
              value={formData.serviceType} 
              onChange={handleChange}
              className="w-full p-3 border rounded-xl bg-white"
            >
              {CORE_TRADES.map(trade => (
                <option key={trade.id} value={trade.name}>{trade.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1">Үнэлгээ (1.0 - 5.0):</label>
            <input 
              type="number" 
              step="0.1" 
              max="5.0" 
              min="1.0" 
              name="rating" 
              value={formData.rating} 
              onChange={handleChange} 
              required
              className="w-full p-3 border rounded-xl"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-xl shadow-lg transition-all"
          >
            {loading ? 'Бүртгэж байна...' : 'MongoDB-д Бүртгүүлэх'}
          </button>
        </form>

        {message && (
          <div className="mt-6 p-4 rounded-xl bg-slate-100 text-center">
            <p className="font-bold text-sm text-emerald-700">{message}</p>
            {isRegistered && (
              <Link 
                href="/master-profile" 
                className="mt-4 inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-xl shadow transition-all text-sm"
              >
                👉 Мастер Профайл руу нэвтрэх
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
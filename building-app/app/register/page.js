'use class'; // эсвэл 'use client'
import { useState } from 'react';

export default function MasterRegisterPage() {
  const [formData, setFormData] = useState({
    masterId: '',
    name: '',
    phone: '',
    profession: '10. Плитачин (Гидроизоляцитай)',
    experienceYears: '',
    professionalLicenseImg: '',
    idCardImg: '',
    referencePhone: ''
  });

  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('https://building-call.onrender.com/api/register-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Мастер амжилттай бүртгэгдлээ! 🎉');
      } else {
        setMessage('Алдаа гарлаа: ' + data.error);
      }
    } catch (err) {
      setMessage('Сүлжээний алдаа гарлаа.');
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">🛠️ Мастер Бүртгүүлэх Хэсэг</h1>
      {message && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{message}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Мастер ID (Жишээ нь: master_6)</label>
          <input type="text" required className="w-full p-2 border rounded" 
            value={formData.masterId} onChange={e => setFormData({...formData, masterId: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Овог Нэр</label>
          <input type="text" required className="w-full p-2 border rounded" 
            value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Утасны дугаар</label>
          <input type="text" required className="w-full p-2 border rounded" 
            value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Мэргэжлийн чиглэл</label>
          <input type="text" required className="w-full p-2 border rounded" 
            value={formData.profession} onChange={e => setFormData({...formData, profession: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Ажилласан жил</label>
          <input type="number" required className="w-full p-2 border rounded" 
            value={formData.experienceYears} onChange={e => setFormData({...formData, experienceYears: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Мэргэжлийн үнэмлэхний зураг (URL)</label>
          <input type="text" className="w-full p-2 border rounded" 
            value={formData.professionalLicenseImg} onChange={e => setFormData({...formData, professionalLicenseImg: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Иргэний үнэмлэхний зураг (URL)</label>
          <input type="text" className="w-full p-2 border rounded" 
            value={formData.idCardImg} onChange={e => setFormData({...formData, idCardImg: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Лавлах утас</label>
          <input type="text" className="w-full p-2 border rounded" 
            value={formData.referencePhone} onChange={e => setFormData({...formData, referencePhone: e.target.value})} />
        </div>
        <button type="submit" className="w-full bg-orange-600 text-white p-3 rounded font-bold hover:bg-orange-700">
          Бүртгүүлэх
        </button>
      </form>
    </div>
  );
}
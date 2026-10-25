'use client';
import { useState } from 'react';

export default function MasterRegisterPage() {
  const [formData, setFormData] = useState({
    masterId: '',
    name: '',
    phone: '',
    serviceType: '10. Плитачин (Гидроизоляцитай)',
    rating: 5.0
  });

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

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
      const res = await fetch('https://building-call.onrender.com/api/register-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(`✅ Амжилттай бүртгэгдлээ! Мастер ID: ${data.masterId}`);
        setFormData({
          masterId: '',
          name: '',
          phone: '',
          serviceType: '10. Плитачин (Гидроизоляцитай)',
          rating: 5.0
        });
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
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '30px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#d97706', marginBottom: '20px', textAlign: 'center' }}>🔨 Мастер / Бригад Бүртгүүлэх</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Мастер ID (Заавал биш):</label>
          <input 
            type="text" 
            name="masterId" 
            value={formData.masterId} 
            onChange={handleChange} 
            placeholder="Жишээ: master_6 (Хоосон бол автоматаар үүснэ)"
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Бригад / Мастерын нэр:</label>
          <input 
            type="text" 
            name="name" 
            value={formData.name} 
            onChange={handleChange} 
            required 
            placeholder="Жишээ: Бат-Эрдэнэ Бригад"
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Утасны дугаар:</label>
          <input 
            type="text" 
            name="phone" 
            value={formData.phone} 
            onChange={handleChange} 
            required 
            placeholder="99112233"
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Мэргэжлийн чиглэл:</label>
          <select 
            name="serviceType" 
            value={formData.serviceType} 
            onChange={handleChange}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
          >
            <option value="10. Плитачин (Гидроизоляцитай)">10. Плитачин (Гидроизоляцитай)</option>
            <option value="Обой хийх">Обой хийх</option>
            <option value="Шал паркет суулгах">Шал паркет суулгах</option>
            <option value="Цахилгааны ажил">Цахилгааны ажил</option>
            <option value="Сантехникийн ажил">Сантехникийн ажил</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Үнэлгээ (1.0 - 5.0):</label>
          <input 
            type="number" 
            step="0.1" 
            max="5.0" 
            min="1.0" 
            name="rating" 
            value={formData.rating} 
            onChange={handleChange} 
            required
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            background: '#d97706', 
            color: '#fff', 
            padding: '12px', 
            border: 'none', 
            borderRadius: '6px', 
            fontWeight: 'bold', 
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          {loading ? 'Бүртгэж байна...' : 'MongoDB-д Бүртгүүлэх'}
        </button>
      </form>

      {message && (
        <p style={{ marginTop: '20px', textAlign: 'center', fontWeight: 'bold', color: message.includes('✅') ? 'green' : 'red' }}>
          {message}
        </p>
      )}
    </div>
  );
}
'use client';
import { useEffect, useState } from 'react';

export default function JobHistoryPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://building-call.onrender.com/api/jobs')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setJobs(data.jobs);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Алдаа гарлаа:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">📋 Захиалга & Убер Диспетчерын Түүх</h1>
      
      {loading ? (
        <p className="text-gray-600">Мэдээллийг ачаалж байна...</p>
      ) : jobs.length === 0 ? (
        <p className="text-gray-600">Одоогоор хадгалагдсан захиалгын түүх байхгүй байна.</p>
      ) : (
        <div className="space-y-6">
          {jobs.map((job) => (
            <div key={job.jobId} className="bg-white shadow-md rounded-lg p-5 border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-lg text-orange-600">Захиалга ID: {job.jobId}</span>
                <span className={`px-3 py-1 rounded text-xs font-semibold ${
                  job.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                  job.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {job.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 mb-4">
                <p><strong>Захиалагч:</strong> {job.clientName}</p>
                <p><strong>Мэргэжил/Үйлчилгээ:</strong> {job.serviceType}</p>
                <p><strong>Батлагдсан Мастер:</strong> {job.acceptedMasterId || 'Одоогоор байхгүй'}</p>
                <p><strong>Үүсгэсэн огноо:</strong> {new Date(job.createdAt).toLocaleString()}</p>
              </div>

              {/* Диспетчер болон урилгын түүх */}
              <div className="border-t pt-3">
                <h4 className="font-semibold text-sm text-gray-800 mb-2">🔄 Мастеруудад явуулсан урилгын лог:</h4>
                {job.dispatchHistory && job.dispatchHistory.length > 0 ? (
                  <ul className="space-y-2 text-xs">
                    {job.dispatchHistory.map((hist, idx) => (
                      <li key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded border">
                        <span>
                          Мастер ID: <strong className="text-orange-600">{hist.masterId}</strong> — 
                          Төлөв: <span className={`font-bold ${
                            hist.action === 'ACCEPT' ? 'text-green-600' :
                            hist.action === 'REJECT' ? 'text-red-600' :
                            hist.action === 'TIMEOUT' ? 'text-orange-500' : 'text-gray-600'
                          }`}>{hist.action}</span>
                        </span>
                        <span className="text-gray-500">
                          {hist.sentAt ? new Date(hist.sentAt).toLocaleTimeString() : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-500">Диспетчер лог байхгүй байна.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
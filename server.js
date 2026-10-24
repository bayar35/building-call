// server.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const TIMEOUT_DURATION = 60 * 1000; // 60 секунд (1 минут)
const activeSockets = {}; // masterId -> socketId

// Санах ойд ажлуудыг хадгалах сан (Database simulation)
const jobsDB = new Map();

io.on('connection', (socket) => {
  console.log(`Шинэ төхөөрөмж холбогдлоо: ${socket.id}`);

  // Мастер системд холбогдоход ID-г бүртгэх
  socket.on('register_master', (masterId) => {
    activeSockets[masterId] = socket.id;
    console.log(`Мастер онлайн болов [Master ID: ${masterId}]`);
  });

  socket.on('disconnect', () => {
    for (let mId in activeSockets) {
      if (activeSockets[mId] === socket.id) {
        delete activeSockets[mId];
        break;
      }
    }
  });
});

// 1 Минутын Убер Диспатч Алгоритм
async function dispatchJobToNextMaster(jobId) {
  const job = jobsDB.get(jobId);
  if (!job || job.status !== 'PENDING') return;

  const currentIdx = job.currentMasterIndex;
  const masters = job.assignedMasterIds;

  // Хэрэв бүх мастеруудад хүсэлт очиж дууссан бол
  if (currentIdx >= masters.length) {
    job.status = 'NO_MASTER_AVAILABLE';
    io.emit(`job_update_${jobId}`, { status: 'NO_MASTER_AVAILABLE' });
    console.log(`[СИСТЕМ]: Захиалга ${jobId} дээр бүх мастерууд хариу өгсөнгүй.`);
    return;
  }

  const currentMasterId = masters[currentIdx];
  const socketId = activeSockets[currentMasterId];

  console.log(`\n--------------------------------------------------`);
  console.log(`[УРИЛГА ИЛГЭЭВ]: Мастер [${currentMasterId}] руу 1 минутын урилга явлаа...`);
  console.log(`[ТАЙМЕР]: 1 минут (60 сек) тоолж эхэллээ...`);

  // Мастер онлайн байгаа бол Real-time Socket мэдэгдэл илгээх
  if (socketId) {
    io.to(socketId).emit('new_job_offer', {
      jobId: job.id,
      clientName: job.clientName,
      serviceType: job.serviceType,
      timeoutSeconds: 60
    });
  }

  // 60 секундийн таймер эхлүүлэх
  setTimeout(() => {
    const checkJob = jobsDB.get(jobId);
    if (checkJob && checkJob.status === 'PENDING' && checkJob.currentMasterIndex === currentIdx) {
      console.log(`[ХУГАЦАА ДУУСАВ]: Мастер [${currentMasterId}] 1 минутад хариулсангүй!`);
      checkJob.currentMasterIndex += 1;
      dispatchJobToNextMaster(jobId); // Дараагийн мастер руу автоматаар шилжих
    }
  }, TIMEOUT_DURATION);
}

// REST API: Шинэ ажил үүсгэх
app.post('/api/create-job', (req, res) => { 
  try {
    const { clientName, serviceType, assignedMasterIds } = req.body;
    const jobId = 'job_' + Date.now();
    
    const newJob = {
      id: jobId,
      clientName: clientName || 'Захиалагч',
      serviceType: serviceType || 'Засварын ажил',
      status: 'PENDING',
      currentMasterIndex: 0,
      assignedMasterIds: assignedMasterIds || ['master_1', 'master_2', 'master_3', 'master_4', 'master_5'],
      acceptedMasterId: null
    };

    jobsDB.set(jobId, newJob);
    res.json({ success: true, jobId });
    
    // Убер диспатч ротацийг эхлүүлэх
    dispatchJobToNextMaster(jobId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REST API: Мастер ЗӨВШӨӨРӨХ / ТАТГАЛЗАХ
app.post('/api/respond', (req, res) => {
  try {
    const { jobId, masterId, action } = req.body;
    const job = jobsDB.get(jobId);

    if (!job || job.status !== 'PENDING') {
      return res.status(400).json({ message: "Учралт дууссан эсвэл хаагдсан байна." });
    }

    if (action === 'ACCEPT') {
      job.status = 'ACCEPTED';
      job.acceptedMasterId = masterId;
      io.emit(`job_update_${jobId}`, { status: 'ACCEPTED', masterId });
      console.log(`\n==================================================`);
      console.log(`[АМЖИЛТТАЙ]: Мастер [${masterId}] ажлыг ЗӨВШӨӨРЛӨӨ!`);
      console.log(`==================================================`);
      return res.json({ success: true, message: "Ажил баталгаажлаа." });
    }

    if (action === 'REJECT') {
      console.log(`\n[ТАТГАЛЗАВ]: Мастер [${masterId}] ажлаас татгалзлаа.`);
      job.currentMasterIndex += 1;
      dispatchJobToNextMaster(jobId); // Шууд дараагийн мастер руу шилжих
      return res.json({ success: true, message: "Татгалзлаа." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Pros-Building Сервер ${PORT} порт дээр амжилттай ажиллаж байна.`);
});
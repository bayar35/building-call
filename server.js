// server.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
require('dotenv').config();

const Job = require('./models/Job');
const Master = require('./models/Master');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Atlas холболт
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB Atlas-тай амжилттай холбогдлоо!');
}).catch(err => {
  console.error('MongoDB холбогдох үед алдаа гарлаа:', err);
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const TIMEOUT_DURATION = 60 * 1000; // 60 секунд (1 минут)
const activeSockets = {}; // masterId -> socketId

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

// 1 Минутын Убер Диспатч Алгоритм (MongoDB дээр)
async function dispatchJobToNextMaster(jobId) {
  const job = await Job.findOne({ jobId });
  if (!job || job.status !== 'PENDING') return;

  const currentIdx = job.currentMasterIndex;
  const masters = job.assignedMasterIds;

  // Хэрэв бүх мастеруудад хүсэлт очиж дууссан бол
  if (currentIdx >= masters.length) {
    job.status = 'NO_MASTER_AVAILABLE';
    await job.save();
    io.emit(`job_update_${jobId}`, { status: 'NO_MASTER_AVAILABLE' });
    console.log(`[СИСТЕМ]: Захиалга ${jobId} дээр бүх мастерууд хариу өгсөнгүй.`);
    return;
  }

  const currentMasterId = masters[currentIdx];
  const socketId = activeSockets[currentMasterId];

  console.log(`\n--------------------------------------------------`);
  console.log(`[УРИЛГА ИЛГЭЭВ]: Мастер [${currentMasterId}] руу 1 минутын урилга явлаа...`);
  console.log(`[ТАЙМЕР]: 1 минут (60 сек) тоолж эхэллээ...`);

  // Диспатч түүхэнд шинээр нэмэх
  job.dispatchHistory.push({
    masterId: currentMasterId,
    sentAt: new Date(),
    action: 'PENDING'
  });
  await job.save();

  // Мастер онлайн байгаа бол Real-time Socket мэдэгдэл илгээх
  if (socketId) {
    io.to(socketId).emit('new_job_offer', {
      jobId: job.jobId,
      clientName: job.clientName,
      serviceType: job.serviceType,
      timeoutSeconds: 60
    });
  }

  // 60 секундийн таймер эхлүүлэх
  setTimeout(async () => {
    const checkJob = await Job.findOne({ jobId });
    if (checkJob && checkJob.status === 'PENDING' && checkJob.currentMasterIndex === currentIdx) {
      console.log(`[ХУГАЦАА ДУУСАВ]: Мастер [${currentMasterId}] 1 минутад хариулсангүй!`);
      
      const historyItem = checkJob.dispatchHistory.find(h => h.masterId === currentMasterId && h.action === 'PENDING');
      if (historyItem) {
        historyItem.action = 'TIMEOUT';
        historyItem.respondedAt = new Date();
      }

      checkJob.currentMasterIndex += 1;
      await checkJob.save();
      dispatchJobToNextMaster(jobId); // Дараагийн мастер руу шилжих
    }
  }, TIMEOUT_DURATION);
}

// REST API: Бүх захиалгын түүх болон диспетчер логуудыг авах
app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 }); // Хамгийн шинэ нь эхэндээ гарна
    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REST API: Шинэ ажил үүсгэх (Database руу хадгалах)
app.post('/api/create-job', async (req, res) => {
  try {
    const { clientName, serviceType, assignedMasterIds } = req.body;
    const jobId = 'job_' + Date.now();
    
    const newJob = new Job({
      jobId,
      clientName: clientName || 'Захиалагч',
      serviceType: serviceType || 'Засварын ажил',
      status: 'PENDING',
      currentMasterIndex: 0,
      assignedMasterIds: assignedMasterIds || ['master_1', 'master_2', 'master_3', 'master_4', 'master_5'],
      acceptedMasterId: null,
      dispatchHistory: []
    });

    await newJob.save();
    res.json({ success: true, jobId });
    
    // Убер диспатч ротацийг эхлүүлэх
    dispatchJobToNextMaster(jobId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REST API: Мастер ЗӨВШӨӨРӨХ / ТАТГАЛЗАХ
app.post('/api/respond', async (req, res) => {
  try {
    const { jobId, masterId, action } = req.body;
    const job = await Job.findOne({ jobId });

    if (!job || job.status !== 'PENDING') {
      return res.status(400).json({ message: "Учралт дууссан эсвэл хаагдсан байна." });
    }

    const historyItem = job.dispatchHistory.find(h => h.masterId === masterId && h.action === 'PENDING');

    if (action === 'ACCEPT') {
      job.status = 'ACCEPTED';
      job.acceptedMasterId = masterId;
      
      if (historyItem) {
        historyItem.action = 'ACCEPT';
        historyItem.respondedAt = new Date();
      }

      await job.save();

      io.emit(`job_update_${jobId}`, { status: 'ACCEPTED', masterId });
      console.log(`\n==================================================`);
      console.log(`[АМЖИЛТТАЙ]: Мастер [${masterId}] ажлыг ЗӨВШӨӨРЛӨӨ!`);
      console.log(`==================================================`);
      return res.json({ success: true, message: "Ажил баталгаажлаа." });
    }

    if (action === 'REJECT') {
      console.log(`\n[ТАТГАЛЗАВ]: Мастер [${masterId}] ажлаас татгалзлаа.`);
      
      if (historyItem) {
        historyItem.action = 'REJECT';
        historyItem.respondedAt = new Date();
      }

      job.currentMasterIndex += 1;
      await job.save();

      dispatchJobToNextMaster(jobId); // Шууд дараагийн мастер руу шилжих
      return res.json({ success: true, message: "Татгалзлаа." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REST API: Мастер бүртгэх
app.post('/api/register-master', async (req, res) => {
  try {
    const masterData = req.body;
    const newMaster = new Master(masterData);
    await newMaster.save();
    res.json({ success: true, message: "Мастер амжилттай бүртгэгдлээ", masterId: newMaster.masterId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Pros-Building Сервер ${PORT} порт дээр амжилттай ажиллаж байна.`);
});
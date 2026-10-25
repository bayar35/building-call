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
mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log('MongoDB Atlas-тай амжилттай холбогдлоо!');
}).catch(err => {
  console.error('MongoDB холбогдох үед алдаа гарлаа:', err);
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const TIMEOUT_DURATION = 10 * 1000; // 10 секунд (Хүсэлт хүлээх хугацаа)
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

// 10 Секундийн Убер Диспатч Алгоритм (MongoDB болон үнэлгээгээр шүүх)
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
  console.log(`[УРИЛГА ИЛГЭЭВ]: Мастер [${currentMasterId}] руу 10 секундийн урилга явлаа...`);
  console.log(`[ТАЙМЕР]: 10 секунд тоолж эхэллээ...`);

  // Диспатч түүхэнд шинээр нэмэх
  job.dispatchHistory.push({
    masterId: currentMasterId,
    sentAt: new Date(),
    action: 'PENDING'
  });
  await job.save();

  // Мастер онлайн байгаа бол Real-time Socket мэдэгдэл илгээх (Эскроу болон 5% шимтгэлийн нөхцөлтэйгээр)
  if (socketId) {
    io.to(socketId).emit('new_job_offer', {
      jobId: job.jobId,
      clientName: job.clientName,
      serviceType: job.serviceType,
      timeoutSeconds: 10,
      escrowNote: "Төлбөр 100% Эскроу дансанд байршсаны дараа ажил эхэлнэ.",
      platformFee: "5%"
    });
  }

  // 10 секундийн таймер эхлүүлэх
  setTimeout(async () => {
    const checkJob = await Job.findOne({ jobId });
    if (checkJob && checkJob.status === 'PENDING' && checkJob.currentMasterIndex === currentIdx) {
      console.log(`[ХУГАЦАА ДУУСАВ]: Мастер [${currentMasterId}] 10 секундад хариулсангүй!`);
      
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

// REST API: Бүх захиалгын түүх авах
app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REST API: Шинэ ажил үүсгэх (Сонгосон чиглэл болон өндөр үнэлгээтэй мастеруудаар эрэмбэлэх)
app.post('/api/create-job', async (req, res) => {
  try {
    const { clientName, serviceType } = req.body;
    const jobId = 'job_' + Date.now();
    
    // MongoDB-гээс тухайн чиглэлийн мастеруудыг шүүж, үнэлгээгээр нь өндрөөс нь эхлэн эрэмбэлэх
    const qualifiedMasters = await Master.find({ serviceType: serviceType }).sort({ rating: -1 });
    const masterIds = qualifiedMasters.length > 0 
      ? qualifiedMasters.map(m => m.masterId) 
      : ['master_1', 'master_2', 'master_3']; // Хэрэв бүртгэгдээгүй бол үндсэн симуляцийн ID-нууд

    const newJob = new Job({
      jobId,
      clientName: clientName || 'Захиалагч',
      serviceType: serviceType || 'Засварын ажил',
      status: 'PENDING',
      currentMasterIndex: 0,
      assignedMasterIds: masterIds,
      acceptedMasterId: null,
      dispatchHistory: []
    });

    await newJob.save();
    res.json({ success: true, jobId, matchedMastersCount: masterIds.length });
    
    // 10 секундийн Убер диспатч ротацийг эхлүүлэх
    dispatchJobToNextMaster(jobId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REST API: Мастер ЗӨВШӨӨРӨХ / ТАТГАЛЗАХ (Эскроу болон 5% шимтгэлийг зөвшөөрөх)
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

      io.emit(`job_update_${jobId}`, { 
        status: 'ACCEPTED', 
        masterId,
        message: "Мастер ажлыг хүлээн авлаа. Бригад хаягийн дагуу хөдөллөө!" 
      });

      console.log(`\n==================================================`);
      console.log(`[АМЖИЛТТАЙ]: Мастер [${masterId}] Эскроу болон 5% шимтгэлийг зөвшөөрч ажлыг авлаа!`);
      console.log(`==================================================`);
      return res.json({ success: true, message: "Ажил амжилттай баталгаажлаа. Бригад хаягийн дагуу хөдөллөө." });
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

// REST API: Мастер бүртгэх (MongoDB дээр хадгалах)
app.post('/api/register-master', async (req, res) => {
  try {
    const { masterId, name, serviceType, rating, phone } = req.body;
    
    const newMaster = new Master({
      masterId: masterId || ('master_' + Date.now()),
      name,
      serviceType,
      rating: rating || 5.0,
      phone
    });

    await newMaster.save();
    res.json({ success: true, message: "Мастер амжилттай бүртгэгдэж MongoDB-д хадгалагдлаа", masterId: newMaster.masterId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Pros-Building Сервер ${PORT} порт дээр амжилттай ажиллаж байна.`);
});
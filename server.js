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

const TIMEOUT_DURATION = 10 * 1000; // 10 секунд
const activeSockets = {}; // masterId -> socketId

io.on('connection', (socket) => {
  console.log(`Шинэ төхөөрөмж холбогдлоо: ${socket.id}`);

  socket.on('register_master', (masterId) => {
    activeSockets[masterId] = socket.id;
    console.log(`Мастер онлайн болов [Master ID: ${masterId}] (Socket ID: ${socket.id})`);
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

// 10 Секундийн Диспатч Алгоритм
async function dispatchJobToNextMaster(jobId) {
  const job = await Job.findOne({ jobId });
  if (!job || job.status !== 'PENDING') return;

  const currentIdx = job.currentMasterIndex;
  const masters = job.assignedMasterIds;

  if (currentIdx >= masters.length) {
    job.status = 'NO_MASTER_AVAILABLE';
    await job.save();
    io.emit(`job_update_${jobId}`, { status: 'NO_MASTER_AVAILABLE' });
    console.log(`[СИСТЕМ]: Захиалга ${jobId} дээр боломжит мастерууд хариу өгсөнгүй.`);
    return;
  }

  const currentMasterId = masters[currentIdx];
  const socketId = activeSockets[currentMasterId];

  console.log(`\n[УРИЛГА ИЛГЭЭВ]: Мастер [${currentMasterId}] руу 10 секундийн урилга явлаа... (Socket ID: ${socketId || 'Оффлайн'})`);

  job.dispatchHistory.push({
    masterId: currentMasterId,
    sentAt: new Date(),
    action: 'PENDING'
  });
  await job.save();

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
      dispatchJobToNextMaster(jobId);
    }
  }, TIMEOUT_DURATION);
}

// REST API: Шинэ ажил үүсгэх (Уян хатан шүүлтүүр болон fallback-тай)
app.post('/api/create-job', async (req, res) => {
  try {
    const { clientName, serviceType } = req.body;
    const jobId = 'job_' + Date.now();
    
    // Тухайн чиглэлээр эсвэл түлхүүр үгээр мастер хайх
    let qualifiedMasters = await Master.find({ 
      serviceType: { $regex: new RegExp(serviceType.trim(), 'i') } 
    }).sort({ rating: -1 });

    let masterIds = [];
    if (qualifiedMasters.length > 0) {
      masterIds = qualifiedMasters.map(m => m.masterId);
    } else {
      // Хэрэв яг таарсан мастер олдохгүй бол системд бүртгэлтэй бүх мастеруудыг хамруулах
      const allMasters = await Master.find().sort({ rating: -1 });
      masterIds = allMasters.length > 0 ? allMasters.map(m => m.masterId) : ['master_1'];
    }

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

      io.emit(`job_update_${jobId}`, { 
        status: 'ACCEPTED', 
        masterId,
        message: "Мастер ажлыг хүлээн авлаа. Бригад хаягийн дагуу хөдөллөө!" 
      });

      return res.json({ success: true, message: "Ажил амжилттай баталгаажлаа." });
    }

    if (action === 'REJECT') {
      if (historyItem) {
        historyItem.action = 'REJECT';
        historyItem.respondedAt = new Date();
      }

      job.currentMasterIndex += 1;
      await job.save();

      dispatchJobToNextMaster(jobId);
      return res.json({ success: true, message: "Татгалзлаа." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REST API: Мастер бүртгэх
app.post('/api/register-master', async (req, res) => {
  try {
    const { masterId, name, serviceType, rating, phone } = req.body;
    
    const finalMasterId = masterId && masterId.trim() !== '' ? masterId.trim() : ('master_' + phone);

    const newMaster = new Master({
      masterId: finalMasterId,
      name,
      serviceType,
      rating: rating ? Number(rating) : 5.0,
      phone
    });

    await newMaster.save();
    res.json({ success: true, message: "Мастер амжилттай бүртгэгдлээ", masterId: finalMasterId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Pros-Building Сервер ${PORT} порт дээр ажиллаж байна.`);
});
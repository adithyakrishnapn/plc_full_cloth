import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { connectDb } from './config/db.js';
import mongoose from 'mongoose';

// Models
import Base from './models/Base.js';
import Process from './models/Process.js';
import Telemetry from './models/Telemetry.js';
import Defect from './models/Defect.js';

// Routes
import apiRoutes from './routes/api.js';
import indexRoutes from './routes/index.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', indexRoutes);

// Start Server
const PORT = process.env.PORT || 5000;

// Change Stream Logic
function startChangeStream() {
  const pipeline = [
    { $match: { operationType: 'insert' } }
  ];

  try {
    const changeStream = Base.watch(pipeline);

    changeStream.on('change', (change) => {
      const doc = change.fullDocument;

      if (doc.type === 'telemetry') {
        io.emit('telemetry_update', doc);
      } else if (doc.type === 'process_summary') {
        if (!doc.endTime) {
          io.emit('process_started', doc);
        } else {
          io.emit('process_ended', doc);
        }
      } else if (doc.type === 'defect') {
        io.emit('defect_detected', doc);
      }
    });

    changeStream.on('error', (err) => {
      console.error("ChangeStream Error:", err.message);
      if (err.message.includes('$changeStream stage is only supported on replica sets')) {
        console.warn("⚠️ Change Streams disabled. Real-time updates via Socket.IO will not work for database inserts.");
      }
    });

    const updateStream = Base.watch([
      { $match: { operationType: 'update' } }
    ]);

    updateStream.on('change', async (change) => {
      const docId = change.documentKey._id;
      const updatedFields = change.updateDescription.updatedFields;

      if (updatedFields && updatedFields.endTime) {
        const doc = await Process.findById(docId);
        if (doc && doc.type === 'process_summary') {
          io.emit('process_ended', doc);
        }
      }
    });

    updateStream.on('error', (err) => {
      console.error("Update stream error:", err.message);
    });

  } catch (error) {
    console.error("Failed to initialize ChangeStream:", error.message);
  }
}

// Socket Connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Connect to DB and start server
connectDb().then(() => {
  startChangeStream();

  // Use httpServer.listen() instead of app.listen()
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log("✅ MongoDB Connected");
    console.log("DB Name:", mongoose.connection.name);
    console.log("Host:", mongoose.connection.host);
  });
}).catch(err => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});
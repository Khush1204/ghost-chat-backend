const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://ghost-chat-ui.vercel.app", 
    methods: ["GET", "POST"],
    credentials: true 
  }
});

// SINGLE SOURCE OF TRUTH: Global room memory
const rooms = {}; 

app.get('/', (req, res) => res.send('👻 Ghost Server: Node Engine Active'));

io.on('connection', (socket) => {
  console.log(`⚡ New Device connected: ${socket.id}`);

  socket.on('join-room', ({ roomId, userName, peerId }) => {
    socket.join(roomId);
    
    if (!rooms[roomId]) rooms[roomId] = [];
    
    // Check if user already exists to avoid duplicates
    const userExists = rooms[roomId].find(u => u.peerId === peerId);
    if (!userExists) {
      rooms[roomId].push({ socketId: socket.id, peerId, userName });
    }

    console.log(`✅ ${userName} joined room: ${roomId}`);

    // 1. Send the FULL ROSTER to the person who just joined
    socket.emit('room-roster', rooms[roomId]);

    // 2. Broadcast to others that a new operative is online
    socket.to(roomId).emit('user-joined', { peerId, userName });
  });

  // 3. Unified Message & File handling
  socket.on('send-message', (data) => {
    // data contains roomId, text, senderName, and optionally file
    io.to(data.roomId).emit('receive-message', data);
  });

  // 4. Clean Disconnect Logic
  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const user = rooms[roomId].find(u => u.socketId === socket.id);
      if (user) {
        rooms[roomId] = rooms[roomId].filter(u => u.socketId !== socket.id);
        
        // Notify the room that the user left
        socket.to(roomId).emit('user-left', { 
          peerId: user.peerId, 
          userName: user.userName 
        });
        
        console.log(`❌ ${user.userName} left room: ${roomId}`);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Ghost Engine live on port ${PORT}`));
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    // ❌ DO NOT USE "*"
    // ✅ Use your EXACT Vercel URL
    origin: "https://ghost-chat-ui.vercel.app", 
    methods: ["GET", "POST"],
    credentials: true 
  }
});

// Track users in memory
const rooms = {};

app.get('/', (req, res) => res.send('👻 Ghost Server: Node Engine Active'));

io.on('connection', (socket) => {
  console.log(`⚡ New Device: ${socket.id}`);

  socket.on('join-room', ({ roomId, peerId, userName }) => {
    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push({ peerId, userName, socketId: socket.id });

    console.log(`✅ ${userName} joined ${roomId}`);

    // Tell everyone else someone joined
    socket.to(roomId).emit('user-joined', { peerId, senderName: userName });
    
    // Send the current member list back to the person who just joined
    socket.emit('get-active-members', rooms[roomId]);
  });

  socket.on('send-message', (data) => {
    io.to(data.roomId).emit('receive-message', data);
  });

  socket.on('disconnect', () => {
    // Cleanup room tracking on disconnect
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter(user => user.socketId !== socket.id);
      io.to(roomId).emit('update-members', rooms[roomId]);
    }
    console.log(`❌ Device Left: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Ghost Engine live on ${PORT}`));
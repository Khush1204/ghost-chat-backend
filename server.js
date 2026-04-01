const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { ExpressPeerServer } = require('peer');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

// 1. Socket.io with CORS for Vercel
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// 2. PeerJS Server mounted on /peerjs
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/myapp'
});

app.use('/peerjs', peerServer);

app.get('/', (req, res) => {
  res.send('🚀 Ghost Chat Server is Live and Operational!');
});

// 3. Full Logic for Messaging & Rooms
io.on('connection', (socket) => {
  socket.on('join-room', ({ roomId, peerId, userName }) => {
    socket.join(roomId);
    // Notify others
    socket.to(roomId).emit('user-joined', { peerId, senderName: userName });

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-left', { peerId, userName });
    });
  });

  socket.on('send-message', (data) => {
    // Check for read receipts or standard messages
    if (data.type === 'read-receipt') {
      socket.to(data.roomId).emit('receive-message', data);
    } else {
      socket.to(data.roomId).emit('receive-message', data);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
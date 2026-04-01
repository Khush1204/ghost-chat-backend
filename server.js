const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { ExpressPeerServer } = require('peer');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

// 1. Create the Peer Server attached to your existing HTTP server
const peerServer = ExpressPeerServer(server, {
    debug: true,
    path: '/' 
});

// 2. Tell Express to use the Peer Server at the /myapp endpoint
app.use('/myapp', peerServer);

// 3. Initialize Socket.io on the same server
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

const usersInRooms = {}; 

io.on('connection', (socket) => {
  console.log(`🔌 New connection: ${socket.id}`);

  socket.on('join-room', ({ roomId, peerId, userName }) => {
    socket.join(roomId);
    usersInRooms[socket.id] = { roomId, peerId, userName };
    socket.to(roomId).emit('user-joined', { peerId, senderName: userName });
    console.log(`👤 ${userName} (${peerId}) joined room: ${roomId}`);
  });

  socket.on('send-message', (data) => {
    socket.to(data.roomId).emit('receive-message', data);
  });

  socket.on('disconnect', () => {
    const userData = usersInRooms[socket.id];
    if (userData) {
      const { roomId, peerId, userName } = userData;
      io.to(roomId).emit('user-left', { peerId, userName });
      delete usersInRooms[socket.id];
      console.log(`👻 ${userName} left room: ${roomId}`);
    }
  });
});

// --- Start your server ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Unified Server running on port ${PORT}`);
  console.log(`📡 PeerJS Path: http://localhost:${PORT}/myapp`);
});
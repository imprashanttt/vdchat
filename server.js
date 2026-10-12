const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const MAX_PER_ROOM = 6; // WebRTC mesh: keep call rooms small

app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.send('ok'));

// ICE servers for the browser. STUN is free; add a TURN server via env vars
// (TURN_URL, TURN_USER, TURN_PASS) if some users can't connect.
app.get('/config', (req, res) => {
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  if (process.env.TURN_URL) {
    iceServers.push({
      urls: process.env.TURN_URL.split(','),
      username: process.env.TURN_USER || '',
      credential: process.env.TURN_PASS || '',
    });
  }
  res.json({ iceServers });
});

// room -> Map(socketId -> { name, mode })
const rooms = new Map();

io.on('connection', (socket) => {
  socket.on('join', ({ room, name, mode }, ack) => {
    room = String(room || '').trim().toLowerCase().slice(0, 40);
    name = String(name || 'Guest').trim().slice(0, 30) || 'Guest';
    mode = ['text', 'audio', 'video'].includes(mode) ? mode : 'text';
    if (!room) return ack && ack({ error: 'Room code required' });

    const members = rooms.get(room) || new Map();
    if (members.size >= MAX_PER_ROOM) {
      return ack && ack({ error: `Room is full (max ${MAX_PER_ROOM})` });
    }

    const existing = [...members.entries()].map(([id, m]) => ({ id, name: m.name, mode: m.mode }));
    members.set(socket.id, { name, mode });
    rooms.set(room, members);

    socket.data = { room, name, mode };
    socket.join(room);

    socket.to(room).emit('peer-joined', { id: socket.id, name, mode });
    ack && ack({ ok: true, id: socket.id, peers: existing });
  });

  // WebRTC signaling relay (offer / answer / ICE)
  socket.on('signal', ({ to, data }) => {
    if (!socket.data.room) return;
    io.to(to).emit('signal', { from: socket.id, name: socket.data.name, mode: socket.data.mode, data });
  });

  socket.on('media-state', (state) => {
    if (!socket.data.room) return;
    socket.to(socket.data.room).emit('media-state', {
      id: socket.id,
      cam: !!(state && state.cam),
      mic: !!(state && state.mic),
    });
  });

  socket.on('chat', (text) => {
    const { room, name } = socket.data || {};
    if (!room) return;
    text = String(text || '').slice(0, 2000);
    if (!text.trim()) return;
    io.to(room).emit('chat', { id: socket.id, name, text, ts: Date.now() });
  });

  socket.on('disconnect', () => {
    const { room } = socket.data || {};
    if (!room) return;
    const members = rooms.get(room);
    if (members) {
      members.delete(socket.id);
      if (members.size === 0) rooms.delete(room);
    }
    socket.to(room).emit('peer-left', { id: socket.id });
  });
});

server.listen(PORT, () => console.log(`Chat server running on port ${PORT}`));

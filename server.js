/**
 * Custom Next.js server with Socket.IO support for Videolify
 * Run with: node server.js
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server: SocketIOServer } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      
      // Debug logging
      if (parsedUrl.pathname?.includes('videolify-socket')) {
        console.log(`[Debug] Socket.IO request: ${req.method} ${parsedUrl.pathname}`);
      }
      
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO BEFORE starting server
  // Socket.IO will intercept its own path automatically
  const io = new SocketIOServer(server, {
    path: '/videolify-socket',
    cors: {
      origin: '*', // Allow all origins for now (fix CORS issues)
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 1e7, // 10MB
    allowEIO3: true, // Support older clients
  });

  console.log('[Server] Socket.IO initialized at /videolify-socket');

  // Store rooms and peers
  const rooms = new Map();
  const peers = new Map();

  io.on('connection', (socket) => {
    console.log(`[Videolify] Client connected: ${socket.id}`);

    // Join room
    socket.on('join', (config) => {
      const { room_id, peer_name, peer_video, peer_audio } = config;

      socket.join(room_id);

      // Store peer info
      peers.set(socket.id, {
        socketId: socket.id,
        peerName: peer_name,
        roomId: room_id,
      });

      // Track room
      if (!rooms.has(room_id)) {
        rooms.set(room_id, new Set());
      }
      rooms.get(room_id).add(socket.id);

      // Get existing peers
      const existingPeers = Array.from(rooms.get(room_id))
        .filter(id => id !== socket.id)
        .map(id => peers.get(id))
        .filter(Boolean);

      // Notify existing peers
      socket.to(room_id).emit('addPeer', {
        peer_id: socket.id,
        peer_name,
        peer_video,
        peer_audio,
        should_create_offer: true,
      });

      // Send existing peers to new peer
      existingPeers.forEach(peer => {
        socket.emit('addPeer', {
          peer_id: peer.socketId,
          peer_name: peer.peerName,
          peer_video: true,
          peer_audio: true,
          should_create_offer: false,
        });
      });

      console.log(`[Videolify] ${peer_name} joined room ${room_id}`);
    });

    // Relay SDP
    socket.on('relaySDP', (config) => {
      socket.to(config.peer_id).emit('sessionDescription', {
        peer_id: socket.id,
        session_description: config.session_description,
      });
    });

    // Relay ICE
    socket.on('relayICE', (config) => {
      socket.to(config.peer_id).emit('iceCandidate', {
        peer_id: socket.id,
        ice_candidate: config.ice_candidate,
      });
    });

    // Peer status
    socket.on('peerStatus', (config) => {
      socket.to(config.room_id).emit('peerStatus', {
        peer_id: socket.id,
        peer_name: peers.get(socket.id)?.peerName,
        element: config.element,
        status: config.status,
      });
    });

    // Whiteboard
    socket.on('wbCanvasToJson', (config) => {
      socket.to(config.room_id).emit('wbCanvasToJson', {
        peer_name: peers.get(socket.id)?.peerName,
        wbCanvasJson: config.wbCanvasJson,
      });
    });

    // Chat
    socket.on('message', (config) => {
      if (config.to_peer_id) {
        socket.to(config.to_peer_id).emit('message', config);
      } else {
        socket.to(config.room_id).emit('message', config);
      }
    });

    // File sharing
    socket.on('fileInfo', (config) => {
      if (config.to_peer_id) {
        socket.to(config.to_peer_id).emit('fileInfo', config);
      } else {
        socket.to(config.room_id).emit('fileInfo', config);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      const peer = peers.get(socket.id);
      if (peer) {
        const room = rooms.get(peer.roomId);
        if (room) {
          room.delete(socket.id);
          if (room.size === 0) {
            rooms.delete(peer.roomId);
          }
        }

        socket.to(peer.roomId).emit('removePeer', {
          peer_id: socket.id,
        });

        peers.delete(socket.id);
        console.log(`[Videolify] ${peer.peerName} disconnected`);
      }
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO ready on ws://${hostname}:${port}/videolify-socket`);
  });
});

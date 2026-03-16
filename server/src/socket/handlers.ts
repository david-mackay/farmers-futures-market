import { Server as SocketServer } from 'socket.io';

const LOG_SOCKET_VERBOSE = process.env.LOG_SOCKET_VERBOSE === 'true';

export function setupSocketHandlers(io: SocketServer) {
  io.on('connection', (socket) => {
    if (LOG_SOCKET_VERBOSE) {
      console.log(`Client connected: ${socket.id}`);
    }

    socket.on('subscribe:orderbook', (filters) => {
      const room = filters?.crop_type || filters?.delivery_date
        ? `orderbook:${filters.crop_type || 'all'}:${filters.delivery_date || 'all'}`
        : 'orderbook:all';
      socket.join(room);
      if (LOG_SOCKET_VERBOSE) {
        console.log(`${socket.id} joined ${room}`);
      }
    });

    socket.on('unsubscribe:orderbook', () => {
      const rooms = Array.from(socket.rooms).filter(r => r.startsWith('orderbook:'));
      rooms.forEach(r => socket.leave(r));
    });

    socket.on('disconnect', (reason) => {
      // Always log disconnect with reason so server-side issues (e.g. ping timeout, transport error) are visible
      if (LOG_SOCKET_VERBOSE || (reason !== 'transport close' && reason !== 'client namespace disconnect')) {
        console.log(`Client disconnected: ${socket.id} reason=${reason}`);
      }
    });

    socket.on('error', (err) => {
      console.error(`Socket error ${socket.id}:`, err);
    });
  });

  // Periodic health log: connection count and memory (helps spot leaks on Render)
  const HEALTH_LOG_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  setInterval(() => {
    const count = io.sockets.sockets.size;
    const mem = process.memoryUsage();
    console.log(
      `[health] sockets=${count} heapUsed=${Math.round(mem.heapUsed / 1024 / 1024)}MB rss=${Math.round(mem.rss / 1024 / 1024)}MB`
    );
  }, HEALTH_LOG_INTERVAL_MS);
}

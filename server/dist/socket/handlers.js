"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketHandlers = setupSocketHandlers;
function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);
        socket.on('subscribe:orderbook', (filters) => {
            const room = filters?.crop_type || filters?.delivery_date
                ? `orderbook:${filters.crop_type || 'all'}:${filters.delivery_date || 'all'}`
                : 'orderbook:all';
            socket.join(room);
            console.log(`${socket.id} joined ${room}`);
        });
        socket.on('unsubscribe:orderbook', () => {
            const rooms = Array.from(socket.rooms).filter(r => r.startsWith('orderbook:'));
            rooms.forEach(r => socket.leave(r));
        });
        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });
}
//# sourceMappingURL=handlers.js.map
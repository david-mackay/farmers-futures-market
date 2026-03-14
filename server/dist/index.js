"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const auth_1 = require("./middleware/auth");
const auth_2 = require("./routes/auth");
const orders_1 = require("./routes/orders");
const users_1 = require("./routes/users");
const analytics_1 = require("./routes/analytics");
const vouchers_1 = require("./routes/vouchers");
const handlers_1 = require("./socket/handlers");
// Import db to trigger schema creation
require("./db/connection");
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
});
app.use((0, cors_1.default)({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000' }));
app.use(express_1.default.json());
app.use(auth_1.authMiddleware);
// Routes
app.use('/api/auth', (0, auth_2.createAuthRouter)());
app.use('/api/orders', (0, orders_1.createOrdersRouter)(io));
app.use('/api/users', (0, users_1.createUsersRouter)());
app.use('/api/analytics', (0, analytics_1.createAnalyticsRouter)());
app.use('/api/vouchers', (0, vouchers_1.createVouchersRouter)(io));
// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Socket.io
(0, handlers_1.setupSocketHandlers)(io);
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map
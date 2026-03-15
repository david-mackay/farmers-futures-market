import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import { authMiddleware } from './middleware/auth';
import { createAuthRouter } from './routes/auth';
import { createOrdersRouter } from './routes/orders';
import { createUsersRouter } from './routes/users';
import { createAnalyticsRouter } from './routes/analytics';
import { createMarketRouter } from './routes/market';
import { createVouchersRouter } from './routes/vouchers';
import { setupSocketHandlers } from './socket/handlers';

// Import db to trigger schema creation
import './db/connection';

const app = express();
const server = createServer(app);

const io = new SocketServer(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());
app.use(authMiddleware);

// Routes
app.use('/api/auth', createAuthRouter());
app.use('/api/orders', createOrdersRouter(io));
app.use('/api/users', createUsersRouter());
app.use('/api/analytics', createAnalyticsRouter());
app.use('/api/market', createMarketRouter());
app.use('/api/vouchers', createVouchersRouter(io));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io
setupSocketHandlers(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { connectDB } from './db.js';
import publicRouter from './routes/public.js';
import adminRouter from './routes/admin.js';

const app = express();
app.set('trust proxy', 1); // behind Vercel / a reverse proxy, so rate limiting sees the real visitor IP
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use('/api/admin/assets', express.json({ limit: '1.3mb' })); // image uploads (base64)
app.use(express.json({ limit: '300kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// connect to MongoDB before any other API route
app.use('/api', async (_req, res, next) => {
  try { await connectDB(); next(); }
  catch (e) {
    console.error('MongoDB connection failed:', e.message);
    res.status(503).json({ error: 'Database is not reachable. Check MONGODB_URI and Atlas network access.' });
  }
});

app.use('/api/admin', adminRouter);
app.use('/api', publicRouter);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.status && err.status < 500 ? err.message : 'Server error.' });
});

export default app;

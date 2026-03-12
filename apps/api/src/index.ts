import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import wardrobeRoutes from './routes/wardrobe';
import tripRoutes from './routes/trips';
import profileRoutes from './routes/profile';
import outfitRoutes from './routes/outfits';

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// ── Middleware ────────────────────────────────────────
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

// ── Health check ─────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ───────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/wardrobe', wardrobeRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/outfits', outfitRoutes);

// ── Global error handler ─────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error('[ERROR]', err.message);
    res.status(500).json({ message: 'Internal server error' });
  },
);

// ── Start ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('✓ API running on port ' + PORT);
});

export default app;

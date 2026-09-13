import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import distributionRoutes from './routes/distribution.routes';
import analysisRoutes from './routes/analysis.routes';
import { errorHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' }));
  app.use(express.json());

  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

  app.use('/api/distribution', distributionRoutes);
  app.use('/api/analysis', analysisRoutes);

  // 404 for anything unmatched, before the error handler
  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

  // Must be registered last, with all 4 params, for Express to treat it
  // as an error handler. Catches anything asyncHandler forwards via next(err).
  app.use(errorHandler);

  return app;
}

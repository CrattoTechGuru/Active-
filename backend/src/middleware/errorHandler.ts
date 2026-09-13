import { NextFunction, Request, Response } from 'express';

// Catches anything a controller didn't handle explicitly. Controllers
// should handle their own known failure modes (validation, payout errors,
// gateway errors) with specific status codes — this is the last-resort net,
// not the primary error path.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: 'internal_error', message });
}

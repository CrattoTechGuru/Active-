import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';
import { cashOut, PayoutError } from '../services/payout.service';

// Stream telemetry + balance for the Analysis dashboard.
export async function getArtistAnalysis(req: Request, res: Response) {
  const artistId = req.params.artistId;

  const { rows: streamRows } = await pool.query(
    `SELECT ss.period_date, SUM(ss.streams) AS streams, SUM(ss.revenue_cents) AS revenue_cents
     FROM stream_stats ss
     JOIN tracks t ON t.id = ss.track_id
     WHERE t.owner_artist_id = $1
       AND ss.period_date >= now() - interval '30 days'
     GROUP BY ss.period_date
     ORDER BY ss.period_date ASC`,
    [artistId]
  );

  const { rows: balanceRows } = await pool.query(
    `SELECT
       COALESCE(SUM(revenue_cents), 0) AS earned_cents,
       COALESCE((SELECT SUM(amount_cents) FROM payouts
                 WHERE artist_id = $1 AND status = 'succeeded'), 0) AS paid_out_cents
     FROM stream_stats ss
     JOIN tracks t ON t.id = ss.track_id
     WHERE t.owner_artist_id = $1`,
    [artistId]
  );

  const earnedCents = Number(balanceRows[0]?.earned_cents ?? 0);
  const paidOutCents = Number(balanceRows[0]?.paid_out_cents ?? 0);

  return res.status(200).json({
    dailyStats: streamRows,
    balanceCents: earnedCents - paidOutCents,
  });
}

const cashOutSchema = z.object({
  amountCents: z.number().int().positive(),
});

// Option 2 — One-Click Cash Out, nested inside the Analysis canvas.
// Every outcome is explicit: success returns the transfer id, failure
// returns a machine-readable reason the frontend renders as a real error
// state (see frontend/src/pages/analysis.tsx) — never a silent spinner.
export async function requestCashOut(req: Request, res: Response) {
  const parsed = cashOutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
  }

  try {
    const result = await cashOut(req.params.artistId, parsed.data.amountCents);
    if (result.status === 'failed') {
      return res.status(422).json({
        error: 'payout_failed',
        reason: result.failureReason,
        payoutId: result.payoutId,
      });
    }
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof PayoutError) {
      return res.status(422).json({ error: err.reason, message: err.message });
    }
    throw err;
  }
}

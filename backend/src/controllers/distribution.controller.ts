import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';
import { validateSplits, saveSplits, SplitValidationError } from '../services/splitEngine.service';
import { submitRelease, GatewayNotConfiguredError } from '../services/apiGateway.service';

const createTrackSchema = z.object({
  ownerArtistId: z.string().uuid(),
  title: z.string().min(1),
  assetUrl: z.string().url(),
  isrc: z.string().optional(),
});

export async function createTrack(req: Request, res: Response) {
  const parsed = createTrackSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
  }

  const { ownerArtistId, title, assetUrl, isrc } = parsed.data;
  const { rows } = await pool.query(
    `INSERT INTO tracks (owner_artist_id, title, asset_url, isrc, status)
     VALUES ($1, $2, $3, $4, 'draft') RETURNING id, status`,
    [ownerArtistId, title, assetUrl, isrc ?? null]
  );

  return res.status(201).json(rows[0]);
}

const splitsSchema = z.object({
  splits: z
    .array(
      z.object({
        collaboratorArtistId: z.string().uuid(),
        percentage: z.number().positive().max(100),
      })
    )
    .min(1),
});

// Option 1 — Royalty Splits, nested inside the Distribute flow.
export async function setSplits(req: Request, res: Response) {
  const parsed = splitsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
  }

  try {
    validateSplits(parsed.data.splits);
    await saveSplits(req.params.trackId, parsed.data.splits);
    return res.status(200).json({ status: 'saved' });
  } catch (err) {
    if (err instanceof SplitValidationError) {
      return res.status(422).json({ error: 'split_validation_failed', message: err.message });
    }
    throw err;
  }
}

// Submits to the whitelabel gateway and, on success, generates the
// Smart Pre-Save Link (Option 3) automatically — no separate user action.
export async function submitDistribution(req: Request, res: Response) {
  const trackId = req.params.trackId;
  const { rows } = await pool.query('SELECT * FROM tracks WHERE id = $1', [trackId]);
  const track = rows[0];

  if (!track) {
    return res.status(404).json({ error: 'track_not_found' });
  }

  try {
    const result = await submitRelease({
      trackId: track.id,
      title: track.title,
      assetUrl: track.asset_url,
      isrc: track.isrc,
    });

    await pool.query(
      `UPDATE tracks
       SET status = 'processing', gateway_release_id = $1, presave_link = $2, updated_at = now()
       WHERE id = $3`,
      [result.gatewayReleaseId, result.presaveLink, trackId]
    );

    return res.status(200).json({
      status: 'processing',
      presaveLink: result.presaveLink,
    });
  } catch (err) {
    if (err instanceof GatewayNotConfiguredError) {
      return res.status(503).json({ error: 'gateway_not_configured', message: err.message });
    }
    await pool.query(`UPDATE tracks SET status = 'rejected', updated_at = now() WHERE id = $1`, [
      trackId,
    ]);
    const message = err instanceof Error ? err.message : 'unknown_error';
    return res.status(502).json({ error: 'gateway_submission_failed', message });
  }
}

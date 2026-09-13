import { pool } from '../config/database';

export interface SplitInput {
  collaboratorArtistId: string;
  percentage: number;
}

export class SplitValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SplitValidationError';
  }
}

// Splits must sum to exactly 100 — this is the one place in the app where a
// silent rounding error becomes a real dollar dispute between collaborators.
// Validate before touching the database, not after.
export function validateSplits(splits: SplitInput[]): void {
  if (splits.length === 0) {
    throw new SplitValidationError('At least one royalty split is required.');
  }

  const seen = new Set<string>();
  for (const split of splits) {
    if (seen.has(split.collaboratorArtistId)) {
      throw new SplitValidationError(
        `Collaborator ${split.collaboratorArtistId} appears more than once in the split.`
      );
    }
    seen.add(split.collaboratorArtistId);

    if (split.percentage <= 0 || split.percentage > 100) {
      throw new SplitValidationError(
        `Split percentage for ${split.collaboratorArtistId} must be between 0 and 100.`
      );
    }
  }

  // Sum with cent-level rounding to avoid float drift (0.1 + 0.2 problem)
  // before comparing to 100.
  const totalCents = splits.reduce((sum, s) => sum + Math.round(s.percentage * 100), 0);
  if (totalCents !== 10000) {
    const total = (totalCents / 100).toFixed(2);
    throw new SplitValidationError(
      `Royalty splits must sum to exactly 100%. Received ${total}%.`
    );
  }
}

export async function saveSplits(trackId: string, splits: SplitInput[]): Promise<void> {
  validateSplits(splits);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM royalty_splits WHERE track_id = $1', [trackId]);
    for (const split of splits) {
      await client.query(
        `INSERT INTO royalty_splits (track_id, collaborator_artist_id, percentage)
         VALUES ($1, $2, $3)`,
        [trackId, split.collaboratorArtistId, split.percentage]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getSplits(trackId: string): Promise<SplitInput[]> {
  const { rows } = await pool.query(
    `SELECT collaborator_artist_id AS "collaboratorArtistId", percentage
     FROM royalty_splits WHERE track_id = $1`,
    [trackId]
  );
  return rows;
}

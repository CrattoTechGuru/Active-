import Stripe from 'stripe';
import { pool } from '../config/database';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2024-04-10' })
  : null;

export class PayoutError extends Error {
  constructor(message: string, public readonly reason: string) {
    super(message);
    this.name = 'PayoutError';
  }
}

interface PayoutResult {
  payoutId: string;
  status: 'succeeded' | 'failed';
  stripeTransferId?: string;
  failureReason?: string;
}

// One-Click Cash Out (Option 2). This moves real money, so every failure
// path writes a row with a real reason — never a silent catch. The Analysis
// UI reads the `failed` status + failure_reason directly, so an artist
// always sees *why* a cash-out didn't land, not just a spinner that stops.
export async function cashOut(artistId: string, amountCents: number): Promise<PayoutResult> {
  if (amountCents <= 0) {
    throw new PayoutError('Cash out amount must be greater than zero.', 'invalid_amount');
  }

  if (!stripe) {
    throw new PayoutError(
      'Payouts are not configured on this server (missing STRIPE_SECRET_KEY).',
      'not_configured'
    );
  }

  const { rows } = await pool.query(
    'SELECT stripe_connect_account_id FROM artists WHERE id = $1',
    [artistId]
  );
  const stripeAccountId: string | null = rows[0]?.stripe_connect_account_id ?? null;

  if (!stripeAccountId) {
    // Record the failed attempt before throwing so it's auditable even
    // though the caller only sees the error.
    await pool.query(
      `INSERT INTO payouts (artist_id, amount_cents, status, failure_reason)
       VALUES ($1, $2, 'failed', $3)`,
      [artistId, amountCents, 'no_connected_stripe_account']
    );
    throw new PayoutError(
      'This artist has not connected a Stripe account yet.',
      'no_connected_stripe_account'
    );
  }

  try {
    const transfer = await stripe.transfers.create({
      amount: amountCents,
      currency: 'usd',
      destination: stripeAccountId,
    });

    const { rows: payoutRows } = await pool.query(
      `INSERT INTO payouts (artist_id, amount_cents, stripe_transfer_id, status)
       VALUES ($1, $2, $3, 'succeeded') RETURNING id`,
      [artistId, amountCents, transfer.id]
    );

    return {
      payoutId: payoutRows[0].id,
      status: 'succeeded',
      stripeTransferId: transfer.id,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown_stripe_error';
    const { rows: failedRows } = await pool.query(
      `INSERT INTO payouts (artist_id, amount_cents, status, failure_reason)
       VALUES ($1, $2, 'failed', $3) RETURNING id`,
      [artistId, amountCents, reason]
    );

    return {
      payoutId: failedRows[0].id,
      status: 'failed',
      failureReason: reason,
    };
  }
}

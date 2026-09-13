import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { CopyrightFooter } from '@/components/CopyrightFooter';
import { getAnalysis, cashOut, AnalysisResponse } from '@/lib/api';

// TODO: replace with the real signed-in artist ID once auth lands.
const DEMO_ARTIST_ID = 'demo-artist';

// Analysis canvas: One-Click Cash Out (Option 2) lives here. A failed
// payout renders as a visible, specific error — never a silent spinner —
// because this is other people's income.
export default function Analysis() {
  const router = useRouter();
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cashOutError, setCashOutError] = useState<string | null>(null);
  const [cashOutStatus, setCashOutStatus] = useState<'idle' | 'pending' | 'succeeded'>('idle');

  useEffect(() => {
    getAnalysis(DEMO_ARTIST_ID)
      .then(setData)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load.'));
  }, []);

  const totalStreams =
    data?.dailyStats.reduce((sum, d) => sum + Number(d.streams), 0) ?? 0;
  const balance = data ? (data.balanceCents / 100).toFixed(2) : '0.00';

  async function handleCashOut() {
    if (!data) return;
    setCashOutError(null);
    setCashOutStatus('pending');
    try {
      await cashOut(DEMO_ARTIST_ID, data.balanceCents);
      setCashOutStatus('succeeded');
    } catch (err) {
      setCashOutStatus('idle');
      setCashOutError(err instanceof Error ? err.message : 'Cash out failed.');
    }
  }

  return (
    <div className="active-shell">
      <div className="active-shell__content">
        <button className="active-back" onClick={() => router.push('/')}>
          <span aria-hidden="true">&larr;</span> Analysis
        </button>

        {loadError && <p className="active-error">{loadError}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div className="active-card">
            <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>Streams (30d)</p>
            <p style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>
              {totalStreams.toLocaleString()}
            </p>
          </div>
          <div className="active-card">
            <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>Balance</p>
            <p style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>${balance}</p>
          </div>
        </div>

        <button
          className="active-action-btn"
          onClick={handleCashOut}
          disabled={!data || data.balanceCents <= 0 || cashOutStatus === 'pending'}
        >
          {cashOutStatus === 'pending'
            ? 'Processing…'
            : cashOutStatus === 'succeeded'
              ? 'Cashed out'
              : 'One-click cash out'}
        </button>

        {/* Explicit failure state — names what happened, not a spinner that
            just stops. cashOutError carries the backend's real reason
            (e.g. "no_connected_stripe_account"). */}
        {cashOutError && (
          <p className="active-error">
            Cash out didn&apos;t go through: {cashOutError}
          </p>
        )}
        {cashOutStatus === 'succeeded' && (
          <p style={{ fontSize: 12, color: '#fff', marginTop: 8 }}>Funds are on their way.</p>
        )}
      </div>
      <CopyrightFooter />
    </div>
  );
}

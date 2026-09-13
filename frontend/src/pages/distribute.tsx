import { useRouter } from 'next/router';
import { useState } from 'react';
import { CopyrightFooter } from '@/components/CopyrightFooter';
import { setSplits, submitDistribution } from '@/lib/api';

interface SplitRow {
  collaboratorArtistId: string;
  percentage: string; // kept as string for controlled input, parsed on submit
}

// Distribute flow: Royalty Splits (Option 1) and Smart Pre-Save Links
// (Option 3) live here, nested — never on the home canvas.
export default function Distribute() {
  const router = useRouter();
  const [trackId, setTrackId] = useState('');
  const [splitRows, setSplitRows] = useState<SplitRow[]>([
    { collaboratorArtistId: '', percentage: '' },
  ]);
  const [presaveLink, setPresaveLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const splitTotal = splitRows.reduce((sum, row) => sum + (Number(row.percentage) || 0), 0);

  function updateRow(index: number, field: keyof SplitRow, value: string) {
    setSplitRows((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setSplitRows((rows) => [...rows, { collaboratorArtistId: '', percentage: '' }]);
  }

  async function handleSubmit() {
    setError(null);

    if (!trackId.trim()) {
      setError('Enter a track ID first (created via the upload step).');
      return;
    }
    if (Math.round(splitTotal * 100) !== 10000) {
      setError(`Royalty splits must sum to exactly 100%. Currently ${splitTotal.toFixed(2)}%.`);
      return;
    }

    setSubmitting(true);
    try {
      await setSplits(
        trackId,
        splitRows.map((r) => ({
          collaboratorArtistId: r.collaboratorArtistId,
          percentage: Number(r.percentage),
        }))
      );
      const result = await submitDistribution(trackId);
      setPresaveLink(result.presaveLink);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="active-shell">
      <div className="active-shell__content">
        <button className="active-back" onClick={() => router.push('/')}>
          <span aria-hidden="true">&larr;</span> Distribute
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="active-card">
            <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>
              Track ID
            </label>
            <input
              value={trackId}
              onChange={(e) => setTrackId(e.target.value)}
              placeholder="Paste the track ID from upload"
              style={{
                width: '100%',
                background: 'transparent',
                border: '0.5px solid #2a2a2a',
                borderRadius: 6,
                color: '#fff',
                padding: '0.5rem',
                fontSize: 13,
              }}
            />
          </div>

          <div className="active-card">
            <p style={{ fontSize: 13, margin: '0 0 10px', color: '#fff' }}>Royalty splits</p>
            {splitRows.map((row, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  value={row.collaboratorArtistId}
                  onChange={(e) => updateRow(i, 'collaboratorArtistId', e.target.value)}
                  placeholder="Collaborator artist ID"
                  style={{
                    flex: 2,
                    background: 'transparent',
                    border: '0.5px solid #2a2a2a',
                    borderRadius: 6,
                    color: '#fff',
                    padding: '0.5rem',
                    fontSize: 12,
                  }}
                />
                <input
                  value={row.percentage}
                  onChange={(e) => updateRow(i, 'percentage', e.target.value)}
                  placeholder="%"
                  inputMode="decimal"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: '0.5px solid #2a2a2a',
                    borderRadius: 6,
                    color: '#fff',
                    padding: '0.5rem',
                    fontSize: 12,
                  }}
                />
              </div>
            ))}
            <button
              onClick={addRow}
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: '#D32F2F',
                fontSize: 12,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              + Add collaborator
            </button>
            <p style={{ fontSize: 11, color: '#666', margin: '8px 0 0' }}>
              Total: {splitTotal.toFixed(2)}% (must equal 100%)
            </p>
          </div>

          <div className="active-card">
            <span style={{ fontSize: 13 }}>Smart pre-save link</span>
            <span style={{ fontSize: 11, color: '#666', float: 'right' }}>
              {presaveLink ? 'Generated' : 'Auto on submit'}
            </span>
          </div>

          <button className="active-action-btn" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit for distribution'}
          </button>

          {error && <p className="active-error">{error}</p>}
          {presaveLink && (
            <p style={{ fontSize: 12, color: '#fff', wordBreak: 'break-all' }}>
              Pre-save link:{' '}
              <a href={presaveLink} target="_blank" rel="noreferrer">
                {presaveLink}
              </a>
            </p>
          )}
        </div>
      </div>
      <CopyrightFooter />
    </div>
  );
}

import { useRouter } from 'next/router';
import { CopyrightFooter } from '@/components/CopyrightFooter';

// Home canvas: exactly two primary actions, no nav bar, no third button.
export default function Home() {
  const router = useRouter();

  return (
    <div className="active-shell">
      <div className="active-shell__content">
        <p className="active-header">Active</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: '3rem' }}>
          <button className="active-primary-btn" onClick={() => router.push('/distribute')}>
            DISTRIBUTE
          </button>
          <button className="active-primary-btn" onClick={() => router.push('/analysis')}>
            ANALYSIS
          </button>
        </div>
      </div>
      <CopyrightFooter />
    </div>
  );
}

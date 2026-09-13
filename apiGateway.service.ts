// Whitelabel distribution gateway client (SonoSuite / FUGA).
//
// IMPORTANT: this is a stub. Before wiring real submission logic, confirm
// partner API credentials are actually provisioned — SonoSuite/FUGA
// onboarding is a manual partner-approval process on their end and can take
// longer than a single sprint. Don't block Sprint 2 on it landing same-week.

const GATEWAY_BASE_URL = process.env.DISTRO_GATEWAY_BASE_URL;
const GATEWAY_API_KEY = process.env.DISTRO_GATEWAY_API_KEY;

export class GatewayNotConfiguredError extends Error {
  constructor() {
    super('Distribution gateway credentials are not configured (DISTRO_GATEWAY_API_KEY).');
    this.name = 'GatewayNotConfiguredError';
  }
}

interface SubmitReleaseInput {
  trackId: string;
  title: string;
  assetUrl: string;
  isrc?: string;
}

interface SubmitReleaseResult {
  gatewayReleaseId: string;
  presaveLink: string; // Option 3 — Smart Pre-Save Links, generated once submission succeeds
}

export async function submitRelease(input: SubmitReleaseInput): Promise<SubmitReleaseResult> {
  if (!GATEWAY_BASE_URL || !GATEWAY_API_KEY) {
    throw new GatewayNotConfiguredError();
  }

  const response = await fetch(`${GATEWAY_BASE_URL}/v1/releases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GATEWAY_API_KEY}`,
    },
    body: JSON.stringify({
      title: input.title,
      asset_url: input.assetUrl,
      isrc: input.isrc,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Distribution gateway rejected submission (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { release_id: string; presave_url: string };

  return {
    gatewayReleaseId: data.release_id,
    presaveLink: data.presave_url,
  };
}

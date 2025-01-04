import { NextResponse } from 'next/server';

interface RateLimitTier {
  hits: number;
  max: number;
  period: number;
}

interface RateLimitState {
  tiers: RateLimitTier[];
  lastReset: number;
}

let rateLimitState: RateLimitState = {
  tiers: [
    { hits: 0, max: 5, period: 10 },    // 5 requests per 10 seconds
    { hits: 0, max: 15, period: 60 },   // 15 requests per 60 seconds
    { hits: 0, max: 30, period: 300 },  // 30 requests per 300 seconds
  ],
  lastReset: Date.now()
};

// Get the base URL for POE API requests
function getBaseUrl(): string {
  return process.env.POE_PROXY_URL || 'https://www.pathofexile.com';
}

function getRateLimitStatus(): string {
  return rateLimitState.tiers.map((tier, index) => {
    const remaining = tier.max - tier.hits;
    const period = tier.period;
    const timeLeft = Math.max(0, Math.ceil((rateLimitState.lastReset + period * 1000 - Date.now()) / 1000));
    return `Tier ${index + 1}: ${remaining}/${tier.max} requests remaining (resets in ${timeLeft}s)`;
  }).join(' | ');
}

function checkRateLimit(): { allowed: boolean; timeToWait?: number } {
  const now = Date.now();

  // Reset counters if enough time has passed
  rateLimitState.tiers.forEach((tier, index) => {
    if (now - rateLimitState.lastReset >= tier.period * 1000) {
      tier.hits = 0;
    }
  });

  // Check if any tier would be exceeded
  for (const tier of rateLimitState.tiers) {
    if (tier.hits >= tier.max) {
      const timeToWait = Math.ceil(
        (rateLimitState.lastReset + tier.period * 1000 - now) / 1000
      );
      return { allowed: false, timeToWait };
    }
  }

  return { allowed: true };
}

function updateRateLimits(headers: Headers) {
  const ipState = headers.get('x-rate-limit-ip-state')?.split(',') || [];

  ipState.forEach((state, index) => {
    const [hits] = state.split(':').map(Number);
    if (rateLimitState.tiers[index]) {
      rateLimitState.tiers[index].hits = hits;
    }
  });

  rateLimitState.lastReset = Date.now();
  console.log(`[Rate Limits] ${getRateLimitStatus()}`);
}

export async function POST(request: Request) {
  try {
    // Check rate limit before making the request
    const rateLimitCheck = checkRateLimit();
    if (!rateLimitCheck.allowed) {
      console.log(`[Rate Limits] Request blocked - ${getRateLimitStatus()}`);
      return NextResponse.json({
        error: 'Rate limit exceeded',
        details: `Please wait ${rateLimitCheck.timeToWait} seconds before trying again`,
        retryAfter: rateLimitCheck.timeToWait,
        rateLimitStatus: getRateLimitStatus()
      }, { status: 429 });
    }

    const body = await request.json();
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/trade2/search/${body.league}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OAuth poe-item-checker/1.0.0 (contact: sanzodown@hotmail.fr)',
        'Accept': '*/*',
      },
      body: JSON.stringify(body.query),
    });

    // Update rate limits from response headers
    updateRateLimits(response.headers);

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '10');
        return NextResponse.json({
          error: 'Rate limit exceeded',
          details: `Please wait ${retryAfter} seconds`,
          retryAfter
        }, { status: 429 });
      }

      if (response.status === 403) {
        console.error('API Access Forbidden:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });
        return NextResponse.json({
          error: 'API Access Forbidden',
          details: 'The PoE Trade API is currently blocking requests from this service. Please try using the official trade site directly.',
        }, { status: 403 });
      }

      return NextResponse.json({
        error: `API Error: ${response.status}`,
        details: response.statusText
      }, { status: response.status });
    }

    const data = await response.json();
    if (!data.id) {
      console.error('Invalid API Response:', data);
      return NextResponse.json({
        error: 'Invalid API Response',
        details: 'The API response did not contain a search ID'
      }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error with trade search:', error);
    return NextResponse.json({
      error: 'Failed to perform trade search',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

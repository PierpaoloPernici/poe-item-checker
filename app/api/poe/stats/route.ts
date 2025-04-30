import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const CACHE_DURATION = 24 * 60 * 60; // 24h in seconds

async function readCache() {
  try {
    const cachePath = path.join(process.cwd(), 'app', 'cache', 'stats.json');
    const cacheContent = await fs.readFile(cachePath, 'utf-8');
    return JSON.parse(cacheContent);
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

export async function GET() {
  try {
    const cache = await readCache();
    const now = new Date().getTime();

    if (cache?.lastUpdated && cache.data) {
      const cacheAge = now - new Date(cache.lastUpdated).getTime();
      const headers = {
        'Cache-Control': `public, max-age=${CACHE_DURATION}`,
        'Content-Type': 'application/json',
      };

      if (cacheAge < CACHE_DURATION * 1000) {
        return NextResponse.json(cache.data, { headers });
      }
    }

    const response = await fetch('https://www.pathofexile.com/api/trade2/data/stats', {
      headers: {
        'User-Agent': 'OAuth poe-item-checker/1.0.0 (contact: sanzodown@hotmail.fr)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (cache?.data) {
        console.log('Using expired cache due to API failure');
        return NextResponse.json(cache.data, {
          headers: {
            'Cache-Control': 'public, max-age=3600',
            'Content-Type': 'application/json',
          },
        });
      }
      throw new Error(`Failed to fetch stats: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': `public, max-age=${CACHE_DURATION}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching PoE stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    });
  }
}
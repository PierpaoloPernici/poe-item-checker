import Fuse from 'fuse.js';

export interface StatOption {
  id: string;
  text: string;
  type: string;
  option?: Record<string, unknown>;
}

interface StatEntry {
  id: string;
  text: string;
  option?: Record<string, unknown>;
}

interface StatGroup {
  label: string;
  entries: StatEntry[];
}

let statsCache: StatOption[] | null = null;
let fuseInstance: Fuse<StatOption> | null = null;

export async function fetchStats(): Promise<StatOption[]> {
  try {
    const response = await fetch('/api/poe/stats');
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    console.log('First few stat groups:', data.result.slice(0, 2));
    console.log('Sample entries:', data.result[0]?.entries.slice(0, 2));

    const processedStats = data.result.flatMap((group: StatGroup) =>
      group.entries.map((entry: StatEntry) => ({
        id: entry.id,
        text: entry.text,
        type: group.label,
        option: entry.option
      }))
    );

    statsCache = processedStats;
    fuseInstance = new Fuse(processedStats, {
      keys: ['text'],
      includeScore: true,
      threshold: 0.7,
      distance: 300,
      ignoreLocation: true,
      minMatchCharLength: 2,
      useExtendedSearch: true,
      getFn: (obj, path) => {
        const value = obj[path as keyof StatOption];
        if (path === 'text') {
          return normalizeStatText(value as string);
        }
        return value ? String(value) : '';
      }
    });

    return processedStats;
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    throw error;
  }
}

function normalizeStatText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\+(?=\d)/g, '')
    .replace(/\[|\]/g, '')
    .replace(/\|.*?(?=\s|$)/g, '')
    .replace(/[+-]?\d+\.?\d*/g, '#')
    .replace(/\s+/g, ' ')
    .replace(/^adds /, '')
    .replace(/^gain /, '')
    .replace(/^you /, '')
    .replace(/\s*\(implicit\)$/, '')
    .trim();
}

export function findStatId(statText: string, _stats: StatOption[]): string | null {
  if (!statsCache || !fuseInstance) {
    console.error('Stats cache or Fuse instance not initialized');
    return null;
  }

  const normalizedInput = normalizeStatText(statText);
  const searchInImplicitOnly = statText.toLowerCase().includes('implicit');

  // Se dobbiamo cercare solo nelle statistiche implicit, filtriamo il cache
  const relevantStats = searchInImplicitOnly
    ? statsCache.filter(s => s.type === 'Implicit')
    : statsCache;

  // First try exact match after normalization
  const exactMatch = relevantStats.find(s =>
    normalizeStatText(s.text) === normalizedInput
  );

  if (exactMatch) {
    console.log('Found exact match:', {
      input: normalizedInput,
      match: exactMatch.text,
      id: exactMatch.id
    });
    return exactMatch.id;
  }

  // Se stiamo cercando solo nelle implicit, creiamo una nuova istanza di Fuse
  // con solo le statistiche implicit
  const searchInstance = searchInImplicitOnly
    ? new Fuse(relevantStats, {
        keys: ['text'],
        includeScore: true,
        threshold: 0.7,
        distance: 300,
        ignoreLocation: true,
        minMatchCharLength: 2,
        useExtendedSearch: true,
        getFn: (obj, path) => {
          const value = obj[path as keyof StatOption];
          if (path === 'text') {
            return normalizeStatText(value as string);
          }
          return value ? String(value) : '';
        }
      })
    : fuseInstance;

  const results = searchInstance.search(normalizedInput);

  if (results.length > 0 && results[0].score && results[0].score < 0.8) {
    return results[0].item.id;
  }

  return null;
}

export function extractValue(statText: string): number {
  const matches = statText.match(/([+-]?\d+\.?\d*)/g);
  if (!matches) return 0;
  return parseFloat(matches[0]);
}

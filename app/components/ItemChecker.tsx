'use client';
import { useState, useEffect } from 'react';
import ReactGA from 'react-ga4';
import { fetchStats, findStatId, extractValue, StatOption } from '../utils/stats';
import { ITEM_CLASS_MAP } from '../constants/itemTypes';
import type { ParsedItem } from '../types/item';

interface ItemCheckerProps {
  league: string;
}

const RATE_LIMIT_DELAY = 1000;

export default function ItemChecker({ league }: ItemCheckerProps) {
  const [itemText, setItemText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<StatOption[]>([]);
  const [includeItemLevel, setIncludeItemLevel] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const fetchedStats = await fetchStats();
        setStats(fetchedStats);
      } catch (error) {
        setError('Failed to load item stats database');
        console.error('Failed to load stats:', error);
      }
    };
    loadStats();
  }, []);

  const parseItemText = (text: string): ParsedItem => {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    let itemClass: string | undefined;
    let itemLevel: number | undefined;
    const stats: string[] = [];
    let rarity: string | undefined;
    let name: string | undefined;
    let baseType: string | undefined;
    let foundItemLevel = false;
    let foundStats = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('Item Class:')) {
        itemClass = line.replace('Item Class:', '').trim();
      } else if (line.startsWith('Item Level:')) {
        const match = line.match(/Item Level: (\d+)/);
        if (match) {
          itemLevel = parseInt(match[1]);
          foundItemLevel = true;
        }
      } else if (line.startsWith('Rarity:')) {
        rarity = line.replace('Rarity:', '').trim();
        if (rarity === 'Unique' && i + 2 < lines.length) {
          name = lines[i + 1].trim();
          baseType = lines[i + 2].trim();
        }
      } else if (foundItemLevel && !foundStats) {
        if (line.includes('--------')) {
          foundStats = true;
        }
      } else if (foundStats && !line.includes('--------')) {
        if (line.match(/[0-9]+/) ||
          line.includes('to ') ||
          line.includes('increased ') ||
          line.includes('reduced ') ||
          line.includes('Recover')) {
          stats.push(line);
        }
      }
    }

    return { itemClass, itemLevel, stats, rarity, name, baseType };
  };

  const handleSearch = async () => {
    if (!itemText.trim()) {
      setError('Devi prima incollare un item');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const parsedItem = parseItemText(itemText);

      if (parsedItem.itemClass && !ITEM_CLASS_MAP[parsedItem.itemClass]) {
        setError(`Item type "${parsedItem.itemClass}" is not supported yet`);
        setLoading(false);
        return;
      }

      // Create base query structure
      const baseQuery = {
        query: {
          status: { option: "online" },
          stats: [{ type: "and", filters: [], disabled: false }]
        },
        sort: { price: "asc" }
      };

      // Build the query based on item type
      let query;
      if (parsedItem.rarity === 'Unique' && parsedItem.name && parsedItem.baseType) {
        query = {
          ...baseQuery,
          query: {
            ...baseQuery.query,
            name: parsedItem.name,
            type: parsedItem.baseType,
            filters: {
              type_filters: {
                filters: {
                  category: parsedItem.itemClass ? {
                    option: ITEM_CLASS_MAP[parsedItem.itemClass]
                  } : undefined,
                  ilvl: parsedItem.itemLevel && includeItemLevel ? {
                    min: parsedItem.itemLevel
                  } : undefined
                },
                disabled: false
              }
            }
          }
        };
      } else {
        const statFilters = parsedItem.stats
          .map(stat => {
            const statId = findStatId(stat, stats);
            if (!statId) {
              console.log('No stat ID found for:', stat);
              return null;
            }

            const value = extractValue(stat);
            console.log('Found stat:', { id: statId, value, originalStat: stat });

            return {
              id: statId,
              value: { min: value },
              disabled: false
            };
          })
          .filter((filter): filter is NonNullable<typeof filter> => filter !== null);

        if (statFilters.length === 0) {
          setError('Nessuna statistica valida trovata, controlla il testo');
          setLoading(false);
          return;
        }

        query = {
          ...baseQuery,
          query: {
            ...baseQuery.query,
            stats: [{
              type: "and",
              filters: statFilters,
              disabled: false
            }],
            filters: {
              type_filters: {
                filters: {
                  category: parsedItem.itemClass ? {
                    option: ITEM_CLASS_MAP[parsedItem.itemClass]
                  } : undefined,
                  ilvl: parsedItem.itemLevel && includeItemLevel ? {
                    min: parsedItem.itemLevel
                  } : undefined
                },
                disabled: false
              }
            }
          }
        };
      }

      // Clean up undefined values
      if (!parsedItem.itemClass) {
        delete query.query.filters?.type_filters.filters.category;
      }
      if (!parsedItem.itemLevel || !includeItemLevel) {
        delete query.query.filters?.type_filters.filters.ilvl;
      }

      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));

      const response = await fetch('/api/poe/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, league }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          throw new Error('Troppe richieste. Attendi un attimo e riprova.');
        }
        throw new Error(errorData.error || 'Search failed');
      }

      const data = await response.json();

      if (data.id) {
        ReactGA.event({
          category: 'Search',
          action: 'PoeTradeSearch',
          label: league,
          value: parsedItem.itemLevel || 0
        });
        window.open(`https://www.pathofexile.com/trade2/search/${league}/${data.id}`, '_blank');
      } else {
        throw new Error('Nessun ID di ricerca restituito');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Si è verificato un errore');
      console.error('Errore di ricerca:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatItemText = (text: string) => {
    if (!text) return '';

    return text.split('\n').map((line, i) => {
      if (line.includes('--------')) {
        return `<div class="text-blue-400/50">--------</div>`;
      }
      if (line.startsWith('Item Class:')) {
        return `<div class="text-cyan-400">${line}</div>`;
      }
      if (line.startsWith('Item Level:')) {
        return `<div class="text-blue-400">${line}</div>`;
      }
      if (line.startsWith('Rarity:')) {
        return `<div class="text-yellow-400">${line}</div>`;
      }
      if (line.match(/[0-9]+/)) {
        return `<div class="text-cyan-300">${line}</div>`;
      }
      if (line.includes('Requires')) {
        return `<div class="text-gray-400">${line}</div>`;
      }
      if (i <= 2 && line.trim() && !line.includes(':')) {
        return `<div class="text-yellow-200 font-semibold">${line}</div>`;
      }
      return `<div class="text-white/90">${line}</div>`;
    }).join('');
  };

  return (
    <div className="space-y-4 backdrop-blur-sm bg-white/5 rounded-2xl p-6 shadow-xl">
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200" />
        <div
          contentEditable
          className="relative w-full h-64 p-4 rounded-xl bg-slate-900/90 border border-white/10
                     focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50
                     text-white/90 font-mono text-sm overflow-auto whitespace-pre-wrap
                     transition-all duration-200 focus:outline-none
                     [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-white/10
                     [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-white/5"
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text');
            const formatted = formatItemText(text);
            e.currentTarget.innerHTML = formatted;
            setItemText(text);
          }}
          onInput={(e) => {
            const text = e.currentTarget.innerText;
            setItemText(text);
          }}
          dangerouslySetInnerHTML={{ __html: itemText ? formatItemText(itemText) : '' }}
          spellCheck={false}
        />
      </div>

      {error && (
        <div className="text-red-400 text-sm text-center bg-red-900/20 rounded-lg p-2 border border-red-500/20">
          {error}
        </div>
      )}

      <div className="flex items-center justify-center gap-3 text-white/80">
        <label htmlFor="includeItemLevel" className="text-sm select-none">
          Includi livello item nella ricerca
        </label>
        <button
          role="switch"
          id="includeItemLevel"
          aria-checked={includeItemLevel}
          onClick={() => setIncludeItemLevel(!includeItemLevel)}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full
            transition-colors duration-200 ease-in-out
            focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
            ${includeItemLevel ? 'bg-gradient-to-r from-blue-600 to-cyan-600' : 'bg-white/10'}
          `}
        >
          <span
            className={`
              ${includeItemLevel ? 'translate-x-6' : 'translate-x-1'}
              inline-block h-4 w-4 transform rounded-full
              bg-white transition duration-200 ease-in-out
            `}
          />
        </button>
      </div>

      <button
        className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-cyan-600
                   hover:from-blue-500 hover:to-cyan-500 rounded-xl text-white
                   font-medium shadow-lg shadow-blue-500/20 transition-all
                   duration-200 disabled:opacity-50 relative group"
        onClick={handleSearch}
        disabled={loading}
      >
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-200" />
        <div className="relative">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Ricerca...
            </span>
          ) : (
            'Cerca su PoE Trade'
          )}
        </div>
      </button>
    </div>
  );
}

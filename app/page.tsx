'use client';
import React, { useState, useEffect } from 'react';
import ReactGA from 'react-ga4';
import ItemChecker from '@/app/components/ItemChecker';
import LeagueSelector from '@/app/components/LeagueSelector';

function CookieBanner() {
  const [showBanner, setShowBanner] = useState(true);

  // Funzione per riaprire il banner
  const handleReopenBanner = () => {
    setShowBanner(true);
  };
  
  // Initialize preferences state
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true
    analytics: true
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (consent) {
      const savedPreferences = JSON.parse(consent);
      setPreferences(savedPreferences);
      setShowBanner(false); // Nascondi il banner se c'è già un consenso salvato
      
      if (savedPreferences.analytics) {
        initializeAnalytics();
      }
    }
  }, []);

  const initializeAnalytics = () => {
    ReactGA.initialize(process.env.NEXT_PUBLIC_GA_TRACKING_ID || 'G-XXXXXXXXXX');
    ReactGA.send({ hitType: "pageview", page: window.location.pathname + window.location.search });
  };

  const handleSave = () => {
    // Crea un nuovo oggetto con le preferenze aggiornate
    const newPreferences = {
      ...preferences,
      necessary: true, // Assicura che i cookie necessari siano sempre attivi
      analytics: preferences.analytics
    };
    
    // Salva le preferenze nel localStorage
    localStorage.setItem('cookieConsent', JSON.stringify(newPreferences));
    
    // Inizializza analytics se necessario
    if (newPreferences.analytics) {
      initializeAnalytics();
    }
    
    // Aggiorna lo stato e chiudi il banner
    setPreferences(newPreferences);
    setShowBanner(false);
  };

  return (
    <>
      {!showBanner && (
        <button
          onClick={handleReopenBanner}
          className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-all duration-300 ease-in-out animate-fade-in"
          title="Impostazioni Cookie"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
            <path d="M8.5 8.5v.01" />
            <path d="M16 15.5v.01" />
            <path d="M12 12v.01" />
          </svg>
        </button>
      )}
      <div
        className={`fixed bottom-4 right-4 bg-white/10 backdrop-blur-sm rounded-lg p-4 max-w-md border border-white/10 transition-all duration-300 ease-in-out transform ${
          showBanner
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8 pointer-events-none'
        }`}
      >
      <h3 className="text-white font-medium mb-2">Impostazioni Privacy</h3>
      <p className="text-white/80 text-sm mb-4">
        Utilizziamo Google Analytics per monitorare il traffico del sito. I cookie necessari invece sono sempre attivi. 
        Puoi scegliere se accettare i cookie analytics per aiutarci a migliorare il sito.
      </p>
      
      <div className="space-y-2 mb-4">
        <label className="flex items-center text-white/80">
          <input
            type="checkbox"
            checked={preferences.necessary}
            disabled
            className="mr-2"
          />
          Cookie necessari
        </label>
        
        <label className="flex items-center text-white/80">
          <input
            type="checkbox"
            checked={preferences.analytics}
            onChange={(e) => setPreferences(prev => ({
              ...prev,
              analytics: e.target.checked
            }))}
            className="mr-2"
          />
          Cookie analytics
        </label>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Salva preferenze
        </button>
        {/* <a
          href="/privacy-policy"
          className="text-white/80 text-sm hover:text-white"
        >
          Privacy Policy
        </a> */}
      </div>
    </div>
   </>
  );
}

export default function Home() {
  const [selectedLeague, setSelectedLeague] = useState('Standard');

  useEffect(() => {
    const hasConsent = localStorage.getItem('cookieConsent');
    if (hasConsent) {
      ReactGA.initialize(process.env.NEXT_PUBLIC_GA_TRACKING_ID || 'G-XXXXXXXXXX');
      ReactGA.send({ hitType: "pageview", page: window.location.pathname + window.location.search });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-slate-900 p-8">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20" />
      <main className="relative max-w-2xl mx-auto space-y-8">
        <div className="space-y-4 text-center">
          <h1 className="text-6xl font-black drop-shadow-lg">
          <span className="bg-gradient-to-r from-green-600 via-white to-red-600 bg-clip-text text-transparent">
              POE2 Italia
          </span>
          </h1>
          <p className="text-2xl font-medium text-white/80">
            Item Checker
          </p>
          <div className="h-[1px] w-24 mx-auto bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
        </div>
        <LeagueSelector
          selectedLeague={selectedLeague}
          onLeagueChange={setSelectedLeague}
        />
        <ItemChecker league={selectedLeague} />
        <div className="backdrop-blur-sm bg-white/5 rounded-xl p-6 space-y-4">
          <div className="space-y-3">
            <h2 className="text-lg font-medium text-white/90 text-center">Come usare il checker</h2>
            <ol className="text-white/70 space-y-2 list-decimal list-inside">
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">1.</span>
                Copia un oggetto da Path of Exile (Ctrl+C mentre passi il mouse sopra un oggetto)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">2.</span>
                Incollalo nella casella di testo del controllo oggetti qui sopra
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">3.</span>
                Attiva o disattiva se vuoi includere il livello dell&apos;oggetto nella ricerca
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">4.</span>
                Clicca su &quot;Cerca su PoE Trade&quot; per aprire il sito ufficiale di scambio
              </li>
            </ol>
          </div>
        </div>
        <CookieBanner />
        <footer className="text-center">
          <a
            href="https://github.com/sanzodown/poe-item-checker"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white/90 transition-colors"
          >
            <svg height="24" width="24" viewBox="0 0 16 16" className="fill-current">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <span>basato su Pewpewlazer Item Checker</span>
          </a>
        </footer>
      </main>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

// Types for API responses
interface ManualResult {
  sn: string;
  codiceManuale: string;
  nome: string;
  descrizione: string;
  revisione: string;
  lingueDisponibili: string[];
  fileUrls?: { [lingua: string]: string };
}

const lingue = [
  { code: 'IT', name: 'Italiano' },
  { code: 'EN', name: 'English' },
  { code: 'DE', name: 'Deutsch' },
  { code: 'FR', name: 'Français' },
  { code: 'ES', name: 'Español' }
];

export default function ManualSearch() {
  const searchParams = useSearchParams();
  const [serialNumber, setSerialNumber] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('IT');
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<ManualResult[]>([]);

  // Gestione parametro URL serial
  useEffect(() => {
    const serialFromUrl = searchParams.get('serial');
    if (serialFromUrl) {
      setSerialNumber(serialFromUrl);
      handleSearch(serialFromUrl, selectedLanguage);
    }
  }, [searchParams]);

  const handleSearch = async (sn?: string, lang?: string) => {
    const searchSN = sn || serialNumber;
    
    if (!searchSN.trim()) {
      alert('Inserire il Serial Number');
      return;
    }

    setIsSearching(true);
    setShowResults(false);

    try {
      const response = await fetch(`/api/search?serial_number=${encodeURIComponent(searchSN)}&language=${lang || selectedLanguage}`);
      const data = await response.json();

      if (response.ok) {
        setSearchResults(data.data || []);
      } else {
        console.error('Search error:', data.error);
        alert('Errore nella ricerca: ' + (data.error || 'Errore sconosciuto'));
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Errore nella ricerca. Riprova più tardi.');
      setSearchResults([]);
    } finally {
      setShowResults(true);
      setIsSearching(false);
    }
  };

  const downloadManual = async (manual: ManualResult, language: string) => {
    try {
      const response = await fetch(`/api/download?codice_manuale=${encodeURIComponent(manual.codiceManuale)}&lingua=${language}&serial_number=${encodeURIComponent(manual.sn)}`);
      const data = await response.json();

      if (response.ok) {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = data.fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('Errore nel download: ' + (data.error || 'File non disponibile'));
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Errore nel download. Riprova più tardi.');
    }
  };

  const getLanguageName = (code: string) => {
    return lingue.find(lang => lang.code === code)?.name || code;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="shadow-sm border-b border-gray-200" style={{ backgroundColor: '#007AC2' }}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {/* Logo Ferrari */}
            <div className="flex-shrink-0">
              <Image
                src="/logo Ferrari.svg"
                alt="Ferrari Logo"
                width={60}
                height={48}
                className="h-12 w-auto"
              />
            </div>
            
            {/* Titolo */}
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">
                Ferrari Ventilatori - Ricerca Manuali
              </h1>
              <p className="mt-2 text-blue-100 text-sm lg:text-base">
                Inserisci il Serial Number del ventilatore per accedere ai manuali
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 flex-grow">
        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Serial Number Input */}
            <div className="md:col-span-2">
              <label htmlFor="serial" className="block text-sm font-medium text-gray-700 mb-2">
                Serial Number
              </label>
              <input
                type="text"
                id="serial"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Inserisci il Serial Number (es. 2504485)"
                className="w-full h-12 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors text-gray-700"
              />
            </div>

            {/* Language Selector */}
            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                Lingua
              </label>
              <select
                id="language"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full h-12 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors bg-white text-gray-700"
              >
                {lingue.map((lingua) => (
                  <option key={lingua.code} value={lingua.code}>
                    {lingua.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Button */}
          <button
            onClick={() => handleSearch()}
            disabled={isSearching}
            className="w-full md:w-auto px-8 py-3 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            style={{ backgroundColor: '#007AC2' }}
          >
            {isSearching ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Ricerca in corso...
              </div>
            ) : (
              'Cerca Manuali'
            )}
          </button>
        </div>

        {/* Results Section */}
        {showResults && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Risultati della ricerca
            </h2>

            {searchResults.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-6xl mb-4">📄</div>
                <p className="text-gray-700">
                  Nessun manuale trovato per il Serial Number &quot;{serialNumber}&quot;
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {searchResults.map((manual: ManualResult, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        {manual.nome}
                      </h3>
                      <div className="text-sm text-gray-700 space-y-1 mb-3">
                        <p><span className="font-medium">Codice:</span> {manual.codiceManuale}</p>
                        <p><span className="font-medium">Revisione:</span> {manual.revisione}</p>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {manual.descrizione}
                      </p>
                    </div>

                    {/* Lingue disponibili */}
                    <div className="border-t border-gray-100 pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Scarica nelle lingue:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {manual.lingueDisponibili.map((langCode: string) => {
                          const isSelected = langCode === selectedLanguage;
                          return (
                            <button
                              key={langCode}
                              onClick={() => downloadManual(manual, langCode)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                isSelected
                                  ? 'text-white shadow-md'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                              }`}
                              style={isSelected ? { backgroundColor: '#007AC2' } : {}}
                            >
                              <span className="flex items-center gap-2">
   
                                {getLanguageName(langCode)}
                                <svg 
                                  className="w-4 h-4" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24" 
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                                  />
                                </svg>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 bg-gray-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            Come utilizzare la ricerca
          </h3>
          <ul className="text-gray-700 space-y-2">
            <li className="flex items-start">
              <span className="text-gray-400 mr-2">1.</span>
              Inserisci il Serial Number del ventilatore (presente sulla targa identificativa)
            </li>
            <li className="flex items-start">
              <span className="text-gray-400 mr-2">2.</span>
              Seleziona la lingua desiderata dal menu a tendina
            </li>
            <li className="flex items-start">
              <span className="text-gray-400 mr-2">3.</span>
              Clicca su &quot;Cerca Manuali&quot; per visualizzare i risultati
            </li>
            <li className="flex items-start">
              <span className="text-gray-400 mr-2">4.</span>
              Scegli la lingua e scarica il manuale specifico per la tua macchina
            </li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-gray-700">
          <p>© 2025 Ferrari Ventilatori - Sistema di Ricerca Manuali</p>
        </div>
      </footer>
    </div>
  );
}

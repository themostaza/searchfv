'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tables, Json } from '@/types/supabase';

type Download = Tables<'download'>;

interface DownloadBody {
  serial_number?: string;
  codice_manuale?: string;
  download_result?: string;
  lingua?: string;
  ip_address?: string;
  request_timestamp?: string;
  [key: string]: Json | undefined;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
  show: boolean;
}

interface DownloadWithManuale extends Download {
  manuali?: {
    codice_manuale: string | null;
    lingua: string | null;
    revisione_code: string | null;
    descrizione: string | null;
  } | null;
}

export default function DownloadsPage() {
  const [downloads, setDownloads] = useState<DownloadWithManuale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResult, setSelectedResult] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedDownload, setSelectedDownload] = useState<DownloadWithManuale | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [notification, setNotification] = useState<Notification>({
    type: 'success',
    message: '',
    show: false
  });

  const ITEMS_PER_PAGE = 20;

  // Auto-hide notification after 4 seconds
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message, show: true });
  };

  const openModal = (download: DownloadWithManuale) => {
    setSelectedDownload(download);
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedDownload(null);
    setShowModal(false);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('download')
        .select(`
          *,
          manuali:manuale_id (
            codice_manuale,
            lingua,
            revisione_code,
            descrizione
          )
        `, { count: 'exact' });

      // Filtri di ricerca
      if (searchTerm) {
        query = query.or(`body->serial_number.ilike.%${searchTerm}%,body->codice_manuale.ilike.%${searchTerm}%`);
      }

      if (selectedResult) {
        query = query.eq('body->download_result', selectedResult);
      }

      if (selectedLanguage) {
        query = query.eq('body->lingua', selectedLanguage);
      }

      // Paginazione
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data: downloadsData, error: downloadsError, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (downloadsError) throw downloadsError;
      
      setDownloads(downloadsData || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading downloads:', error);
      showNotification('error', 'Errore nel caricamento dei download');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, selectedResult, selectedLanguage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedResult('');
    setSelectedLanguage('');
    setCurrentPage(1);
  };

  const getResultBadgeColor = (result: string) => {
    switch (result) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'product_not_found':
        return 'bg-yellow-100 text-yellow-800';
      case 'manual_not_found':
        return 'bg-orange-100 text-orange-800';
      case 'file_not_available':
        return 'bg-red-100 text-red-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getResultLabel = (result: string) => {
    switch (result) {
      case 'success':
        return 'Successo';
      case 'product_not_found':
        return 'Prodotto non trovato';
      case 'manual_not_found':
        return 'Manuale non trovato';
      case 'file_not_available':
        return 'File non disponibile';
      case 'error':
        return 'Errore';
      default:
        return result;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('it-IT');
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Notification */}
        {notification.show && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {notification.message}
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Downloads</h1>
              <p className="text-gray-600 mt-2">Gestione log dei download effettuati</p>
            </div>
            <div className="text-sm text-gray-500">
              Totale: {totalCount} download
            </div>
          </div>
        </div>

        {/* Filtri */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Serial Number / Codice Manuale
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
                placeholder="Cerca..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Risultato
              </label>
              <select
                value={selectedResult}
                onChange={(e) => setSelectedResult(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
              >
                <option value="">Tutti i risultati</option>
                <option value="success">Successo</option>
                <option value="product_not_found">Prodotto non trovato</option>
                <option value="manual_not_found">Manuale non trovato</option>
                <option value="file_not_available">File non disponibile</option>
                <option value="error">Errore</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lingua
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
              >
                <option value="">Tutte le lingue</option>
                <option value="IT">Italiano</option>
                <option value="EN">English</option>
                <option value="DE">Deutsch</option>
                <option value="FR">Français</option>
                <option value="ES">Español</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Reset Filtri
              </button>
            </div>
          </div>
        </div>

        {/* Tabella */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data/Ora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Serial Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manuale
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lingua
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risultato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {downloads.map((download) => {
                  const body = download.body as DownloadBody;
                  return (
                    <tr key={download.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTimestamp(body?.request_timestamp || download.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {body?.serial_number || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {body?.codice_manuale || download.manuali?.codice_manuale || 'N/A'}
                        </div>
                        {download.manuali?.revisione_code && (
                          <div className="text-xs text-gray-500">
                            Rev: {download.manuali.revisione_code}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {body?.lingua || download.manuali?.lingua || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getResultBadgeColor(body?.download_result || 'unknown')
                        }`}>
                          {getResultLabel(body?.download_result || 'Unknown')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {body?.ip_address || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openModal(download)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Dettagli
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {downloads.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📥</div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Nessun download trovato</h4>
              <p className="text-gray-500">Non ci sono download che corrispondono ai filtri selezionati</p>
            </div>
          )}
        </div>

        {/* Paginazione */}
        {totalPages > 1 && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} di {totalCount} risultati
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Precedente
                </button>
                <span className="px-3 py-2 text-sm font-medium text-gray-700">
                  Pagina {currentPage} di {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Successiva
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal per i dettagli */}
      {showModal && selectedDownload && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={closeModal}></div>
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-900">
                  Dettagli Download - {(selectedDownload.body as DownloadBody)?.serial_number || 'N/A'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body con scroll - flex-1 per occupare spazio disponibile */}
              <div className="p-6 overflow-y-auto flex-1">
                <div className="space-y-6">
                  {/* Informazioni di base */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Informazioni Generali</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-600">ID:</span>
                        <p className="text-sm text-gray-900 font-mono">{selectedDownload.id}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Serial Number:</span>
                        <p className="text-sm text-gray-900">{(selectedDownload.body as DownloadBody)?.serial_number || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Data Creazione:</span>
                        <p className="text-sm text-gray-900">{formatTimestamp(selectedDownload.created_at)}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Risultato:</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getResultBadgeColor((selectedDownload.body as DownloadBody)?.download_result || 'unknown')
                        }`}>
                          {getResultLabel((selectedDownload.body as DownloadBody)?.download_result || 'Unknown')}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Manuale ID:</span>
                        <p className="text-sm text-gray-900 font-mono">{selectedDownload.manuale_id || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Codice Manuale:</span>
                        <p className="text-sm text-gray-900">{(selectedDownload.body as DownloadBody)?.codice_manuale || selectedDownload.manuali?.codice_manuale || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Dati del manuale associato */}
                  {selectedDownload.manuali && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Dati Manuale</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium text-gray-600">Codice:</span>
                          <p className="text-sm text-gray-900">{selectedDownload.manuali.codice_manuale || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">Lingua:</span>
                          <p className="text-sm text-gray-900">{selectedDownload.manuali.lingua || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">Revisione:</span>
                          <p className="text-sm text-gray-900">{selectedDownload.manuali.revisione_code || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">Descrizione:</span>
                          <p className="text-sm text-gray-900">{selectedDownload.manuali.descrizione || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dati del download */}
                  {selectedDownload.body && (
                    <div className="bg-orange-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Dettagli Download</h4>
                      <div className="space-y-3">
                        {Object.entries(selectedDownload.body as DownloadBody).map(([key, value]) => (
                          <div key={key} className="border-b border-orange-100 pb-2 last:border-b-0">
                            <span className="text-sm font-medium text-gray-600 capitalize">
                              {key.replace(/_/g, ' ')}:
                            </span>
                            <div className="mt-1">
                              {typeof value === 'object' ? (
                                <pre className="text-xs text-gray-900 bg-white p-2 rounded border overflow-x-auto">
                                  {JSON.stringify(value, null, 2)}
                                </pre>
                              ) : (
                                <p className="text-sm text-gray-900 break-words">
                                  {String(value)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer - sempre visibile */}
              <div className="flex justify-end p-6 border-t border-gray-200 flex-shrink-0">
                <button
                  onClick={closeModal}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
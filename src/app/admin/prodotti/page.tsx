'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';

type Prodotto = Tables<'prodotti'>;
type ProdottoInsert = TablesInsert<'prodotti'>;
type ProdottoUpdate = TablesUpdate<'prodotti'>;

interface Notification {
  type: 'success' | 'error';
  message: string;
  show: boolean;
}

export default function ProdottiPage() {
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProdotto, setEditingProdotto] = useState<Prodotto | null>(null);
  const [formData, setFormData] = useState<ProdottoInsert>({
    serial_number: '',
    codice_manuale: '',
    revisione_code: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCodiceManuale, setSelectedCodiceManuale] = useState('');
  const [codiciManuali, setCodiciManuali] = useState<string[]>([]);
  const [notification, setNotification] = useState<Notification>({
    type: 'success',
    message: '',
    show: false
  });

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

  useEffect(() => {
    loadProdotti();
  }, []);

  // Reload data when filters change
  useEffect(() => {
    if (prodotti.length > 0 || searchTerm || selectedCodiceManuale) {
      loadProdotti();
    }
  }, [searchTerm, selectedCodiceManuale]);

  const loadProdotti = async () => {
    try {
      // Build query with filters
      let query = supabase
        .from('prodotti')
        .select('*');

      // Apply search filter
      if (searchTerm.trim()) {
        query = query.or(`serial_number.ilike.%${searchTerm}%,codice_manuale.ilike.%${searchTerm}%`);
      }

      // Apply codice manuale filter
      if (selectedCodiceManuale) {
        query = query.eq('codice_manuale', selectedCodiceManuale);
      }

      // Execute query
      const { data: prodottiData, error: prodottiError } = await query
        .order('created_at', { ascending: false });

      if (prodottiError) throw prodottiError;
      setProdotti(prodottiData || []);

      // Load unique codici manuali for filter dropdown
      const { data: codiciData, error: codiciError } = await supabase
        .from('prodotti')
        .select('codice_manuale')
        .not('codice_manuale', 'is', null)
        .order('codice_manuale');

      if (!codiciError && codiciData) {
        const uniqueCodici = [...new Set(codiciData.map(item => item.codice_manuale).filter(Boolean))] as string[];
        setCodiciManuali(uniqueCodici);
      }
    } catch (error) {
      console.error('Error loading prodotti:', error);
      showNotification('error', 'Errore nel caricamento dei prodotti');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.serial_number?.trim()) {
      showNotification('error', 'Il Serial Number è obbligatorio');
      return;
    }

    setLoading(true);

    try {
      // Check for duplicate serial number (except when editing the same product)
      const { data: existingProduct, error: checkError } = await supabase
        .from('prodotti')
        .select('id')
        .eq('serial_number', formData.serial_number.trim())
        .neq('id', editingProdotto?.id || '');

      if (checkError) throw checkError;

      if (existingProduct && existingProduct.length > 0) {
        showNotification('error', 'Esiste già un prodotto con questo Serial Number');
        setLoading(false);
        return;
      }

      const saveData = {
        serial_number: formData.serial_number.trim(),
        codice_manuale: formData.codice_manuale?.trim() || null,
        revisione_code: formData.revisione_code?.trim() || null,
      };

      if (editingProdotto) {
        // Update existing product
        const { error } = await supabase
          .from('prodotti')
          .update(saveData as ProdottoUpdate)
          .eq('id', editingProdotto.id);

        if (error) throw error;
        showNotification('success', 'Prodotto aggiornato con successo!');
      } else {
        // Create new product
        const { error } = await supabase
          .from('prodotti')
          .insert(saveData as ProdottoInsert);

        if (error) throw error;
        showNotification('success', 'Prodotto creato con successo!');
      }

      resetForm();
      loadProdotti();
    } catch (error) {
      console.error('Error saving prodotto:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      showNotification('error', `Errore nel salvataggio del prodotto: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (prodotto: Prodotto) => {
    setEditingProdotto(prodotto);
    setFormData({
      serial_number: prodotto.serial_number,
      codice_manuale: prodotto.codice_manuale,
      revisione_code: prodotto.revisione_code,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo prodotto?')) return;

    try {
      const { error } = await supabase
        .from('prodotti')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showNotification('success', 'Prodotto eliminato con successo!');
      loadProdotti();
    } catch (error) {
      console.error('Error deleting prodotto:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      showNotification('error', `Errore nell'eliminazione del prodotto: ${errorMessage}`);
    }
  };

  const resetForm = () => {
    setFormData({
      serial_number: '',
      codice_manuale: '',
      revisione_code: '',
    });
    setEditingProdotto(null);
    setShowForm(false);
  };

  // No more frontend filtering - all filtering is done in backend

  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-2">
        {/* Notification Toast */}
        {notification.show && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
            notification.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            <div className="flex items-center">
              {notification.type === 'success' ? (
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <span className="text-sm font-medium">{notification.message}</span>
              <button
                onClick={() => setNotification(prev => ({ ...prev, show: false }))}
                className="ml-4 text-white hover:text-gray-200"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestione Prodotti</h1>
              <p className="text-gray-700 mt-2">Gestisci i prodotti e i loro serial number</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-6 py-3 text-white rounded-lg font-medium hover:opacity-90 transition-all shadow-md"
              style={{ backgroundColor: '#007AC2' }}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Aggiungi Prodotto
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Cerca per Serial Number o Codice Manuale..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-700 placeholder-gray-500"
              />
            </div>
            <div>
              <select
                value={selectedCodiceManuale}
                onChange={(e) => setSelectedCodiceManuale(e.target.value)}
                className="w-full h-10 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-700"
              >
                <option value="">Tutti i codici</option>
                {codiciManuali.map((codice) => (
                  <option key={codice} value={codice}>
                    {codice}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-700">
            {prodotti.length} prodotti trovati
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Serial Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Codice Manuale
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revisione
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Creazione
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : prodotti.length > 0 ? (
                  prodotti.map((prodotto) => (
                    <tr key={prodotto.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {prodotto.serial_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {prodotto.codice_manuale || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {prodotto.revisione_code || 'N/A'} 
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {new Date(prodotto.created_at).toLocaleDateString('it-IT')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(prodotto)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          Modifica
                        </button>
                        <button
                          onClick={() => handleDelete(prodotto.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          Elimina
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-700">
                      Nessun prodotto trovato
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingProdotto ? 'Modifica Prodotto' : 'Nuovo Prodotto'}
                </h3>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Serial Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.serial_number || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-700 placeholder-gray-500"
                    placeholder="es. 2504485"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Codice Manuale
                  </label>
                  <input
                    type="text"
                    value={formData.codice_manuale || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, codice_manuale: e.target.value }))}
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-700 placeholder-gray-500"
                    placeholder="es. MVC_STD"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Codice Revisione
                  </label>
                  <input
                    type="text"
                    value={formData.revisione_code || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, revisione_code: e.target.value }))}
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-700 placeholder-gray-500"
                    placeholder="es. 001"
                  />
                </div>


                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-all"
                    style={{ backgroundColor: '#007AC2' }}
                  >
                    {editingProdotto ? 'Aggiorna' : 'Crea'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
} 
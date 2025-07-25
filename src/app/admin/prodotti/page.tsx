'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';

type Prodotto = Tables<'prodotti'>;
type ProdottoInsert = TablesInsert<'prodotti'>;
type ProdottoUpdate = TablesUpdate<'prodotti'>;

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

  useEffect(() => {
    loadProdotti();
  }, []);

  const loadProdotti = async () => {
    try {
      const { data, error } = await supabase
        .from('prodotti')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProdotti(data || []);
    } catch (error) {
      console.error('Error loading prodotti:', error);
      alert('Errore nel caricamento dei prodotti');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingProdotto) {
        // Update existing product
        const { error } = await supabase
          .from('prodotti')
          .update(formData as ProdottoUpdate)
          .eq('id', editingProdotto.id);

        if (error) throw error;
        alert('Prodotto aggiornato con successo!');
      } else {
        // Create new product
        const { error } = await supabase
          .from('prodotti')
          .insert(formData);

        if (error) throw error;
        alert('Prodotto creato con successo!');
      }

      resetForm();
      loadProdotti();
    } catch (error) {
      console.error('Error saving prodotto:', error);
      alert('Errore nel salvataggio del prodotto');
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
      alert('Prodotto eliminato con successo!');
      loadProdotti();
    } catch (error) {
      console.error('Error deleting prodotto:', error);
      alert('Errore nell\'eliminazione del prodotto');
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

  const filteredProdotti = prodotti.filter(prodotto =>
    prodotto.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prodotto.codice_manuale?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-2">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestione Prodotti</h1>
              <p className="text-gray-700 mt-2">Gestisci i prodotti e i loro serial number</p>
            </div>
            {/* <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-6 py-3 text-white rounded-lg font-medium hover:opacity-90 transition-all shadow-md"
              style={{ backgroundColor: '#007AC2' }}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Aggiungi Prodotto
            </button> */}
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Cerca per Serial Number o Codice Manuale..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-700 placeholder-gray-500"
              />
            </div>
            <div className="text-sm text-gray-700">
              {filteredProdotti.length} di {prodotti.length} prodotti
            </div>
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
                  {/* <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th> */}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : filteredProdotti.length > 0 ? (
                  filteredProdotti.map((prodotto) => (
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
                      {/* <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
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
                      </td> */}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-700">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ordine Revisione
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.revisione_code || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, revisione_code: e.target.value }))}
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-700"
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
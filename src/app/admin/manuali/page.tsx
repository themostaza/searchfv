'use client';

import { useEffect, useState } from 'react';
import { supabase, uploadFile, deleteFile } from '@/lib/supabase';
import type { Manuale, ManualeInsert, ManualeUpdate, Prodotto } from '@/types/supabase';

const lingue = [
  { code: 'IT', name: 'Italiano' },
  { code: 'EN', name: 'English' },
  { code: 'DE', name: 'Deutsch' },
  { code: 'FR', name: 'Français' },
  { code: 'ES', name: 'Español' }
];

export default function ManualiPage() {
  const [manuali, setManuali] = useState<(Manuale & { prodotto?: Prodotto })[]>([]);
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingManuale, setEditingManuale] = useState<Manuale | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [formData, setFormData] = useState<ManualeInsert & { file?: File }>({
    codice_manuale: '',
    descrizione: '',
    lingua: 'IT',
    prodotto_id: '',
    revisione_code: '',
    revisione_order: 1
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLingua, setSelectedLingua] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load prodotti
      const { data: prodottiData, error: prodottiError } = await supabase
        .from('prodotti')
        .select('*')
        .order('serial_number', { ascending: true });

      if (prodottiError) throw prodottiError;
      setProdotti(prodottiData || []);

      // Load manuali with prodotti data
      const { data: manualiData, error: manualiError } = await supabase
        .from('manuali')
        .select(`
          *,
          prodotto:prodotti(*)
        `)
        .order('created_at', { ascending: false });

      if (manualiError) throw manualiError;
      setManuali((manualiData as (Manuale & { prodotto?: Prodotto })[]) || []);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File): Promise<string | null> => {
    if (!file.type.includes('pdf')) {
      alert('Seleziona un file PDF');
      return null;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('Il file deve essere inferiore a 10MB');
      return null;
    }

    setUploadingFile(true);
    try {
      const timestamp = Date.now();
      const fileName = `${formData.codice_manuale}_${formData.lingua}_${timestamp}.pdf`;
      const filePath = `manuali/${fileName}`;
      
      const fileUrl = await uploadFile(file, filePath);
      return fileUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Errore nell\'upload del file');
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let fileUrl = editingManuale?.file_url || null;

      // Handle file upload if new file selected
      if (formData.file) {
        const uploadedUrl = await handleFileUpload(formData.file);
        if (!uploadedUrl) {
          setLoading(false);
          return;
        }
        
        // Delete old file if updating
        if (editingManuale?.file_url) {
          const oldPath = editingManuale.file_url.split('/').pop();
          if (oldPath) {
            await deleteFile(`manuali/${oldPath}`);
          }
        }
        
        fileUrl = uploadedUrl;
      }

      const saveData = {
        codice_manuale: formData.codice_manuale,
        descrizione: formData.descrizione,
        lingua: formData.lingua,
        prodotto_id: formData.prodotto_id || null,
        revisione_code: formData.revisione_code,
        revisione_order: formData.revisione_order,
        file_url: fileUrl
      };

      if (editingManuale) {
        // Update existing manual
        const { error } = await supabase
          .from('manuali')
          .update(saveData as ManualeUpdate)
          .eq('id', editingManuale.id);

        if (error) throw error;
        alert('Manuale aggiornato con successo!');
      } else {
        // Create new manual
        const { error } = await supabase
          .from('manuali')
          .insert(saveData as ManualeInsert);

        if (error) throw error;
        alert('Manuale creato con successo!');
      }

      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving manuale:', error);
      alert('Errore nel salvataggio del manuale');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (manuale: Manuale) => {
    setEditingManuale(manuale);
    setFormData({
      codice_manuale: manuale.codice_manuale,
      descrizione: manuale.descrizione,
      lingua: manuale.lingua,
      prodotto_id: manuale.prodotto_id,
      revisione_code: manuale.revisione_code,
      revisione_order: manuale.revisione_order
    });
    setShowForm(true);
  };

  const handleDelete = async (manuale: Manuale) => {
    if (!confirm('Sei sicuro di voler eliminare questo manuale?')) return;

    try {
      // Delete file from storage
      if (manuale.file_url) {
        const fileName = manuale.file_url.split('/').pop();
        if (fileName) {
          await deleteFile(`manuali/${fileName}`);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('manuali')
        .delete()
        .eq('id', manuale.id);

      if (error) throw error;
      alert('Manuale eliminato con successo!');
      loadData();
    } catch (error) {
      console.error('Error deleting manuale:', error);
      alert('Errore nell\'eliminazione del manuale');
    }
  };

  const handleDownload = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetForm = () => {
    setFormData({
      codice_manuale: '',
      descrizione: '',
      lingua: 'IT',
      prodotto_id: '',
      revisione_code: '',
      revisione_order: 1
    });
    setEditingManuale(null);
    setShowForm(false);
  };

  const filteredManuali = manuali.filter(manuale => {
    const matchesSearch = 
      manuale.codice_manuale?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manuale.descrizione?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLingua = !selectedLingua || manuale.lingua === selectedLingua;
    
    return matchesSearch && matchesLingua;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-2">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestione Manuali</h1>
            <p className="text-gray-700">Gestisci i manuali PDF e i loro metadati</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 transition-all"
            style={{ backgroundColor: '#007AC2' }}
          >
            + Aggiungi Manuale
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Cerca per Codice Manuale o Descrizione..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-700 placeholder-gray-500"
              />
            </div>
            <div>
              <select
                value={selectedLingua}
                onChange={(e) => setSelectedLingua(e.target.value)}
                className="w-full h-10 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-700"
              >
                <option value="">Tutte le lingue</option>
                {lingue.map((lingua) => (
                  <option key={lingua.code} value={lingua.code}>
                    {lingua.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-700">
            {filteredManuali.length} di {manuali.length} manuali
          </div>
        </div>

        {/* Manuali Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Codice Manuale
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrizione
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lingua
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prodotto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : filteredManuali.length > 0 ? (
                  filteredManuali.map((manuale) => (
                    <tr key={manuale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {manuale.codice_manuale || 'N/A'}
                        {manuale.revisione_code && (
                          <div className="text-xs text-gray-500">Rev. {manuale.revisione_code}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                        {manuale.descrizione || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {manuale.lingua || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {manuale.prodotto?.serial_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {manuale.file_url ? (
                          <button
                            onClick={() => handleDownload(manuale.file_url!, `${manuale.codice_manuale}_${manuale.lingua}.pdf`)}
                            className="text-blue-600 hover:text-blue-900 transition-colors flex items-center"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            PDF
                          </button>
                        ) : (
                          'Nessun file'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(manuale)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          Modifica
                        </button>
                        <button
                          onClick={() => handleDelete(manuale)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          Elimina
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-700">
                      Nessun manuale trovato
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
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingManuale ? 'Modifica Manuale' : 'Nuovo Manuale'}
                </h3>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Codice Manuale *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.codice_manuale || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, codice_manuale: e.target.value }))}
                      className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-700 placeholder-gray-500"
                      placeholder="es. MVC_STD"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lingua *
                    </label>
                    <select
                      required
                      value={formData.lingua || 'IT'}
                      onChange={(e) => setFormData(prev => ({ ...prev, lingua: e.target.value }))}
                      className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-700"
                    >
                      {lingue.map((lingua) => (
                        <option key={lingua.code} value={lingua.code}>
                          {lingua.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrizione
                  </label>
                  <textarea
                    rows={3}
                    value={formData.descrizione || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, descrizione: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-gray-700 placeholder-gray-500"
                    placeholder="Descrizione del manuale..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prodotto Associato
                  </label>
                  <select
                    value={formData.prodotto_id || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, prodotto_id: e.target.value }))}
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-700"
                  >
                    <option value="">Seleziona un prodotto...</option>
                    {prodotti.map((prodotto) => (
                      <option key={prodotto.id} value={prodotto.id}>
                        {prodotto.serial_number} - {prodotto.codice_manuale}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                      value={formData.revisione_order || 1}
                      onChange={(e) => setFormData(prev => ({ ...prev, revisione_order: parseInt(e.target.value) }))}
                      className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File PDF {!editingManuale && '*'}
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFormData(prev => ({ ...prev, file: e.target.files?.[0] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-700"
                    required={!editingManuale}
                  />
                  <p className="text-xs text-gray-700 mt-1">
                    Solo file PDF, massimo 10MB
                  </p>
                  {editingManuale?.file_url && (
                    <p className="text-xs text-green-600 mt-1">
                      File attuale presente. Seleziona un nuovo file per sostituirlo.
                    </p>
                  )}
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
                    disabled={loading || uploadingFile}
                    className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-all"
                    style={{ backgroundColor: '#007AC2' }}
                  >
                    {uploadingFile ? 'Upload in corso...' : (editingManuale ? 'Aggiorna' : 'Crea')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
} 
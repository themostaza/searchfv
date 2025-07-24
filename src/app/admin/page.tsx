'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Prodotto, Manuale } from '@/types/supabase';

interface Stats {
  totalProdotti: number;
  totalManuali: number;
  manualiPerLingua: { [key: string]: number };
  recentProdotti: Prodotto[];
  recentManuali: Manuale[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalProdotti: 0,
    totalManuali: 0,
    manualiPerLingua: {},
    recentProdotti: [],
    recentManuali: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Conta prodotti
      const { count: prodottiCount } = await supabase
        .from('prodotti')
        .select('*', { count: 'exact', head: true });

      // Conta manuali
      const { count: manualiCount } = await supabase
        .from('manuali')
        .select('*', { count: 'exact', head: true });

      // Manuali per lingua
      const { data: manualiData } = await supabase
        .from('manuali')
        .select('lingua');

      const manualiPerLingua: { [key: string]: number } = {};
      manualiData?.forEach((manuale) => {
        const lingua = manuale.lingua || 'Non specificata';
        manualiPerLingua[lingua] = (manualiPerLingua[lingua] || 0) + 1;
      });

      // Prodotti recenti
      const { data: recentProdotti } = await supabase
        .from('prodotti')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // Manuali recenti
      const { data: recentManuali } = await supabase
        .from('manuali')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalProdotti: prodottiCount || 0,
        totalManuali: manualiCount || 0,
        manualiPerLingua,
        recentProdotti: recentProdotti || [],
        recentManuali: recentManuali || []
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pt-2">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Panoramica del sistema di gestione manuali Ferrari Ventilatori</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4" style={{ borderLeftColor: '#007AC2' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Prodotti Totali</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalProdotti}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <svg className="w-8 h-8" style={{ color: '#007AC2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Manuali Totali</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalManuali}</p>
            </div>
            <div className="p-3 rounded-full bg-green-100">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Lingue Disponibili</p>
              <p className="text-3xl font-bold text-gray-900">{Object.keys(stats.manualiPerLingua).length}</p>
            </div>
            <div className="p-3 rounded-full bg-purple-100">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Sistema</p>
              <p className="text-3xl font-bold text-emerald-600">Online</p>
            </div>
            <div className="p-3 rounded-full bg-emerald-100">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts/Tables Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Manuali per Lingua */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Manuali per Lingua</h3>
            <div className="text-sm text-gray-500">
              {Object.keys(stats.manualiPerLingua).length} lingue attive
            </div>
          </div>
          <div className="space-y-4">
            {Object.keys(stats.manualiPerLingua).length > 0 ? (
              Object.entries(stats.manualiPerLingua).map(([lingua, count]) => (
                <div key={lingua} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#007AC2' }}></div>
                    <span className="font-medium text-gray-700">{lingua}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 h-2 bg-gray-200 rounded-full">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: '#007AC2',
                          width: `${stats.totalManuali > 0 ? (count / stats.totalManuali) * 100 : 0}%`
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-2">📊</div>
                <p className="text-gray-500">Nessun manuale ancora caricato</p>
              </div>
            )}
          </div>
        </div>

        {/* Prodotti Recenti */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Prodotti Recenti</h3>
            <div className="text-sm text-gray-500">
              Ultimi {stats.recentProdotti.length} aggiunti
            </div>
          </div>
          <div className="space-y-4">
            {stats.recentProdotti.length > 0 ? (
              stats.recentProdotti.map((prodotto) => (
                <div key={prodotto.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{prodotto.serial_number}</p>
                      <p className="text-sm text-gray-500">{prodotto.codice_manuale || 'N/A'}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded">
                    {new Date(prodotto.created_at).toLocaleDateString('it-IT')}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-2">📦</div>
                <p className="text-gray-500">Nessun prodotto ancora creato</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manuali Recenti */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">Manuali Recenti</h3>
            <div className="text-sm text-gray-500">
              Ultimi {stats.recentManuali.length} caricati
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          {stats.recentManuali.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Codice Manuale
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lingua
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revisione
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Creazione
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stato
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.recentManuali.map((manuale) => (
                  <tr key={manuale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {manuale.codice_manuale || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {manuale.descrizione ? `${manuale.descrizione.substring(0, 50)}...` : 'Nessuna descrizione'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {manuale.lingua || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {manuale.revisione_code || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(manuale.created_at).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {manuale.file_url ? 'Disponibile' : 'In attesa'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📄</div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Nessun manuale caricato</h4>
              <p className="text-gray-500 mb-6">Inizia caricando il primo manuale per vedere le statistiche</p>
              <a
                href="/admin/manuali"
                className="inline-flex items-center px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 transition-all"
                style={{ backgroundColor: '#007AC2' }}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Aggiungi Manuale
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface GroupedManuale {
  sn: string;
  codiceManuale: string | null;
  nome: string;
  descrizione: string;
  revisione: string;
  lingueDisponibili: string[];
  fileUrls: { [lingua: string]: string };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serialNumber = searchParams.get('serial_number');

    if (!serialNumber) {
      return NextResponse.json(
        { error: 'Serial number is required' },
        { status: 400 }
      );
    }

    // First, find products with matching serial number
    const { data: prodotti, error: prodottiError } = await supabase
      .from('prodotti')
      .select('id, serial_number, codice_manuale')
      .ilike('serial_number', `%${serialNumber}%`);

    if (prodottiError) {
      return NextResponse.json({ error: prodottiError.message }, { status: 400 });
    }

    if (!prodotti || prodotti.length === 0) {
      return NextResponse.json({ 
        data: [],
        message: 'No products found with the specified serial number'
      });
    }

    // Get product IDs
    const prodottoIds = prodotti.map(p => p.id);

    // Find manuals for these products
    const { data: manuali, error: manualiError } = await supabase
      .from('manuali')
      .select(`
        id,
        codice_manuale,
        descrizione,
        lingua,
        revisione_code,
        revisione_order,
        file_url,
        prodotto_id,
        prodotto:prodotti(serial_number, codice_manuale)
      `)
      .in('prodotto_id', prodottoIds)
      .order('revisione_order', { ascending: false });

    if (manualiError) {
      return NextResponse.json({ error: manualiError.message }, { status: 400 });
    }

    // Group manuals by codice_manuale and return the format expected by the frontend
    const groupedManuali: { [key: string]: GroupedManuale } = {};

    manuali?.forEach(manuale => {
      const key = manuale.codice_manuale || 'unknown';
      
      if (!groupedManuali[key]) {
        groupedManuali[key] = {
          sn: manuale.prodotto?.serial_number || serialNumber,
          codiceManuale: manuale.codice_manuale,
          nome: getManualName(manuale.codice_manuale),
          descrizione: manuale.descrizione || getManualDescription(manuale.codice_manuale),
          revisione: manuale.revisione_code || '001',
          lingueDisponibili: [],
          fileUrls: {}
        };
      }

      // Add language if not already present
      if (manuale.lingua && !groupedManuali[key].lingueDisponibili.includes(manuale.lingua)) {
        groupedManuali[key].lingueDisponibili.push(manuale.lingua);
        if (manuale.file_url) {
          groupedManuali[key].fileUrls[manuale.lingua] = manuale.file_url;
        }
      }
    });

    // Convert to array format
    const results = Object.values(groupedManuali);

    return NextResponse.json({ 
      data: results,
      searchTerm: serialNumber
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions to generate default names and descriptions
function getManualName(codiceManuale: string | null): string {
  if (!codiceManuale) return 'Manuale Non Specificato';
  
  const mapping: { [key: string]: string } = {
    'MVC_STD': 'Manuale Ventilatore Standard',
    'ROLLOUT': 'Manuale Installazione Rollout',
    'SWINGOUT': 'Manuale Installazione Swingout',
    'MAINTENANCE': 'Manuale Manutenzione',
    'TECHNICAL': 'Specifiche Tecniche'
  };

  return mapping[codiceManuale] || `Manuale ${codiceManuale}`;
}

function getManualDescription(codiceManuale: string | null): string {
  if (!codiceManuale) return 'Manuale per ventilatore Ferrari';
  
  const mapping: { [key: string]: string } = {
    'MVC_STD': 'Manuale completo per l\'installazione, l\'uso e la manutenzione del ventilatore standard. Include istruzioni dettagliate per il montaggio, le specifiche tecniche e i controlli di sicurezza.',
    'ROLLOUT': 'Guida specifica per l\'installazione del sistema rollout. Contiene schemi di montaggio, dimensioni di ingombro e procedure di collaudo.',
    'SWINGOUT': 'Istruzioni complete per l\'installazione del sistema swingout. Include dettagli sui meccanismi di apertura e chiusura, manutenzione preventiva e risoluzione problemi.',
    'MAINTENANCE': 'Guida alla manutenzione preventiva e correttiva. Include programmi di manutenzione, lista di controllo e ricambi consigliati.',
    'TECHNICAL': 'Specifiche tecniche dettagliate, diagrammi elettrici e schemi funzionali del ventilatore.'
  };

  return mapping[codiceManuale] || `Documentazione tecnica per ${codiceManuale}`;
} 
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface GroupedManuale {
  sn: string;
  codiceManuale: string | null;
  nome: string;
  descrizione: string;
  descrizioni: { [lingua: string]: string }; // Aggiungiamo le descrizioni per lingua
  revisione: string;
  lingueDisponibili: string[];
  fileUrls: { [lingua: string]: string };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serialNumber = searchParams.get('serial_number');

  try {
    if (!serialNumber) {
      return NextResponse.json(
        { error: 'Serial number is required' },
        { status: 400 }
      );
    }

    // Step 1: Cerca il prodotto nella tabella prodotti usando il serial_number
    const { data: prodotti, error: prodottiError } = await supabase
      .from('prodotti')
      .select(`
        id,
        serial_number,
        codice_manuale,
        revisione_code
      `)
      .eq('serial_number', serialNumber);

    if (prodottiError) {
      return NextResponse.json({ error: prodottiError.message }, { status: 400 });
    }

    if (!prodotti || prodotti.length === 0) {
      // Salva la ricerca senza risultati
      const searchData = {
        serial_searched: serialNumber,
        body: {
          request_timestamp: new Date().toISOString(),
          user_agent: request.headers.get('user-agent'),
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          search_result: 'no_product_found',
          products_found: 0,
          manuals_found: 0,
          search_params: Object.fromEntries(searchParams.entries())
        }
      };

      await supabase.from('searches').insert(searchData);

      return NextResponse.json({ 
        data: [],
        message: 'No product found with the specified serial number'
      });
    }

    // Step 2: Per ogni prodotto trovato, cerca i manuali correlati
    const allResults: GroupedManuale[] = [];
    let totalManualsFound = 0;

    for (const prodotto of prodotti) {
      if (!prodotto.codice_manuale) {
        continue; // Salta i prodotti senza codice manuale
      }

      // Cerca i manuali che corrispondono al codice_manuale e revisione_code del prodotto
      let manualiQuery = supabase
        .from('manuali')
        .select(`
          id,
          codice_manuale,
          name,
          descrizione,
          lingua,
          revisione_code,
          file_url
        `)
        .eq('codice_manuale', prodotto.codice_manuale);

      // Se il prodotto ha un revisione_code, filtra anche per quello
      if (prodotto.revisione_code) {
        manualiQuery = manualiQuery.eq('revisione_code', prodotto.revisione_code);
      }

      const { data: manuali, error: manualiError } = await manualiQuery
        .order('created_at', { ascending: false });

      if (manualiError) {
        console.error('Error fetching manuals:', manualiError.message);
        continue; // Continua con il prossimo prodotto
      }

      if (!manuali || manuali.length === 0) {
        continue; // Nessun manuale trovato per questo prodotto
      }

      totalManualsFound += manuali.length;

      // Raggruppa i manuali per codice_manuale
      const groupedManuali: { [key: string]: GroupedManuale } = {};

      manuali.forEach(manuale => {
        const key = manuale.codice_manuale || 'unknown';
        
        if (!groupedManuali[key]) {
          groupedManuali[key] = {
            sn: serialNumber,
            codiceManuale: manuale.codice_manuale,
            nome: getManualName(manuale.codice_manuale, manuale.name), // Passiamo anche il nome dal DB
            descrizione: '', // Sarà impostata dopo aver raccolto tutte le descrizioni
            descrizioni: {}, // Raccogliamo tutte le descrizioni per lingua
            revisione: manuale.revisione_code || prodotto.revisione_code || '001',
            lingueDisponibili: [],
            fileUrls: {}
          };
        }

        // Aggiungi lingua se non già presente
        if (manuale.lingua && !groupedManuali[key].lingueDisponibili.includes(manuale.lingua)) {
          groupedManuali[key].lingueDisponibili.push(manuale.lingua);
          if (manuale.file_url) {
            groupedManuali[key].fileUrls[manuale.lingua] = manuale.file_url;
          }
          
          // Aggiungi la descrizione per questa lingua
          if (manuale.descrizione) {
            groupedManuali[key].descrizioni[manuale.lingua] = manuale.descrizione;
          } else {
            // Usa la descrizione di default se non presente nel DB
            groupedManuali[key].descrizioni[manuale.lingua] = getManualDescription(manuale.codice_manuale);
          }
        }
      });

      // Imposta la descrizione principale per ogni manuale con priorità IT > EN > prima disponibile
      Object.values(groupedManuali).forEach(manuale => {
        manuale.descrizione = selectBestDescription(manuale.descrizioni);
      });

      // Aggiungi i risultati di questo prodotto
      allResults.push(...Object.values(groupedManuali));
    }

    // Salva la ricerca con risultati
    const searchData = {
      serial_searched: serialNumber,
      body: {
        request_timestamp: new Date().toISOString(),
        user_agent: request.headers.get('user-agent'),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        search_result: 'success',
        products_found: prodotti.length,
        manuals_found: totalManualsFound,
        grouped_results_count: allResults.length,
        search_params: Object.fromEntries(searchParams.entries()),
        products_data: prodotti,
        results_summary: allResults.map(result => ({
          codice_manuale: result.codiceManuale,
          lingue_disponibili: result.lingueDisponibili,
          revisione: result.revisione
        }))
      }
    };

    // Salva in parallelo senza bloccare la risposta
    supabase.from('searches').insert(searchData).then(({ error }) => {
      if (error) {
        console.error('Error saving search data:', error);
      }
    });

    return NextResponse.json({ 
      data: allResults,
      searchTerm: serialNumber
    });

  } catch (error) {
    console.error('Search API error:', error);

    // Salva anche gli errori
    const searchData = {
      serial_searched: searchParams?.get('serial_number') || 'unknown',
      body: {
        request_timestamp: new Date().toISOString(),
        user_agent: request.headers.get('user-agent'),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        search_result: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        search_params: Object.fromEntries(searchParams.entries())
      }
    };

    supabase.from('searches').insert(searchData).then(({ error: insertError }) => {
      if (insertError) {
        console.error('Error saving error search data:', insertError);
      }
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to select best description based on language priority: IT > EN > first available
function selectBestDescription(descrizioni: { [lingua: string]: string }): string {
  // Priorità 1: Italiano
  if (descrizioni['IT']) {
    return descrizioni['IT'];
  }
  
  // Priorità 2: Inglese
  if (descrizioni['EN']) {
    return descrizioni['EN'];
  }
  
  // Priorità 3: Prima lingua disponibile
  const lingueDisponibili = Object.keys(descrizioni);
  if (lingueDisponibili.length > 0) {
    return descrizioni[lingueDisponibili[0]];
  }
  
  // Fallback se non ci sono descrizioni
  return 'Manuale per ventilatore Ferrari';
}

// Helper functions to generate default names and descriptions
function getManualName(codiceManuale: string | null, nameFromDb: string | null = null): string {
  // Priorità 1: Nome dal database se presente
  if (nameFromDb && nameFromDb.trim()) {
    return nameFromDb.trim();
  }
  
  // Priorità 2: Mapping basato sul codice manuale
  if (codiceManuale) {
    const mapping: { [key: string]: string } = {
      'MVC_STD': 'Manuale Ventilatore Standard',
      'ROLLOUT': 'Manuale Installazione Rollout',
      'SWINGOUT': 'Manuale Installazione Swingout',
      'MAINTENANCE': 'Manuale Manutenzione',
      'TECHNICAL': 'Specifiche Tecniche'
    };
    
    if (mapping[codiceManuale]) {
      return mapping[codiceManuale];
    }
  }
  
  // Priorità 3: Fallback standard per tutti gli altri casi
  return 'Manuale Standard';
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
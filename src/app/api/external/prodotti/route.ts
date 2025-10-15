import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { TablesInsert } from '@/types/supabase';

// Middleware per verificare il token di autenticazione
function verifyAuthToken(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.substring(7);
  // Qui potresti implementare la verifica del token secondo la tua logica
  // Per ora uso un token semplice, ma dovresti usare JWT o altro sistema sicuro
  const validTokens = process.env.API_TOKENS?.split(',') || ['your-secret-token'];
  return validTokens.includes(token);
}

// GET - Lista prodotti con filtri opzionali
export async function GET(request: NextRequest) {
  // Verifica autenticazione
  if (!verifyAuthToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const serialNumber = searchParams.get('serial_number');
    const codiceManuale = searchParams.get('codice_manuale');
    const revisioneCode = searchParams.get('revisione_code');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    let query = supabase
      .from('prodotti')
      .select('*')
      .order('created_at', { ascending: false });

    // Applica filtri se forniti
    if (serialNumber) {
      query = query.ilike('serial_number', `%${serialNumber}%`);
    }
    
    if (codiceManuale) {
      query = query.ilike('codice_manuale', `%${codiceManuale}%`);
    }
    
    if (revisioneCode) {
      query = query.ilike('revisione_code', `%${revisioneCode}%`);
    }

    // Applica paginazione se fornita
    if (limit) {
      query = query.limit(parseInt(limit));
    }
    
    if (offset) {
      query = query.range(parseInt(offset), parseInt(offset) + (limit ? parseInt(limit) - 1 : 49));
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      data,
      count: data?.length || 0,
      filters: {
        serial_number: serialNumber,
        codice_manuale: codiceManuale,
        revisione_code: revisioneCode
      }
    });
  } catch (error) {
    console.error('External Prodotti GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Creazione bulk con controllo duplicati
export async function POST(request: NextRequest) {
  // Verifica autenticazione
  if (!verifyAuthToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const prodotti: TablesInsert<'prodotti'>[] = Array.isArray(body) ? body : [body];

    if (!prodotti || prodotti.length === 0) {
      return NextResponse.json(
        { error: 'No products provided' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < prodotti.length; i++) {
      const prodotto = prodotti[i];
      
      try {
        // Verifica che serial_number e codice_manuale siano forniti
        if (!prodotto.serial_number || !prodotto.codice_manuale) {
          errors.push({
            index: i,
            prodotto,
            error: 'serial_number and codice_manuale are required'
          });
          continue;
        }

        // Cerca il revisione_code più alto per questo codice_manuale nella tabella manuali (lingua IT)
        const { data: manuali, error: manualiError } = await supabase
          .from('manuali')
          .select('revisione_code')
          .eq('codice_manuale', prodotto.codice_manuale)
          .eq('lingua', 'IT')
          .not('revisione_code', 'is', null)
          .order('revisione_code', { ascending: false });

        if (manualiError) {
          errors.push({
            index: i,
            prodotto,
            error: `Error fetching manuali: ${manualiError.message}`
          });
          continue;
        }

        // Trova il revisione_code più alto
        let maxRevisioneCode = '000';
        if (manuali && manuali.length > 0) {
          // Ordina i revisione_code come numeri per trovare il più alto
          const revisioneCodes = manuali
            .map(m => m.revisione_code)
            .filter((code): code is string => code !== null && /^\d{3}$/.test(code)) // Solo codici nel formato 001, 002, ecc.
            .sort((a, b) => parseInt(b) - parseInt(a));
          
          if (revisioneCodes.length > 0) {
            maxRevisioneCode = revisioneCodes[0];
          }
        }

        // Assegna il revisione_code trovato al prodotto
        const prodottoConRevisione = {
          ...prodotto,
          revisione_code: maxRevisioneCode
        };

        // Verifica che il prodotto non esista già
        // Controlla per serial_number, codice_manuale e revisione_code uguali
        const { data: existing, error: checkError } = await supabase
          .from('prodotti')
          .select('id')
          .eq('serial_number', prodottoConRevisione.serial_number || '')
          .eq('codice_manuale', prodottoConRevisione.codice_manuale || '')
          .eq('revisione_code', prodottoConRevisione.revisione_code || '')
          .limit(1);

        if (checkError) {
          errors.push({
            index: i,
            prodotto,
            error: `Error checking duplicates: ${checkError.message}`
          });
          continue;
        }

        if (existing && existing.length > 0) {
          errors.push({
            index: i,
            prodotto,
            error: 'Product already exists with same serial_number, codice_manuale, and revisione_code',
            skipped: true
          });
          continue;
        }

        // Inserisci il prodotto se non esiste
        const { data: inserted, error: insertError } = await supabase
          .from('prodotti')
          .insert(prodottoConRevisione)
          .select()
          .single();

        if (insertError) {
          errors.push({
            index: i,
            prodotto,
            error: `Insert error: ${insertError.message}`
          });
          continue;
        }

        results.push({
          index: i,
          prodotto: inserted,
          status: 'created',
          assigned_revisione_code: maxRevisioneCode
        });

      } catch (itemError) {
        errors.push({
          index: i,
          prodotto,
          error: `Processing error: ${itemError instanceof Error ? itemError.message : 'Unknown error'}`
        });
      }
    }

    return NextResponse.json({
      success: results,
      errors,
      summary: {
        total: prodotti.length,
        created: results.length,
        errors: errors.length,
        skipped: errors.filter(e => e.skipped).length
      }
    });

  } catch (error) {
    console.error('External Prodotti POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
  const validTokens = process.env.API_TOKENS?.split(',') || ['your-secret-token'];
  return validTokens.includes(token);
}

// GET - Lista manuali con filtri opzionali
export async function GET(request: NextRequest) {
  // Verifica autenticazione
  if (!verifyAuthToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const codiceManuale = searchParams.get('codice_manuale');
    const lingua = searchParams.get('lingua');
    const revisioneCode = searchParams.get('revisione_code');
    const name = searchParams.get('name');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    let query = supabase
      .from('manuali')
      .select('*')
      .order('created_at', { ascending: false });

    // Applica filtri se forniti
    if (codiceManuale) {
      query = query.ilike('codice_manuale', `%${codiceManuale}%`);
    }
    
    if (lingua) {
      query = query.ilike('lingua', `%${lingua}%`);
    }
    
    if (revisioneCode) {
      query = query.ilike('revisione_code', `%${revisioneCode}%`);
    }
    
    if (name) {
      query = query.ilike('name', `%${name}%`);
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
        codice_manuale: codiceManuale,
        lingua: lingua,
        revisione_code: revisioneCode,
        name: name
      }
    });
  } catch (error) {
    console.error('External Manuali GET error:', error);
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
    const manuali: TablesInsert<'manuali'>[] = Array.isArray(body) ? body : [body];

    if (!manuali || manuali.length === 0) {
      return NextResponse.json(
        { error: 'No manuals provided' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < manuali.length; i++) {
      const manuale = manuali[i];
      
      try {
        // Verifica che il manuale non esista già
        // Controlla per codice_manuale, lingua e revisione_code uguali
        const { data: existing, error: checkError } = await supabase
          .from('manuali')
          .select('id')
          .eq('codice_manuale', manuale.codice_manuale || '')
          .eq('lingua', manuale.lingua || '')
          .eq('revisione_code', manuale.revisione_code || '')
          .limit(1);

        if (checkError) {
          errors.push({
            index: i,
            manuale,
            error: `Error checking duplicates: ${checkError.message}`
          });
          continue;
        }

        if (existing && existing.length > 0) {
          errors.push({
            index: i,
            manuale,
            error: 'Manual already exists with same codice_manuale, lingua, and revisione_code',
            skipped: true
          });
          continue;
        }

        // Inserisci il manuale se non esiste
        const { data: inserted, error: insertError } = await supabase
          .from('manuali')
          .insert(manuale)
          .select()
          .single();

        if (insertError) {
          errors.push({
            index: i,
            manuale,
            error: `Insert error: ${insertError.message}`
          });
          continue;
        }

        results.push({
          index: i,
          manuale: inserted,
          status: 'created'
        });

      } catch (itemError) {
        errors.push({
          index: i,
          manuale,
          error: `Processing error: ${itemError instanceof Error ? itemError.message : 'Unknown error'}`
        });
      }
    }

    return NextResponse.json({
      success: results,
      errors,
      summary: {
        total: manuali.length,
        created: results.length,
        errors: errors.length,
        skipped: errors.filter(e => e.skipped).length
      }
    });

  } catch (error) {
    console.error('External Manuali POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

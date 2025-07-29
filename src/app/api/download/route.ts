import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const codiceManuale = searchParams.get('codice_manuale');
  const lingua = searchParams.get('lingua');
  const serialNumber = searchParams.get('serial_number');

  try {
    if (!codiceManuale || !lingua || !serialNumber) {
      return NextResponse.json(
        { error: 'Codice manuale, lingua, and serial number are required' },
        { status: 400 }
      );
    }

    // Step 1: Verifica che il prodotto esista e ottieni le sue informazioni
    const { data: prodotti, error: prodottiError } = await supabase
      .from('prodotti')
      .select(`
        id,
        serial_number,
        codice_manuale,
        revisione_code
      `)
      .eq('serial_number', serialNumber)
      .eq('codice_manuale', codiceManuale);

    if (prodottiError) {
      return NextResponse.json({ error: prodottiError.message }, { status: 400 });
    }

    if (!prodotti || prodotti.length === 0) {
      // Salva tentativo di download fallito - prodotto non trovato
      const downloadData = {
        manuale_id: null,
        body: {
          request_timestamp: new Date().toISOString(),
          user_agent: request.headers.get('user-agent'),
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          download_result: 'product_not_found',
          serial_number: serialNumber,
          codice_manuale: codiceManuale,
          lingua: lingua,
          error_message: 'Product not found with specified serial number and manual code',
          request_params: Object.fromEntries(searchParams.entries())
        }
      };

      await supabase.from('download').insert(downloadData);

      return NextResponse.json(
        { error: 'Product not found with specified serial number and manual code' },
        { status: 404 }
      );
    }

    const prodotto = prodotti[0];

    // Step 2: Cerca il manuale specifico usando codice_manuale, revisione_code e lingua
    let manualeQuery = supabase
      .from('manuali')
      .select(`
        id,
        codice_manuale,
        lingua,
        revisione_code,
        file_url,
        descrizione
      `)
      .eq('codice_manuale', codiceManuale)
      .eq('lingua', lingua);

    // Se il prodotto ha un revisione_code, filtra anche per quello
    if (prodotto.revisione_code) {
      manualeQuery = manualeQuery.eq('revisione_code', prodotto.revisione_code);
    }

    const { data: manuali, error } = await manualeQuery.limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!manuali || manuali.length === 0) {
      // Salva tentativo di download fallito - manuale non trovato
      const downloadData = {
        manuale_id: null,
        body: {
          request_timestamp: new Date().toISOString(),
          user_agent: request.headers.get('user-agent'),
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          download_result: 'manual_not_found',
          serial_number: serialNumber,
          codice_manuale: codiceManuale,
          lingua: lingua,
          revisione_code: prodotto.revisione_code,
          error_message: 'Manual not found for the specified product, language and revision',
          product_data: prodotto,
          request_params: Object.fromEntries(searchParams.entries())
        }
      };

      await supabase.from('download').insert(downloadData);

      return NextResponse.json(
        { error: 'Manual not found for the specified product, language and revision' },
        { status: 404 }
      );
    }

    const manuale = manuali[0];

    if (!manuale.file_url) {
      // Salva tentativo di download fallito - file non disponibile
      const downloadData = {
        manuale_id: manuale.id,
        body: {
          request_timestamp: new Date().toISOString(),
          user_agent: request.headers.get('user-agent'),
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          download_result: 'file_not_available',
          serial_number: serialNumber,
          codice_manuale: codiceManuale,
          lingua: lingua,
          revisione_code: prodotto.revisione_code,
          error_message: 'File not available for this manual',
          product_data: prodotto,
          manual_data: manuale,
          request_params: Object.fromEntries(searchParams.entries())
        }
      };

      await supabase.from('download').insert(downloadData);

      return NextResponse.json(
        { error: 'File not available for this manual' },
        { status: 404 }
      );
    }

    // Log the successful download
    console.log(`Download requested: ${codiceManuale} - ${lingua} - ${serialNumber} - Rev: ${prodotto.revisione_code || 'N/A'}`);

    // Salva il download riuscito
    const downloadData = {
      manuale_id: manuale.id,
      body: {
        request_timestamp: new Date().toISOString(),
        user_agent: request.headers.get('user-agent'),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        download_result: 'success',
        serial_number: serialNumber,
        codice_manuale: codiceManuale,
        lingua: lingua,
        revisione_code: prodotto.revisione_code,
        file_url: manuale.file_url,
        file_name: `${codiceManuale}_${lingua}_${prodotto.revisione_code || 'Rev001'}.pdf`,
        product_data: prodotto,
        manual_data: {
          id: manuale.id,
          codice_manuale: manuale.codice_manuale,
          lingua: manuale.lingua,
          revisione_code: manuale.revisione_code,
          descrizione: manuale.descrizione
        },
        request_params: Object.fromEntries(searchParams.entries())
      }
    };

    // Salva in parallelo senza bloccare la risposta
    supabase.from('download').insert(downloadData).then(({ error: insertError }) => {
      if (insertError) {
        console.error('Error saving download data:', insertError);
      }
    });

    // Return the file URL for client-side download
    return NextResponse.json({
      downloadUrl: manuale.file_url,
      fileName: `${codiceManuale}_${lingua}_${prodotto.revisione_code || 'Rev001'}.pdf`,
      manuale: {
        codice_manuale: manuale.codice_manuale,
        lingua: manuale.lingua,
        revisione_code: manuale.revisione_code
      },
      prodotto: {
        serial_number: prodotto.serial_number,
        codice_manuale: prodotto.codice_manuale,
        revisione_code: prodotto.revisione_code
      }
    });

  } catch (error) {
    console.error('Download API error:', error);

    // Salva anche gli errori
    const downloadData = {
      manuale_id: null,
      body: {
        request_timestamp: new Date().toISOString(),
        user_agent: request.headers.get('user-agent'),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        download_result: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        serial_number: searchParams?.get('serial_number') || 'unknown',
        codice_manuale: searchParams?.get('codice_manuale') || 'unknown',
        lingua: searchParams?.get('lingua') || 'unknown',
        request_params: Object.fromEntries(searchParams.entries())
      }
    };

    supabase.from('download').insert(downloadData).then(({ error: insertError }) => {
      if (insertError) {
        console.error('Error saving error download data:', insertError);
      }
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
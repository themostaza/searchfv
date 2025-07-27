import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const codiceManuale = searchParams.get('codice_manuale');
    const lingua = searchParams.get('lingua');
    const serialNumber = searchParams.get('serial_number');

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
        file_url
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
      return NextResponse.json(
        { error: 'Manual not found for the specified product, language and revision' },
        { status: 404 }
      );
    }

    const manuale = manuali[0];

    if (!manuale.file_url) {
      return NextResponse.json(
        { error: 'File not available for this manual' },
        { status: 404 }
      );
    }

    // Log the download (optional - for analytics)
    console.log(`Download requested: ${codiceManuale} - ${lingua} - ${serialNumber} - Rev: ${prodotto.revisione_code || 'N/A'}`);

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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
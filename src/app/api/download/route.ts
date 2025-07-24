import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const codiceManuale = searchParams.get('codice_manuale');
    const lingua = searchParams.get('lingua');
    const serialNumber = searchParams.get('serial_number');

    if (!codiceManuale || !lingua) {
      return NextResponse.json(
        { error: 'Codice manuale and lingua are required' },
        { status: 400 }
      );
    }

    // Find the manual
    let query = supabase
      .from('manuali')
      .select(`
        id,
        codice_manuale,
        lingua,
        file_url,
        prodotto:prodotti(serial_number)
      `)
      .eq('codice_manuale', codiceManuale)
      .eq('lingua', lingua);

    // If serial number is provided, filter by product
    if (serialNumber) {
      const { data: prodotti } = await supabase
        .from('prodotti')
        .select('id')
        .ilike('serial_number', `%${serialNumber}%`);

      if (prodotti && prodotti.length > 0) {
        const prodottoIds = prodotti.map(p => p.id);
        query = query.in('prodotto_id', prodottoIds);
      }
    }

    const { data: manuali, error } = await query.limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!manuali || manuali.length === 0) {
      return NextResponse.json(
        { error: 'Manual not found' },
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
    console.log(`Download requested: ${codiceManuale} - ${lingua} - ${serialNumber || 'N/A'}`);

    // Return the file URL for client-side download
    // In a production environment, you might want to:
    // 1. Generate a temporary signed URL
    // 2. Track downloads in a separate table
    // 3. Implement rate limiting
    return NextResponse.json({
      downloadUrl: manuale.file_url,
      fileName: `${codiceManuale}_${lingua}.pdf`,
      manuale: {
        codice_manuale: manuale.codice_manuale,
        lingua: manuale.lingua
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
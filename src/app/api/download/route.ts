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

    // Find the manual by codice_manuale and lingua
    // If serial number is provided, we can use it to further filter the codice_manuale
    let codiceToSearch = codiceManuale;
    if (serialNumber) {
      // If a serial number is provided, search for manuals that contain it in their code
      codiceToSearch = serialNumber;
    }

    const { data: manuali, error } = await supabase
      .from('manuali')
      .select(`
        id,
        codice_manuale,
        lingua,
        file_url
      `)
      .eq('codice_manuale', codiceManuale)
      .eq('lingua', lingua)
      .limit(1);

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
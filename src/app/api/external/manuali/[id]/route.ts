import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

// GET - Singolo manuale per ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verifica autenticazione
  if (!verifyAuthToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Manual ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('manuali')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Manual not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('External Manuali [id] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

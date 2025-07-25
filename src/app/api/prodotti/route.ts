import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { TablesInsert } from '@/types/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serialNumber = searchParams.get('serial_number');

    let query = supabase
      .from('prodotti')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by serial number if provided
    if (serialNumber) {
      query = query.ilike('serial_number', `%${serialNumber}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: TablesInsert<'prodotti'> = await request.json();

    // Validate required fields
    if (!body.serial_number) {
      return NextResponse.json(
        { error: 'Serial number is required' },
        { status: 400 }
      );
    }

    // Check if serial number already exists
    const { data: existing } = await supabase
      .from('prodotti')
      .select('id')
      .eq('serial_number', body.serial_number)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Serial number already exists' },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('prodotti')
      .insert(body)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
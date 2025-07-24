import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { ProdottoUpdate } from '@/types/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from('prodotti')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: ProdottoUpdate = await request.json();

    // Check if product exists
    const { data: existing } = await supabase
      .from('prodotti')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if serial number conflicts with another product
          if (body.serial_number) {
        const { data: conflict } = await supabase
          .from('prodotti')
          .select('id')
          .eq('serial_number', body.serial_number)
          .neq('id', id)
          .single();

        if (conflict) {
          return NextResponse.json(
            { error: 'Serial number already exists' },
            { status: 409 }
          );
        }
      }

      const { data, error } = await supabase
        .from('prodotti')
        .update(body)
        .eq('id', id)
        .select()
        .single();

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Check if product has associated manuals
    const { data: manuali } = await supabase
      .from('manuali')
      .select('id')
      .eq('prodotto_id', id)
      .limit(1);

    if (manuali && manuali.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete product with associated manuals' },
        { status: 409 }
      );
    }

    // Check if product exists
    const { data: existing } = await supabase
      .from('prodotti')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('prodotti')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { generateFollowUpEmail } from '@/lib/agent/invoice-processor';
import { createServerClient } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { invoiceId } = await request.json();
    
    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = createServerClient();
    
    // Get invoice details
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();
    
    if (error || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    // Generate email content
    const emailContent = await generateFollowUpEmail(invoice);
    
    return NextResponse.json({
      success: true,
      emailContent
    });
  } catch (error) {
    console.error('Error generating reminder email:', error);
    return NextResponse.json(
      { error: 'Failed to generate reminder email' },
      { status: 500 }
    );
  }
}
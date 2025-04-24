import { NextRequest, NextResponse } from 'next/server';
import { extractInvoiceData, suggestCategory } from '@/lib/agent/invoice-processor';
import { createServerClient } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    
    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File and userId are required' },
        { status: 400 }
      );
    }
    
    // Read file content
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder().decode(buffer);
    
    // Process invoice with AI
    const extractedData = await extractInvoiceData(text);
    const suggestedCategory = await suggestCategory(`${extractedData.vendor} ${text.substring(0, 500)}`);
    
    // Save to Supabase
    const supabase = createServerClient();
    
    const { data, error } = await supabase.from('invoices').insert({
      user_id: userId,
      vendor: extractedData.vendor,
      invoice_number: extractedData.invoiceNumber,
      issue_date: extractedData.issueDate,
      due_date: extractedData.dueDate,
      amount: extractedData.amount,
      tax: extractedData.tax,
      currency: extractedData.currency,
      category: suggestedCategory,
      status: 'pending'
    }).select().single();
    
    if (error) {
      console.error('Error saving invoice:', error);
      return NextResponse.json({ error: 'Failed to save invoice' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      invoice: data,
      extractedData,
      suggestedCategory
    });
  } catch (error) {
    console.error('Error processing invoice:', error);
    return NextResponse.json(
      { error: 'Failed to process invoice' },
      { status: 500 }
    );
  }
}
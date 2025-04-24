import { NextRequest, NextResponse } from 'next/server';
import { detectAnomalies } from '@/lib/agent/invoice-processor';
import { createServerClient } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { userId, invoiceData } = await request.json();
    
    if (!userId || !invoiceData) {
      return NextResponse.json(
        { error: 'User ID and invoice data are required' },
        { status: 400 }
      );
    }
    
    // Detect anomalies
    const isAnomaly = await detectAnomalies(userId, invoiceData);
    
    return NextResponse.json({
      isAnomaly,
      message: isAnomaly 
        ? 'This invoice appears unusual compared to your history. Please review carefully.' 
        : 'No anomalies detected.'
    });
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    return NextResponse.json(
      { error: 'Failed to analyze invoice' },
      { status: 500 }
    );
  }
}
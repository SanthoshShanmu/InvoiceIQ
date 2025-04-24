import Stripe from 'stripe';
import { createServerClient } from '../supabase/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function processPayment(invoiceId: string) {
  const supabase = createServerClient();
  
  // Get invoice details
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();
  
  if (error || !invoice) {
    throw new Error('Invoice not found');
  }
  
  // Get user's payment method
  const { data: user } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', invoice.user_id)
    .single();
  
  if (!user) {
    throw new Error('User not found');
  }
  
  try {
    // Process payment
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(invoice.amount * 100), // Convert to cents
      currency: invoice.currency.toLowerCase(),
      description: `Payment for invoice #${invoice.invoice_number}`,
      metadata: {
        invoice_id: invoice.id,
        vendor: invoice.vendor
      }
    });
    
    // Record the payment attempt in the database
    await supabase
      .from('payment_records')
      .insert({
        invoice_id: invoice.id,
        amount: invoice.amount,
        payment_date: new Date().toISOString(),
        payment_method: 'stripe',
        stripe_payment_id: paymentIntent.id
      });
    
    // Update invoice status
    await supabase
      .from('invoices')
      .update({ status: 'processing' })
      .eq('id', invoice.id);
    
    return paymentIntent.client_secret;
  } catch (error) {
    console.error('Payment processing error:', error);
    throw error;
  }
}

export async function scheduleReminder(invoiceId: string, reminderDate: Date, message?: string) {
  const supabase = createServerClient();
  
  // Create reminder in database
  const { data, error } = await supabase
    .from('reminders')
    .insert({
      invoice_id: invoiceId,
      reminder_date: reminderDate.toISOString(),
      message: message || 'Payment reminder for your invoice'
    })
    .select()
    .single();
  
  if (error) {
    throw new Error('Failed to schedule reminder');
  }
  
  return data;
}

export async function generatePaymentReport(userId: string, startDate: Date, endDate: Date) {
  const supabase = createServerClient();
  
  // Get all invoices and payments within date range
  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      *,
      payment_records(*)
    `)
    .eq('user_id', userId)
    .gte('issue_date', startDate.toISOString().split('T')[0])
    .lte('issue_date', endDate.toISOString().split('T')[0]);
  
  if (!invoices) {
    return {
      total_invoiced: 0,
      total_paid: 0,
      total_outstanding: 0,
      invoices: []
    };
  }
  
  // Calculate totals
  let totalInvoiced = 0;
  let totalPaid = 0;
  
  invoices.forEach(invoice => {
    totalInvoiced += Number(invoice.amount);
    
    if (invoice.payment_records) {
      invoice.payment_records.forEach((payment: any) => {
        totalPaid += Number(payment.amount);
      });
    }
  });
  
  return {
    total_invoiced: totalInvoiced,
    total_paid: totalPaid,
    total_outstanding: totalInvoiced - totalPaid,
    invoices: invoices
  };
}
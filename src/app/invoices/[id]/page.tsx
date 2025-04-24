"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { processPayment, scheduleReminder } from '@/lib/stripe/payment-processor';
import { generateFollowUpEmail } from '@/lib/agent/invoice-processor';
import Link from 'next/link';

export default function InvoiceDetails() {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [emailContent, setEmailContent] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const invoiceId = Array.isArray(params?.id) ? params.id[0] : params?.id as string;

  useEffect(() => {
    async function fetchInvoiceDetails() {
      if (!invoiceId) return;

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }
      
      // Get invoice details
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('user_id', session.user.id)
        .single();
      
      if (invoiceError) {
        console.error('Error fetching invoice:', invoiceError);
        router.push('/invoices');
        return;
      }
      
      setInvoice(invoiceData);
      
      // Get payment records
      const { data: paymentData } = await supabase
        .from('payment_records')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('payment_date', { ascending: false });
      
      setPayments(paymentData || []);
      setLoading(false);
    }

    fetchInvoiceDetails();
  }, [invoiceId, router, supabase]);

  const handleMarkAsPaid = async () => {
    setPaymentLoading(true);
    setMessage(null);
    
    try {
      // Update invoice status
      await supabase
        .from('invoices')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', invoiceId);
      
      // Add payment record
      await supabase
        .from('payment_records')
        .insert({
          invoice_id: invoiceId,
          amount: invoice.amount,
          payment_date: new Date().toISOString(),
          payment_method: 'manual'
        });
      
      // Update local state
      setInvoice({ ...invoice, status: 'paid' });
      setMessage({ type: 'success', text: 'Invoice marked as paid' });
      
      // Refetch payment records
      const { data: paymentData } = await supabase
        .from('payment_records')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('payment_date', { ascending: false });
      
      setPayments(paymentData || []);
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      setMessage({ type: 'error', text: 'Failed to mark invoice as paid' });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleProcessPayment = async () => {
    setPaymentLoading(true);
    setMessage(null);
    
    try {
      await processPayment(invoiceId);
      setMessage({ type: 'success', text: 'Payment processing initiated' });
      
      // Update invoice status
      await supabase
        .from('invoices')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', invoiceId);
      
      // Update local state
      setInvoice({ ...invoice, status: 'processing' });
      
      // Refetch invoice and payment records
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();
      
      if (invoiceData) setInvoice(invoiceData);
      
      const { data: paymentData } = await supabase
        .from('payment_records')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('payment_date', { ascending: false });
      
      setPayments(paymentData || []);
    } catch (error) {
      console.error('Error processing payment:', error);
      setMessage({ type: 'error', text: 'Payment processing failed' });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleGenerateEmail = async () => {
    setReminderLoading(true);
    try {
      // Call API to generate email
      const response = await fetch('/api/agent/email-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceId }),
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Failed to generate email');
      
      setEmailContent(data.emailContent);
      setShowEmailModal(true);
    } catch (error) {
      console.error('Error generating email:', error);
      setMessage({ type: 'error', text: 'Failed to generate reminder email' });
    } finally {
      setReminderLoading(false);
    }
  };

  const handleScheduleReminder = async () => {
    setReminderLoading(true);
    try {
      // Set reminder date to 3 days from now
      const reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + 3);
      
      await scheduleReminder(
        invoiceId, 
        reminderDate, 
        `Payment reminder for invoice #${invoice.invoice_number} from ${invoice.vendor}`
      );
      
      setMessage({ type: 'success', text: 'Reminder scheduled successfully' });
    } catch (error) {
      console.error('Error scheduling reminder:', error);
      setMessage({ type: 'error', text: 'Failed to schedule reminder' });
    } finally {
      setReminderLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">Paid</span>;
      case 'pending':
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">Pending</span>;
      case 'processing':
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">Processing</span>;
      case 'overdue':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">Overdue</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500">Invoice not found.</p>
          <Link href="/invoices" className="mt-4 inline-block text-indigo-600">
            &larr; Back to Invoices
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/invoices" className="text-gray-600 hover:text-gray-900">
            &larr; Back to Invoices
          </Link>
          <h1 className="text-2xl font-bold">Invoice Details</h1>
          {getStatusBadge(invoice.status)}
        </div>
        
        <div className="flex gap-2">
          <Link 
            href={`/invoices/${invoice.id}/edit`} 
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
          >
            Edit
          </Link>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}
      
      <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Invoice Information</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Vendor:</span>
                  <span className="font-medium">{invoice.vendor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Invoice Number:</span>
                  <span className="font-medium">#{invoice.invoice_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Category:</span>
                  <span className="font-medium">{invoice.category || 'Uncategorized'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Issue Date:</span>
                  <span className="font-medium">{formatDate(invoice.issue_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Due Date:</span>
                  <span className="font-medium">{formatDate(invoice.due_date)}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold mb-4">Payment Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount:</span>
                  <span className="font-medium text-lg">{formatCurrency(invoice.amount, invoice.currency)}</span>
                </div>
                {invoice.tax && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tax:</span>
                    <span className="font-medium">{formatCurrency(invoice.tax, invoice.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Currency:</span>
                  <span className="font-medium">{invoice.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className="font-medium">{invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {invoice.notes && (
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold mb-2">Notes</h2>
            <p className="text-gray-700">{invoice.notes}</p>
          </div>
        )}
        
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Actions</h2>
          <div className="flex flex-wrap gap-3">
            {invoice.status !== 'paid' && (
              <>
                <button
                  onClick={handleMarkAsPaid}
                  disabled={paymentLoading}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-300"
                >
                  {paymentLoading ? 'Processing...' : 'Mark as Paid'}
                </button>
                <button
                  onClick={handleProcessPayment}
                  disabled={paymentLoading || invoice.status === 'processing'}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {paymentLoading ? 'Processing...' : 'Process Payment (Stripe)'}
                </button>
              </>
            )}
            {invoice.status !== 'paid' && (
              <>
                <button
                  onClick={handleGenerateEmail}
                  disabled={reminderLoading}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-300"
                >
                  {reminderLoading ? 'Generating...' : 'Generate Reminder Email'}
                </button>
                <button
                  onClick={handleScheduleReminder}
                  disabled={reminderLoading}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-300"
                >
                  {reminderLoading ? 'Scheduling...' : 'Schedule Reminder'}
                </button>
              </>
            )}
            
            <Link 
              href={`/invoices/${invoice.id}/upload`} 
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Upload to Accounting Software
            </Link>
          </div>
        </div>
      </div>
      
      {/* Payment History */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Payment History</h2>
        </div>
        
        {payments.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">No payment records found.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(payment.payment_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(payment.amount, invoice.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.payment_method.charAt(0).toUpperCase() + payment.payment_method.slice(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.stripe_payment_id || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Payment Reminder Email</h3>
              <button 
                onClick={() => setShowEmailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            <div className="border rounded-md p-4 bg-gray-50 mb-4 whitespace-pre-line">
              {emailContent}
            </div>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(emailContent);
                  alert('Email content copied to clipboard');
                }}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
              >
                Copy to Clipboard
              </button>
              <button 
                onClick={() => setShowEmailModal(false)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
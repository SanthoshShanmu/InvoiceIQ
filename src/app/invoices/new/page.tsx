"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { detectAnomalies } from '@/lib/agent/invoice-processor';

export default function NewInvoice() {
  const [vendor, setVendor] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [tax, setTax] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [parseStatus, setParseStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anomalyWarning, setAnomalyWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const router = useRouter();
  const supabase = createClient();
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setParseStatus('loading');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }
      
      // Create form data
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('userId', session.user.id);
      
      // Send to API for processing
      const response = await fetch('/api/agent/process-invoice', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process invoice');
      }
      
      // Update form with extracted data
      setVendor(data.extractedData.vendor || '');
      setInvoiceNumber(data.extractedData.invoiceNumber || '');
      setIssueDate(data.extractedData.issueDate || '');
      setDueDate(data.extractedData.dueDate || '');
      setAmount(data.extractedData.amount?.toString() || '');
      setTax(data.extractedData.tax?.toString() || '');
      setCurrency(data.extractedData.currency || 'USD');
      setCategory(data.suggestedCategory || '');
      
      setParseStatus('success');
      
      // Check for anomalies
      const anomalyResponse = await fetch('/api/agent/detect-anomaly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: session.user.id,
          invoiceData: data.extractedData
        }),
      });
      
      const anomalyData = await anomalyResponse.json();
      
      if (anomalyData.isAnomaly) {
        setAnomalyWarning(anomalyData.message);
      }
    } catch (err) {
      console.error('Error processing file:', err);
      setParseStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to process file');
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!vendor || !amount || !issueDate || !dueDate) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setUploading(true);
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }
      
      // Format the data
      const amountValue = parseFloat(amount);
      const taxValue = tax ? parseFloat(tax) : null;
      
      // Create invoice in the database
      const { data, error: insertError } = await supabase
        .from('invoices')
        .insert({
          user_id: session.user.id,
          vendor,
          invoice_number: invoiceNumber,
          issue_date: issueDate,
          due_date: dueDate,
          amount: amountValue,
          tax: taxValue,
          currency,
          category: category || null,
          notes: notes || null,
          status: 'pending'
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      // If there's a file, upload it
      if (file && data) {
        const filePath = `invoices/${session.user.id}/${data.id}/${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('invoice-documents')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        // Update invoice with file path
        await supabase
          .from('invoices')
          .update({ file_path: filePath })
          .eq('id', data.id);
      }
      
      router.push('/invoices');
    } catch (err) {
      console.error('Error saving invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to save invoice');
    } finally {
      setUploading(false);
    }
  };
  
  const categoryOptions = [
    'Office Supplies',
    'Software/SaaS',
    'Marketing',
    'Travel',
    'Utilities',
    'Professional Services',
    'Equipment',
    'Rent',
    'Insurance',
    'Taxes',
    'Shipping',
    'Other'
  ];
  
  const currencyOptions = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR'];

  return (
    <DashboardLayout>
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/invoices" className="text-gray-600 hover:text-gray-900">
            &larr; Back to Invoices
          </Link>
          <h1 className="text-2xl font-bold">Add New Invoice</h1>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
          <p>{error}</p>
        </div>
      )}
      
      {anomalyWarning && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md p-4">
          <p className="font-medium">⚠️ {anomalyWarning}</p>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Upload Invoice Document</h2>
          <div className="flex items-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.txt"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              disabled={parseStatus === 'loading'}
            >
              Select File
            </button>
            <span className="ml-4 text-sm text-gray-500">
              {file ? file.name : 'No file selected'}
            </span>
            
            {parseStatus === 'loading' && (
              <div className="ml-4 flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500 mr-2"></div>
                <span className="text-sm text-gray-600">Processing...</span>
              </div>
            )}
            
            {parseStatus === 'success' && (
              <div className="ml-4 text-sm text-green-600 flex items-center">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Data extracted successfully
              </div>
            )}
            
            {parseStatus === 'error' && (
              <div className="ml-4 text-sm text-red-600 flex items-center">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Failed to extract data
              </div>
            )}
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <h2 className="text-lg font-semibold mb-4">Invoice Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label 
                htmlFor="vendor" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Vendor *
              </label>
              <input
                id="vendor"
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>
            
            <div>
              <label 
                htmlFor="invoiceNumber" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Invoice Number
              </label>
              <input
                id="invoiceNumber"
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>
            
            <div>
              <label 
                htmlFor="issueDate" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Issue Date *
              </label>
              <input
                id="issueDate"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>
            
            <div>
              <label 
                htmlFor="dueDate" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Due Date *
              </label>
              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>
            
            <div>
              <label 
                htmlFor="amount" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Amount *
              </label>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>
            
            <div>
              <label 
                htmlFor="tax" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Tax
              </label>
              <input
                id="tax"
                type="number"
                step="0.01"
                min="0"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>
            
            <div>
              <label 
                htmlFor="currency" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              >
                {currencyOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label 
                htmlFor="category" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              >
                <option value="">Select a category</option>
                {categoryOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mt-6">
            <label 
              htmlFor="notes" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Notes
            </label>
            <textarea
              id="notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </div>
          
          <div className="mt-6 flex justify-end gap-3">
            <Link 
              href="/invoices" 
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={uploading}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-300"
            >
              {uploading ? 'Saving...' : 'Save Invoice'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
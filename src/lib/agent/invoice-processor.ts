import { OpenAI } from 'openai';
import { createServerClient } from '../supabase/client';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ExtractedInvoiceData {
  vendor: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  tax?: number;
  currency: string;
  category?: string;
}

export async function extractInvoiceData(fileContent: string): Promise<ExtractedInvoiceData> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are an AI assistant that extracts invoice data from text. Extract the following fields: vendor, invoice number, issue date, due date, amount, tax (if available), currency, and category."
      },
      {
        role: "user",
        content: `Extract the invoice data from the following content: ${fileContent}`
      }
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content as string);
}

export async function suggestCategory(description: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are an AI assistant that categorizes business expenses. Categories include: Office Supplies, Software/SaaS, Marketing, Travel, Utilities, Professional Services, Equipment, and Other."
      },
      {
        role: "user",
        content: `Categorize this invoice/expense: ${description}`
      }
    ]
  });

  return response.choices[0].message.content as string;
}

export async function generateFollowUpEmail(invoice: any): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are an AI assistant that drafts professional payment reminder emails. Be polite but firm."
      },
      {
        role: "user",
        content: `Draft a payment follow-up email for invoice #${invoice.invoice_number} from ${invoice.vendor} for ${invoice.amount} ${invoice.currency} due on ${invoice.due_date}.`
      }
    ]
  });

  return response.choices[0].message.content as string;
}

export async function detectAnomalies(userId: string, newInvoice: any): Promise<boolean> {
  const supabase = createServerClient();
  
  // Get user's invoice history
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userId);
    
  if (!invoices || invoices.length < 5) {
    return false; // Not enough history to detect anomalies
  }
  
  // Use OpenAI to analyze for anomalies
  const invoiceData = JSON.stringify({
    newInvoice,
    invoiceHistory: invoices.slice(-10) // Last 10 invoices
  });
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are an AI that detects financial anomalies in invoice data. Respond with 'true' if the new invoice appears unusual compared to history, or 'false' if it seems normal."
      },
      {
        role: "user",
        content: `Analyze this invoice data: ${invoiceData}`
      }
    ]
  });

  return !!response.choices[0].message.content?.toLowerCase().includes('true');
}
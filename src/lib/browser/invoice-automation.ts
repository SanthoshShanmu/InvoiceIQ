import { chromium, Page } from "playwright-core";
import { Hyperbrowser } from "@hyperbrowser/sdk";
import { createServerClient } from '../supabase/client';
import * as fs from 'fs';
import * as path from 'path';

// Type definitions
interface EmailCredentials {
  email: string;
  password: string;
}

interface AccountingCredentials {
  username?: string;
  email?: string;
  password: string;
}

interface InvoiceData {
  vendor: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  currency: string;
}

// Initialize the Hyperbrowser client
const hyperbrowser = new Hyperbrowser({
  apiKey: process.env.HYPERBROWSER_API_KEY,
});

// Ensure downloads directory exists
const downloadsDir = path.join(process.cwd(), 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

export async function downloadInvoicesFromEmail(userId: string, provider: string): Promise<string[]> {
  const supabase = createServerClient();
  const downloadedFiles: string[] = [];
  
  // Get user's account credentials
  const { data: connection } = await supabase
    .from('account_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();
  
  if (!connection) {
    throw new Error(`No ${provider} connection found`);
  }

  // Create a Hyperbrowser session
  const session = await hyperbrowser.sessions.create();
  
  try {
    // Connect with Playwright
    const browser = await chromium.connectOverCDP(session.wsEndpoint);
    const defaultContext = browser.contexts()[0];
    const page = await defaultContext.newPage();
    
    // Download invoices based on provider
    try {
      if (provider === 'gmail') {
        const files = await downloadFromGmail(page, connection.credentials);
        downloadedFiles.push(...files);
      } else if (provider === 'outlook') {
        const files = await downloadFromOutlook(page, connection.credentials);
        downloadedFiles.push(...files);
      } else {
        throw new Error(`Unsupported email provider: ${provider}`);
      }
    } catch (error) {
      console.error(`Error downloading from ${provider}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to download from ${provider}: ${errorMessage}`);
    }
    
    return downloadedFiles;
  } finally {
    // Always stop the session when done
    await hyperbrowser.sessions.stop(session.id);
  }
}

async function downloadFromGmail(page: Page, credentials: EmailCredentials): Promise<string[]> {
  const downloadedFiles: string[] = [];
  
  try {
    // Navigate to Gmail
    await page.goto('https://mail.google.com');
    
    // Login process
    await page.fill('input[type="email"]', credentials.email);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    await page.fill('input[type="password"]', credentials.password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    // Search for invoices
    await page.fill('input[aria-label="Search mail"]', 'has:attachment invoice OR receipt');
    await page.keyboard.press('Enter');
    await page.waitForSelector('div[role="main"]');
    
    // Download attachments from first 5 emails
    for (let i = 0; i < 5; i++) {
      const emailRows = await page.$$('tr[role="row"]');
      if (emailRows.length <= i) break;
      
      await emailRows[i].click();
      await page.waitForSelector('div[role="main"]');
      
      const attachments = await page.$$('div[role="listitem"] div[data-tooltip="Download"]');
      for (const attachment of attachments) {
        // Setup download listener
        const downloadPromise = page.waitForEvent('download');
        await attachment.click();
        const download = await downloadPromise;
        
        // Save the file to downloads directory
        const filename = download.suggestedFilename();
        const filePath = path.join(downloadsDir, filename);
        await download.saveAs(filePath);
        downloadedFiles.push(filePath);
      }
      
      await page.goBack();
      await page.waitForSelector('div[role="main"]');
    }
  } catch (error) {
    console.error('Error in Gmail automation:', error);
    throw error;
  }
  
  return downloadedFiles;
}

async function downloadFromOutlook(page: Page, credentials: EmailCredentials): Promise<string[]> {
  const downloadedFiles: string[] = [];
  
  try {
    await page.goto('https://outlook.office.com/mail/');
    
    // Login process
    await page.fill('input[type="email"]', credentials.email);
    await page.click('input[type="submit"]');
    await page.waitForNavigation();
    await page.fill('input[type="password"]', credentials.password);
    await page.click('input[type="submit"]');
    await page.waitForNavigation();
    
    // Search for invoices
    await page.fill('input[placeholder="Search"]', 'hasattachments:yes subject:invoice OR subject:receipt');
    await page.keyboard.press('Enter');
    await page.waitForSelector('div[role="list"]');
    
    // Download attachments from first 5 emails
    for (let i = 0; i < 5; i++) {
      const emailItems = await page.$$('div[role="listitem"]');
      if (emailItems.length <= i) break;
      
      await emailItems[i].click();
      await page.waitForSelector('div[role="main"]');
      
      const attachments = await page.$$('div[role="attachment"] button');
      for (const attachment of attachments) {
        // Setup download listener
        const downloadPromise = page.waitForEvent('download');
        await attachment.click();
        const download = await downloadPromise;
        
        // Save the file to downloads directory
        const filename = download.suggestedFilename();
        const filePath = path.join(downloadsDir, filename);
        await download.saveAs(filePath);
        downloadedFiles.push(filePath);
      }
      
      await page.goBack();
      await page.waitForSelector('div[role="list"]');
    }
  } catch (error) {
    console.error('Error in Outlook automation:', error);
    throw error;
  }
  
  return downloadedFiles;
}

export async function uploadToAccountingSoftware(userId: string, provider: string, invoiceFile: string, invoiceData: InvoiceData): Promise<boolean> {
  const supabase = createServerClient();
  
  // Get user's accounting software credentials
  const { data: connection } = await supabase
    .from('account_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();
  
  if (!connection) {
    throw new Error(`No ${provider} connection found`);
  }

  // Create a Hyperbrowser session
  const session = await hyperbrowser.sessions.create();
  
  try {
    // Connect with Playwright
    const browser = await chromium.connectOverCDP(session.wsEndpoint);
    const defaultContext = browser.contexts()[0];
    const page = await defaultContext.newPage();
    
    // Upload to accounting software
    try {
      if (provider === 'quickbooks') {
        await uploadToQuickbooks(page, connection.credentials, invoiceFile, invoiceData);
      } else if (provider === 'xero') {
        await uploadToXero(page, connection.credentials, invoiceFile, invoiceData);
      } else {
        throw new Error(`Unsupported accounting provider: ${provider}`);
      }
      
      return true;
    } catch (error) {
      console.error(`Error uploading to ${provider}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upload to ${provider}: ${errorMessage}`);
    }
  } finally {
    // Always stop the session when done
    await hyperbrowser.sessions.stop(session.id);
  }
}

async function uploadToQuickbooks(page: Page, credentials: AccountingCredentials, invoiceFile: string, invoiceData: InvoiceData): Promise<void> {
  try {
    // Navigate to QuickBooks
    await page.goto('https://qbo.intuit.com/app/login');
    
    // Login
    await page.fill('input#ius-userid', credentials.username || credentials.email || '');
    await page.fill('input#ius-password', credentials.password);
    await page.click('button#ius-sign-in-submit-btn');
    await page.waitForNavigation();
    
    // Navigate to expenses
    await page.goto('https://qbo.intuit.com/app/expenses');
    await page.click('button[data-testid="add-expense-btn"]');
    
    // Fill form
    await page.fill('input[data-testid="vendor-input"]', invoiceData.vendor);
    await page.fill('input[data-testid="amount-input"]', invoiceData.amount.toString());
    await page.fill('input[data-testid="date-input"]', invoiceData.issueDate);
    
    // Upload file - note that with Hyperbrowser, local files need special handling
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      // Read the file content as buffer
      if (fs.existsSync(invoiceFile)) {
        const fileBuffer = fs.readFileSync(invoiceFile);
        
        // Since Hyperbrowser is in the cloud, we need a different approach
        // Most likely we'd need to upload the file to a temporary storage accessible by Hyperbrowser
        // For now, this is a placeholder for how you might handle it
        
        // Option 1: If Hyperbrowser supports remote file upload
        // await hyperbrowser.files.upload(session.id, fileBuffer, path.basename(invoiceFile));
        
        // Option 2: Another approach could be to transfer the file as base64 and create it in the browser
        interface FileUploadContext {
          dataTransfer: DataTransfer;
          input: HTMLInputElement | null;
        }

        await page.evaluate(
          (arg: { fileDataBase64: string; fileName: string }): void => {
            const dataTransfer = new DataTransfer();
            const file = new File(
              [Uint8Array.from(atob(arg.fileDataBase64), (c: string) => c.charCodeAt(0))], 
              arg.fileName, 
              { type: 'application/octet-stream' }
            );
            dataTransfer.items.add(file);
            
            const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
            if (input) {
              Object.defineProperty(input, 'files', { value: dataTransfer.files });
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          },
          { fileDataBase64: fileBuffer.toString('base64'), fileName: path.basename(invoiceFile) }
        );
      } else {
        console.warn(`Invoice file not found: ${invoiceFile}`);
      }
    }
    
    await page.click('button[data-testid="expense-save-btn"]');
    await page.waitForNavigation();
  } catch (error) {
    console.error('Error in QuickBooks automation:', error);
    throw error;
  }
}

async function uploadToXero(page: Page, credentials: AccountingCredentials, invoiceFile: string, invoiceData: InvoiceData): Promise<void> {
  try {
    // Navigate to Xero
    await page.goto('https://login.xero.com/');
    
    // Login
    await page.fill('input[name="Username"]', credentials.email || credentials.username || '');
    await page.fill('input[name="Password"]', credentials.password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    // Navigate to bills
    await page.goto('https://go.xero.com/AccountsPayable/Edit.aspx?invoiceType=ACCPAY');
    
    // Fill form
    await page.fill('input#Contact_Name', invoiceData.vendor);
    await page.fill('input#InvoiceNumber', invoiceData.invoiceNumber);
    await page.fill('input#InvoiceDate', invoiceData.issueDate);
    await page.fill('input#DueDate', invoiceData.dueDate);
    await page.fill('input#TotalAmount', invoiceData.amount.toString());
    
    // Upload file - same considerations as in the QuickBooks function
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      // Similar file upload handling as in uploadToQuickbooks
      if (fs.existsSync(invoiceFile)) {
        const fileBuffer = fs.readFileSync(invoiceFile);
        
        // Similar approach as in uploadToQuickbooks
        await page.evaluate(
          (arg: { fileDataBase64: string; fileName: string }) => {
            const dataTransfer = new DataTransfer();
            const file = new File([Uint8Array.from(atob(arg.fileDataBase64), c => c.charCodeAt(0))], 
              arg.fileName, { type: 'application/octet-stream' });
            dataTransfer.items.add(file);
            
            const input = document.querySelector('input[type="file"]');
            if (input) {
              Object.defineProperty(input, 'files', { value: dataTransfer.files });
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          },
          { fileDataBase64: fileBuffer.toString('base64'), fileName: path.basename(invoiceFile) }
        );
      }
    }
    
    await page.click('input#save-button');
    await page.waitForNavigation();
  } catch (error) {
    console.error('Error in Xero automation:', error);
    throw error;
  }
}

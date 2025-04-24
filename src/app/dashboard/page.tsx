"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import InvoiceCard from '@/components/InvoiceCard';
import Stats from '@/components/Stats';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalPending: 0,
    totalPaid: 0,
    upcomingDue: 0
  });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      setUser(session.user);
      fetchInvoices(session.user.id);
    }

    getUser();
  }, [router, supabase]);

  async function fetchInvoices(userId: string) {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      
      setInvoices(data || []);
      
      // Calculate stats
      const pending = data?.filter(inv => inv.status === 'pending');
      const paid = data?.filter(inv => inv.status === 'paid');
      const upcoming = data?.filter(inv => {
        const dueDate = new Date(inv.due_date);
        const today = new Date();
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(today.getDate() + 7);
        
        return inv.status === 'pending' && 
               dueDate >= today && 
               dueDate <= sevenDaysFromNow;
      });
      
      setStats({
        totalPending: sumInvoices(pending || []),
        totalPaid: sumInvoices(paid || []),
        upcomingDue: upcoming?.length || 0
      });
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  }
  
  function sumInvoices(invoiceList: any[]) {
    return invoiceList.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link 
          href="/invoices/new" 
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Add New Invoice
        </Link>
      </div>
      
      <Stats
        pending={stats.totalPending}
        paid={stats.totalPaid}
        upcoming={stats.upcomingDue}
      />
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Recent Invoices</h2>
        
        {invoices.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">No invoices found. Add your first invoice to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {invoices.slice(0, 6).map(invoice => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))}
          </div>
        )}
        
        {invoices.length > 6 && (
          <div className="mt-4 text-center">
            <Link href="/invoices" className="text-indigo-600 hover:text-indigo-800">
              View all invoices →
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
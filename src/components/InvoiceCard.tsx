import Link from 'next/link';

interface InvoiceCardProps {
  invoice: {
    id: string;
    vendor: string;
    invoice_number: string;
    amount: number;
    currency: string;
    due_date: string;
    status: string;
  };
}

export default function InvoiceCard({ invoice }: InvoiceCardProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Link href={`/invoices/${invoice.id}`}>
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-5 border border-gray-200 cursor-pointer">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-medium text-gray-900">{invoice.vendor}</h3>
            <p className="text-sm text-gray-500">#{invoice.invoice_number}</p>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(invoice.status)}`}>
            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </span>
        </div>
        
        <div className="border-t border-gray-100 pt-4 mt-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Due Date</p>
              <p className="font-medium">{formatDate(invoice.due_date)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Amount</p>
              <p className="font-medium text-gray-900">{formatCurrency(invoice.amount, invoice.currency)}</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
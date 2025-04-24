import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center">
            <Image src="/logo.svg" alt="InvoiceIQ Logo" width={40} height={40} />
            <span className="ml-2 text-xl font-semibold text-gray-900">InvoiceIQ</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login" className="text-indigo-600 hover:text-indigo-800">
              Log in
            </Link>
            <Link 
              href="/signup" 
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white">
          <div className="container mx-auto px-4 py-24 flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-12 md:mb-0">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Automate Your Invoice Processing</h1>
              <p className="text-xl mb-8">
                Stop wasting hours on manual invoice handling. InvoiceIQ automates the entire process from receipt to reconciliation.
              </p>
              <Link 
                href="/signup" 
                className="bg-white text-indigo-600 px-6 py-3 rounded-md font-semibold hover:bg-gray-100"
              >
                Get Started Free
              </Link>
            </div>
            <div className="md:w-1/2 md:ml-8">
              <Image 
              src="/hero-image.svg" 
              alt="Invoice Automation" 
              width={600} 
              height={400} 
              className="rounded-lg shadow-xl"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-16">How InvoiceIQ Works</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="flex flex-col items-center text-center">
                <div className="bg-indigo-100 p-4 rounded-full mb-6">
                  <svg className="w-10 h-10 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2-1h8a1 1 0 011 1v12a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-4">Automatic Invoice Extraction</h3>
                <p className="text-gray-600">
                  Our AI automatically extracts key data from invoices including dates, amounts, and categories.
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center">
                <div className="bg-indigo-100 p-4 rounded-full mb-6">
                  <svg className="w-10 h-10 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-4">Automated Payments</h3>
                <p className="text-gray-600">
                  Set up automatic payments, schedule reminders, and keep track of all your financial transactions.
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center">
                <div className="bg-indigo-100 p-4 rounded-full mb-6">
                  <svg className="w-10 h-10 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a6 6 0 00-6 6c0 1.887.974 3.89 2.14 5.679a30.97 30.97 0 003.41 4.432c.2.23.515.23.714 0a30.97 30.97 0 003.41-4.432C15.026 11.89 16 9.887 16 8a6 6 0 00-6-6zm0 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-4">Accounting Integration</h3>
                <p className="text-gray-600">
                  Seamlessly connect with your accounting software to ensure all records are synchronized.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gray-100 py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to save hours each week?</h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of small businesses that have transformed their invoice processing with InvoiceIQ.
            </p>
            <Link 
              href="/signup" 
              className="bg-indigo-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-indigo-700"
            >
              Start Your Free Trial
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-gray-800 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">InvoiceIQ</h3>
              <p className="text-gray-400">
                Automating invoice processing for small businesses and freelancers.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><Link href="/features" className="text-gray-400 hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="text-gray-400 hover:text-white">Pricing</Link></li>
                <li><Link href="/integrations" className="text-gray-400 hover:text-white">Integrations</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><Link href="/blog" className="text-gray-400 hover:text-white">Blog</Link></li>
                <li><Link href="/help" className="text-gray-400 hover:text-white">Help Center</Link></li>
                <li><Link href="/contact" className="text-gray-400 hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-gray-400 hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-gray-400 hover:text-white">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-12 pt-8 text-center text-gray-400">
            <p>© {new Date().getFullYear()} InvoiceIQ. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
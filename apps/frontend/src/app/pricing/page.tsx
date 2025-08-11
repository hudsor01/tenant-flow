export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-600">
            Choose the plan that works for you
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Free Plan */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-2">Free Trial</h3>
            <p className="text-3xl font-bold mb-4">$0<span className="text-sm text-gray-500">/month</span></p>
            <ul className="space-y-2 mb-6">
              <li>✓ Up to 5 properties</li>
              <li>✓ Basic tenant management</li>
              <li>✓ 14-day free trial</li>
            </ul>
            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
              Start Free Trial
            </button>
          </div>

          {/* Starter Plan */}
          <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-blue-500">
            <div className="text-center mb-2">
              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">Recommended</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Starter</h3>
            <p className="text-3xl font-bold mb-4">$29<span className="text-sm text-gray-500">/month</span></p>
            <ul className="space-y-2 mb-6">
              <li>✓ Up to 25 properties</li>
              <li>✓ Full tenant management</li>
              <li>✓ Basic reporting</li>
              <li>✓ Email support</li>
            </ul>
            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
              Get Started
            </button>
          </div>

          {/* Growth Plan */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-2">Growth</h3>
            <p className="text-3xl font-bold mb-4">$79<span className="text-sm text-gray-500">/month</span></p>
            <ul className="space-y-2 mb-6">
              <li>✓ Up to 100 properties</li>
              <li>✓ Advanced reporting</li>
              <li>✓ Priority support</li>
              <li>✓ API access</li>
            </ul>
            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
'use client'

// TEMPORARY DEMO PAGE - REMOVE BEFORE PRODUCTION
// Simple test page for dashboard features

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Dashboard Features Demo
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Theme System</h2>
            <button className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700">
              Theme Toggle
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Command Palette</h2>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                placeholder="Press ⌘K to search..."
                className="border border-gray-300 px-3 py-2 rounded flex-1"
                readOnly
              />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Dense Data Tables</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Property</th>
                  <th className="text-left py-2">Units</th>
                  <th className="text-left py-2">Rent</th>
                </tr>
              </thead>
              <tbody>
                <tr className="h-8 border-b text-xs">
                  <td>Sunset Apartments</td>
                  <td>24</td>
                  <td>$2,400</td>
                </tr>
                <tr className="h-8 border-b text-xs">
                  <td>Downtown Loft</td>
                  <td>12</td>
                  <td>$3,200</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Mobile Navigation</h2>
            <div className="bg-gray-100 p-4 rounded">
              <p className="text-sm text-gray-600">Resize browser to &lt;768px to see mobile nav</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Sparkline Charts</h2>
            <div className="flex items-end gap-1 h-10">
              <div className="bg-primary h-6 w-2 rounded-sm"></div>
              <div className="bg-primary h-8 w-2 rounded-sm"></div>
              <div className="bg-primary h-4 w-2 rounded-sm"></div>
              <div className="bg-primary h-10 w-2 rounded-sm"></div>
              <div className="bg-primary h-7 w-2 rounded-sm"></div>
              <div className="bg-primary h-9 w-2 rounded-sm"></div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Performance</h2>
            <div className="text-sm text-gray-600">
              <p>✅ Theme switching</p>
              <p>✅ Command palette (⌘K)</p>
              <p>✅ Responsive design</p>
              <p>✅ Fast rendering</p>
            </div>
          </div>
        </div>
        
        {/* Mobile nav simulation for testing */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2">
          <div className="flex justify-around items-center">
            <button className="p-2 text-gray-600">Home</button>
            <button className="p-2 text-gray-600">Properties</button>
            <button className="p-2 bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center">
              +
            </button>
            <button className="p-2 text-gray-600">Reports</button>
            <button className="p-2 text-gray-600">Profile</button>
          </div>
        </div>
      </div>
    </div>
  )
}
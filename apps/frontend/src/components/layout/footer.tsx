import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-white py-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-center items-center gap-8 text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-2.5 h-2.5 text-white"
              >
                <path
                  d="M3 21L21 21M5 21V7L12 3L19 7V21M9 12H15M9 16H15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="font-medium text-gray-700">TenantFlow</span>
          </div>

          <Link href="/pricing" className="hover:text-gray-700 transition-colors">
            Pricing
          </Link>
          <Link href="/faq" className="hover:text-gray-700 transition-colors">
            FAQ
          </Link>
          <Link href="/contact" className="hover:text-gray-700 transition-colors">
            Contact
          </Link>

          <span>© 2024 TenantFlow. All rights reserved.</span>
        </div>
      </div>
    </footer>
  )
}
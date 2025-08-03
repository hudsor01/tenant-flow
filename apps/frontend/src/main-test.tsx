import React from 'react'
import ReactDOM from 'react-dom/client'

console.log('Test: main-test.tsx loading')

const rootElement = document.getElementById('root')

if (!rootElement) {
  console.error('No root element found')
} else {
  console.log('Root element found, rendering React')
  
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <div style={{ padding: '50px', background: 'white', minHeight: '100vh' }}>
        <h1>React is Working!</h1>
        <p>If you see this, React is rendering correctly.</p>
        <p>The issue is with the router or other components.</p>
      </div>
    </React.StrictMode>
  )
}
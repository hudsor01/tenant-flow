export default function MinimalPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui'
    }}>
      <div style={{
        padding: '2rem',
        border: '1px solid #ccc',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <h1>Minimal Test</h1>
        <p>Testing without TypeScript or complex setup</p>
        <p style={{color: 'green'}}>✓ Basic Next.js page working</p>
      </div>
    </div>
  )
}
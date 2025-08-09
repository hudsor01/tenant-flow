import { ImageResponse } from 'next/og'

// Image metadata
export const alt = 'TenantFlow - Property Management Platform'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

// Image generation
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 64,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: 40,
        }}
      >
        {/* Logo/Brand */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 'bold',
            marginBottom: 20,
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '20px 40px',
            borderRadius: 20,
          }}
        >
          TenantFlow
        </div>
        
        {/* Main heading */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 'bold',
            marginBottom: 30,
            lineHeight: 1.2,
            maxWidth: 900,
          }}
        >
          Property Management Made Simple
        </div>
        
        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            opacity: 0.9,
            maxWidth: 800,
            lineHeight: 1.3,
          }}
        >
          Save 10+ hours per week with the all-in-one platform trusted by 10,000+ property managers
        </div>
        
        {/* Feature badges */}
        <div
          style={{
            display: 'flex',
            gap: 20,
            marginTop: 40,
            fontSize: 18,
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '10px 20px',
              borderRadius: 25,
            }}
          >
            📊 Analytics
          </div>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '10px 20px',
              borderRadius: 25,
            }}
          >
            💰 Rent Collection
          </div>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '10px 20px',
              borderRadius: 25,
            }}
          >
            🔧 Maintenance
          </div>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '10px 20px',
              borderRadius: 25,
            }}
          >
            👥 Tenant Portal
          </div>
        </div>
        
        {/* Bottom branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            right: 30,
            fontSize: 16,
            opacity: 0.8,
          }}
        >
          tenantflow.app
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
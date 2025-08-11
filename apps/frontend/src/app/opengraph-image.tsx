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
          fontSize: 48,
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: 60,
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontSize: 36,
            fontWeight: 'bold',
            marginBottom: 40,
            opacity: 0.9,
          }}
        >
          TenantFlow
        </div>
        
        {/* Main heading */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 'bold',
            marginBottom: 30,
            lineHeight: 1.1,
          }}
        >
          Pricing Plans
        </div>
        
        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            opacity: 0.9,
            marginBottom: 50,
            maxWidth: 700,
            lineHeight: 1.3,
          }}
        >
          Choose the perfect plan for your property management needs
        </div>
        
        {/* Pricing highlights */}
        <div
          style={{
            display: 'flex',
            gap: 40,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '30px 25px',
              borderRadius: 20,
              minWidth: 200,
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 5 }}>Basic</div>
            <div style={{ fontSize: 36, fontWeight: 'bold', color: '#fbbf24' }}>$29</div>
            <div style={{ fontSize: 16, opacity: 0.8 }}>per month</div>
          </div>
          
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '30px 25px',
              borderRadius: 20,
              minWidth: 200,
              border: '2px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 5 }}>Professional</div>
            <div style={{ fontSize: 36, fontWeight: 'bold', color: '#34d399' }}>$79</div>
            <div style={{ fontSize: 16, opacity: 0.8 }}>per month</div>
          </div>
          
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '30px 25px',
              borderRadius: 20,
              minWidth: 200,
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 5 }}>Enterprise</div>
            <div style={{ fontSize: 36, fontWeight: 'bold', color: '#8b5cf6' }}>$199</div>
            <div style={{ fontSize: 16, opacity: 0.8 }}>per month</div>
          </div>
        </div>
        
        {/* Free trial badge */}
        <div
          style={{
            background: 'rgba(34, 197, 94, 0.9)',
            color: 'white',
            padding: '12px 30px',
            borderRadius: 25,
            fontSize: 20,
            fontWeight: 'bold',
          }}
        >
          14-Day Free Trial • No Credit Card Required
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
          tenantflow.app/pricing
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
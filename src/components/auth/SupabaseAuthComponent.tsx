import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabase'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import { EnhancedAuthLayout } from './EnhancedAuthLayout'

interface SupabaseAuthComponentProps {
  view?: 'sign_in' | 'sign_up'
  redirectTo?: string
}

export default function SupabaseAuthComponent({ 
  view = 'sign_in', 
  redirectTo = '/dashboard' 
}: SupabaseAuthComponentProps) {
  const navigate = useNavigate()
  const { checkSession } = useAuthStore()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        toast.success('Successfully signed in!')
        
        // Wait a moment for the session to be established
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Check session to load user profile
        await checkSession()
        
        // Navigate to dashboard
        navigate(redirectTo)
      }
      
      if (event === 'SIGNED_UP' && session) {
        toast.success('Account created successfully!')
        // For signup, we might want to redirect to a welcome page or onboarding
        navigate('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate, redirectTo, checkSession])

  const authContent = (
    <div className="w-full max-w-md mx-auto">
      <Auth
        supabaseClient={supabase}
        view={view}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: '#10b981',
                brandAccent: '#059669',
                brandButtonText: 'white',
                defaultButtonBackground: '#f3f4f6',
                defaultButtonBackgroundHover: '#e5e7eb',
                defaultButtonBorder: '#d1d5db',
                defaultButtonText: '#374151',
                dividerBackground: '#e5e7eb',
                inputBackground: 'white',
                inputBorder: '#d1d5db',
                inputBorderHover: '#9ca3af',
                inputBorderFocus: '#10b981',
                inputText: '#1f2937',
                inputLabelText: '#374151',
                inputPlaceholder: '#9ca3af',
                messageText: '#ef4444',
                messageTextDanger: '#ef4444',
                anchorTextColor: '#10b981',
                anchorTextHoverColor: '#059669',
              },
              space: {
                spaceSmall: '4px',
                spaceMedium: '8px',
                spaceLarge: '16px',
                labelBottomMargin: '8px',
                anchorBottomMargin: '4px',
                emailInputSpacing: '4px',
                socialAuthSpacing: '4px',
                buttonPadding: '10px 15px',
                inputPadding: '10px 15px',
              },
              fontSizes: {
                baseBodySize: '14px',
                baseInputSize: '14px',
                baseLabelSize: '14px',
                baseButtonSize: '14px',
              },
              fonts: {
                bodyFontFamily: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`,
                buttonFontFamily: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`,
                inputFontFamily: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`,
                labelFontFamily: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`,
              },
              borderWidths: {
                buttonBorderWidth: '1px',
                inputBorderWidth: '1px',
              },
              radii: {
                borderRadiusButton: '8px',
                buttonBorderRadius: '8px',
                inputBorderRadius: '8px',
              },
            },
          },
          className: {
            anchor: 'text-green-600 hover:text-green-700 font-medium',
            button: 'bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200',
            container: 'space-y-4',
            divider: 'text-gray-400 text-sm',
            input: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500',
            label: 'block text-sm font-medium text-gray-700 mb-1',
            loader: 'border-green-600',
            message: 'text-red-600 text-sm mt-1',
          },
        }}
        theme="default"
        providers={['google']}
        redirectTo={`${window.location.origin}/auth/callback?next=${redirectTo}`}
        onlyThirdPartyProviders={false}
        magicLink={false}
        showLinks={true}
        localization={{
          variables: {
            sign_in: {
              email_label: 'Email address',
              password_label: 'Password',
              email_input_placeholder: 'you@example.com',
              password_input_placeholder: 'Your password',
              button_label: 'Sign in',
              loading_button_label: 'Signing in...',
              social_provider_text: 'Continue with {{provider}}',
              link_text: "Don't have an account? Sign up",
              confirmation_text: 'Check your email for the confirmation link',
            },
            sign_up: {
              email_label: 'Email address',
              password_label: 'Create password',
              email_input_placeholder: 'you@example.com',
              password_input_placeholder: 'Create a password',
              button_label: 'Create account',
              loading_button_label: 'Creating account...',
              social_provider_text: 'Continue with {{provider}}',
              link_text: 'Already have an account? Sign in',
              confirmation_text: 'Check your email for the confirmation link',
            },
          },
        }}
      />
    </div>
  )

  // Use different layouts for login vs signup
  if (view === 'sign_up') {
    return (
      <EnhancedAuthLayout
        side="right"
        title="Start your journey"
        subtitle="Create your account and join thousands of property owners who trust TenantFlow."
        image={{
          src: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
          alt: "Beautiful modern home with contemporary design"
        }}
        heroContent={{
          title: "Start Your Journey",
          description: "Join thousands of property owners who trust TenantFlow to manage their rentals efficiently. Get started with our 14-day free trial."
        }}
      >
        {authContent}
      </EnhancedAuthLayout>
    )
  }

  return (
    <EnhancedAuthLayout
      side="left"
      title="Welcome back"
      subtitle="Sign in to your account to continue managing your properties."
      image={{
        src: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
        alt: "Modern property management dashboard"
      }}
      heroContent={{
        title: "Manage Properties with Ease",
        description: "Streamline your property management workflow with our comprehensive platform. Track tenants, manage leases, and handle maintenance all in one place."
      }}
    >
      {authContent}
    </EnhancedAuthLayout>
  )
}
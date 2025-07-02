# TenantFlow Email Templates

Beautiful, responsive email templates for Supabase Auth that match your TenantFlow design system.

## 📧 Available Templates

### 1. **Invite User** (`invite-user.html`)
Perfect for tenant invitations with property management focus.

**Available Variables:**
- `{{ .ConfirmationURL }}` - The invitation acceptance link
- `{{ .Token }}` - Raw token (optional)
- `{{ .TokenHash }}` - Hashed token (optional)  
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - Inviter's email (landlord/property manager)
- `{{ .Data }}` - Custom data object
- `{{ .RedirectTo }}` - Post-confirmation redirect URL

**Design Features:**
- 🏠 Property management focused
- 💰 Benefits highlighting (rent payments, maintenance, docs)
- 🎨 Green gradient matching TenantFlow brand
- 📱 Mobile responsive
- 🔒 Security notices

---

### 2. **Confirm Signup** (`confirm-signup.html`)
Professional account confirmation for new property managers/owners.

**Available Variables:**
- `{{ .ConfirmationURL }}` - Account confirmation link
- `{{ .TokenHash }}` - Hashed token
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - User's email address
- `{{ .Data }}` - Custom data object
- `{{ .RedirectTo }}` - Post-confirmation redirect

**Design Features:**
- 🎯 Step-by-step onboarding guide
- 💙 Blue gradient for trust and professionalism
- ✅ Clear confirmation CTA
- 🛡️ Security assurance messaging

---

### 3. **Reset Password** (`reset-password.html`)
Secure password reset with clear security messaging.

**Available Variables:**
- `{{ .ConfirmationURL }}` - Password reset link
- `{{ .Token }}` - Raw token
- `{{ .TokenHash }}` - Hashed token
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - User's email address
- `{{ .Data }}` - Custom data object
- `{{ .RedirectTo }}` - Post-reset redirect

**Design Features:**
- 🔑 Security-focused red gradient
- ⚡ Quick reset process explanation
- ⚠️ Clear security warnings
- 🔓 Strong visual hierarchy

---

### 4. **Change Email** (`change-email.html`)
Email address update confirmation with before/after display.

**Available Variables:**
- `{{ .ConfirmationURL }}` - Email change confirmation link
- `{{ .Token }}` - Raw token
- `{{ .TokenHash }}` - Hashed token
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - Current email address
- `{{ .NewEmail }}` - New email address
- `{{ .Data }}` - Custom data object
- `{{ .RedirectTo }}` - Post-confirmation redirect

**Design Features:**
- 📧 Purple gradient for change/update theme
- 🔄 Before/after email display
- 📱 Update process explanation
- 🔐 Security protection messaging

---

### 5. **Reauthentication** (`reauthentication.html`)
Security verification for sensitive operations.

**Available Variables:**
- `{{ .Token }}` - Verification token
- `{{ .SiteURL }}` - Your site URL  
- `{{ .Email }}` - User's email address
- `{{ .Data }}` - Custom data object

**Design Features:**
- 🛡️ Orange gradient for security alerts
- 💡 "Why am I seeing this?" explanation
- ⚠️ Prominent security warnings
- 🔍 Identity verification focus

## 🎨 Design System

All templates use your TenantFlow design system:

- **Typography**: -apple-system font stack for native feel
- **Colors**: Tailwind CSS color palette with gradients
- **Spacing**: Consistent 32px, 24px, 16px spacing scale
- **Borders**: 12px border radius for modern feel
- **Shadows**: Subtle shadows for depth
- **Mobile**: Responsive design with mobile-first approach

## 🚀 Implementation in Supabase

1. **Go to Supabase Dashboard** → Authentication → Email Templates
2. **Select the template type** you want to customize
3. **Copy the HTML content** from the appropriate file
4. **Paste into Supabase** template editor
5. **Test with preview** function
6. **Save and activate**

## 🎯 Template Variables Guide

Each template automatically receives these variables from Supabase Auth:

- **ConfirmationURL**: The main action link (most important)
- **Email**: User's email or inviter's email  
- **Token/TokenHash**: Security tokens (usually not displayed)
- **SiteURL**: Your application's base URL
- **Data**: Custom data you can pass
- **RedirectTo**: Where to send users after action

## 📱 Mobile Optimization

All templates include:
- Viewport meta tag for proper mobile scaling
- Responsive container (max-width: 600px)
- Mobile-friendly button sizes (min 44px touch targets)
- Readable font sizes (16px+ on mobile)
- Proper email client compatibility

## 🔧 Customization Tips

1. **Brand Colors**: Update gradient colors to match your exact brand
2. **Logo**: Replace emoji with your actual logo image
3. **Copy**: Customize text to match your voice and tone
4. **CTAs**: Adjust button text for your specific use case
5. **Footer**: Add your company address and contact info

## ✨ Pro Tips

- **Test across email clients** (Gmail, Outlook, Apple Mail)
- **Keep templates under 100KB** for deliverability
- **Use alt text** for images (accessibility)
- **Test dark mode** appearance where possible
- **Include plain text versions** for maximum compatibility

---

These templates provide a professional, branded email experience that matches your TenantFlow application perfectly! 🏠✨
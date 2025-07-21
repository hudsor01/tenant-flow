# Stripe Components with Custom Styling

This directory contains fully styled Stripe components that match TenantFlow's modern masculine design system.

## 🎨 Design Philosophy

Our Stripe integration follows these design principles:
- **Modern & Minimalist**: Clean interfaces with generous whitespace
- **Masculine Color Palette**: Steel blue, slate gray, and deep teal accents
- **High Contrast**: Ensuring accessibility and readability
- **Consistent Styling**: Seamless integration with the rest of the application

## 📦 Components

### StripeProvider
Initializes Stripe with our custom appearance configuration.

```tsx
import { StripeProvider } from '@/components/stripe'

<StripeProvider darkMode={isDarkMode}>
  {/* Your payment components */}
</StripeProvider>
```

### StyledPaymentElement
A fully styled Payment Element supporting 40+ payment methods.

```tsx
import { StyledPaymentElement } from '@/components/stripe'

<StyledPaymentElement 
  clientSecret={clientSecret}
  layout="tabs" // or "accordion", "accordion-radios"
  onSuccess={() => router.push('/success')}
/>
```

### StyledExpressCheckout
One-click payment buttons (Apple Pay, Google Pay, Link, PayPal).

```tsx
import { StyledExpressCheckout } from '@/components/stripe'

<StyledExpressCheckout 
  height={50}
  showWallets={true}
  onSuccess={() => router.push('/success')}
/>
```

### StyledCheckoutForm
Complete checkout experience with address collection and order summary.

```tsx
import { StyledCheckoutForm } from '@/components/stripe'

<StyledCheckoutForm 
  amount={2999} // in cents
  productName="Pro Plan"
  currency="usd"
  onSuccess={() => router.push('/success')}
/>
```

## 🎨 Customization

### Appearance Configuration

The appearance is defined in `/config/stripe-appearance.ts`:

```typescript
const colors = {
  primary: 'oklch(0.45 0.16 235)',      // Steel blue
  secondary: 'oklch(0.35 0.05 240)',    // Slate gray
  accent: 'oklch(0.40 0.12 200)',       // Deep teal
  // ... more colors
}
```

### Customizing Individual Components

You can override specific styles using the `rules` object:

```typescript
rules: {
  '.Input': {
    borderRadius: '8px',
    padding: '12px 16px',
    // ... more styles
  }
}
```

### Dark Mode

Dark mode is automatically supported:

```tsx
<StripeProvider darkMode={true}>
  {/* Components will use dark theme */}
</StripeProvider>
```

## 🚀 Usage Examples

### Basic Payment Form

```tsx
import { StripeProvider, StyledPaymentElement } from '@/components/stripe'

function PaymentPage() {
  const [clientSecret, setClientSecret] = useState('')

  useEffect(() => {
    // Create PaymentIntent on your backend
    fetch('/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ amount: 2999 })
    })
      .then(res => res.json())
      .then(data => setClientSecret(data.clientSecret))
  }, [])

  if (!clientSecret) return <div>Loading...</div>

  return (
    <StripeProvider>
      <StyledPaymentElement 
        clientSecret={clientSecret}
        onSuccess={() => console.log('Payment successful!')}
      />
    </StripeProvider>
  )
}
```

### Full Checkout Experience

```tsx
import { StripeProvider, StyledCheckoutForm } from '@/components/stripe'

function CheckoutPage() {
  return (
    <StripeProvider>
      <StyledCheckoutForm 
        amount={9999}
        productName="Enterprise Plan"
        onSuccess={() => {
          // Handle successful payment
          router.push('/dashboard')
        }}
      />
    </StripeProvider>
  )
}
```

### Express Checkout Only

```tsx
import { StripeProvider, StyledExpressCheckout } from '@/components/stripe'

function QuickCheckout() {
  return (
    <StripeProvider>
      <div className="max-w-md mx-auto">
        <h2>Quick Checkout</h2>
        <StyledExpressCheckout 
          onSuccess={() => console.log('Express payment complete!')}
        />
      </div>
    </StripeProvider>
  )
}
```

## 🔧 Advanced Configuration

### Custom Layout Options

```tsx
// Tabs layout (default)
<StyledPaymentElement layout="tabs" />

// Accordion layout
<StyledPaymentElement layout="accordion" />

// Accordion with radio buttons
<StyledPaymentElement layout="accordion-radios" />
```

### Payment Method Ordering

The payment methods are ordered by relevance, but you can customize this in the component:

```tsx
paymentMethodOrder: [
  'card',
  'apple_pay',
  'google_pay',
  'link',
  'paypal',
  // ... more methods
]
```

### Billing Details Collection

Control which fields are collected:

```tsx
fields: {
  billingDetails: {
    name: 'auto',
    email: 'auto',
    phone: 'never',
    address: {
      country: 'auto',
      postalCode: 'auto'
    }
  }
}
```

## 🎯 Best Practices

1. **Always use StripeProvider** - Wrap your payment components with StripeProvider to ensure consistent styling.

2. **Handle errors gracefully** - All components include error handling, but customize messages for your use case.

3. **Test payment methods** - Use Stripe test cards to verify all payment methods work correctly.

4. **Mobile optimization** - Components are responsive by default, but test on various devices.

5. **Accessibility** - Our styling ensures high contrast and proper focus states for accessibility.

## 📚 Resources

- [Stripe Elements Docs](https://stripe.com/docs/elements)
- [Appearance API Reference](https://stripe.com/docs/elements/appearance-api)
- [Payment Element Guide](https://stripe.com/docs/payments/payment-element)
- [Express Checkout Element](https://stripe.com/docs/elements/express-checkout-element)
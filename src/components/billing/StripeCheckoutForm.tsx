import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { STRIPE_CONFIG } from '@/lib/stripe-config';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
  ExpressCheckoutElement,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { parseStripeError } from '@/lib/stripe-error-handler';
import { logger } from '@/lib/logger';

// Initialize Stripe
const stripePromise = loadStripe(STRIPE_CONFIG.publishableKey);

interface CheckoutFormProps {
  planName: string;
  price: number;
  billingPeriod: 'monthly' | 'annual';
  onSuccess: () => void;
  onCancel: () => void;
  isSetupIntent?: boolean;
}

function CheckoutForm({ planName, price, billingPeriod, onSuccess, onCancel, isSetupIntent }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isElementsReady, setIsElementsReady] = useState(false);
  const [paymentElementMounted, setPaymentElementMounted] = useState(false);

  // Track if both Stripe and Elements are ready
  const isStripeReady = stripe && elements && isElementsReady && paymentElementMounted;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Comprehensive readiness check
    if (!isStripeReady) {
      setError('Payment form is still loading. Please wait a moment and try again.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Double-check elements are still mounted before confirming
      const paymentElement = elements.getElement('payment');
      if (!paymentElement) {
        setError('Payment form is not properly loaded. Please refresh and try again.');
        setIsLoading(false);
        return;
      }

      // Use setup intent for trials (payment method collection) or payment intent for immediate charges
      if (isSetupIntent) {
        const { error: stripeError } = await stripe.confirmSetup({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/dashboard?setup=success`,
          },
          redirect: 'if_required',
        });

        if (stripeError) {
          const errorInfo = parseStripeError(stripeError);
          setError(errorInfo.userFriendlyMessage);
        } else {
          onSuccess();
        }
      } else {
        const { error: stripeError } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/dashboard?setup=success`,
          },
          redirect: 'if_required',
        });

        if (stripeError) {
          const errorInfo = parseStripeError(stripeError);
          setError(errorInfo.userFriendlyMessage);
        } else {
          onSuccess();
        }
      }
    } catch (err) {
      logger.error('Payment confirmation error', err as Error);
      setError(err instanceof Error ? err.message : 'An error occurred during payment processing');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpressCheckout = async () => {
    if (!stripe) return;

    setIsLoading(true);
    try {        const { error: confirmError } = await stripe.confirmPayment({
          elements: elements!,
          confirmParams: {
            return_url: `${window.location.origin}/dashboard?setup=success`,
          },
        });

      if (confirmError) {
        setError(confirmError.message || 'Payment failed');
      } else {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">
          Subscribe to {planName}
        </CardTitle>
        <div className="text-center text-2xl font-bold">
          ${price}<span className="text-base font-normal text-muted-foreground">/{billingPeriod === 'monthly' ? 'month' : 'year'}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Express Checkout (Apple Pay, Google Pay, etc.) */}
        <div>
          <ExpressCheckoutElement 
            onConfirm={handleExpressCheckout}
            options={{
              buttonType: {
                applePay: 'subscribe',
                googlePay: 'subscribe',
              },
            }}
          />
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or pay with card</span>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <PaymentElement 
            onReady={(element) => {
              logger.debug('PaymentElement is ready and mounted', undefined, { element: !!element });
              setIsElementsReady(true);
              setPaymentElementMounted(true);
            }}
            onLoadError={(error) => {
              logger.error('PaymentElement load error', error.error, {
                elementType: error.elementType,
                message: error.error?.message,
                type: error.error?.type,
                code: error.error?.code,
                full: error
              });
              
              // More specific error messages based on error type
              let errorMessage = 'Payment form failed to load. Please refresh and try again.';
              if (error.error?.type === 'invalid_request_error') {
                errorMessage = `Invalid payment setup: ${error.error.message}`;
              } else if (error.error?.code === 'setup_intent_authentication_failure') {
                errorMessage = 'Payment authentication failed. Please try a different payment method.';
              } else if (error.error?.code === 'setup_intent_invalid_parameter') {
                errorMessage = 'Payment configuration error. Please contact support.';
              }
              
              setError(errorMessage);
              setPaymentElementMounted(false);
            }}
            onLoaderStart={() => {
              logger.debug('PaymentElement loader started');
              setPaymentElementMounted(false);
            }}
            onChange={(event) => {
              logger.debug('PaymentElement changed', undefined, { complete: event.complete, empty: event.empty, error: !!event.error });
              // Clear any previous errors when user starts typing
              if (error && event.complete) {
                setError(null);
              }
            }}
            options={{
              layout: 'tabs',
              wallets: {
                applePay: 'auto',
                googlePay: 'auto',
              },
              fields: {
                billingDetails: {
                  name: 'auto',
                  email: 'auto',
                  phone: 'auto',
                  address: {
                    country: 'auto',
                    line1: 'auto',
                    line2: 'auto',
                    city: 'auto',
                    state: 'auto',
                    postalCode: 'auto',
                  },
                },
              },
            }}
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isStripeReady || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : !isStripeReady ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading payment form...
                </>
              ) : (
                `Subscribe ${price > 0 ? `$${price}` : ''}`
              )}
            </Button>
          </div>
        </form>

        <div className="text-xs text-muted-foreground text-center">
          {isSetupIntent ? 
            'Start your 14-day free trial. We\'ll collect your payment method now but won\'t charge until your trial ends. Cancel anytime during the trial to avoid charges.' :
            'Your payment method will be charged immediately upon subscription confirmation.'
          }
        </div>
      </CardContent>
    </Card>
  );
}

interface StripeCheckoutFormProps extends CheckoutFormProps {
  clientSecret: string;
  isSetupIntent?: boolean;
}

export default function StripeCheckoutForm({ clientSecret, isSetupIntent, ...props }: StripeCheckoutFormProps) {
  logger.debug('StripeCheckoutForm props', undefined, { hasClientSecret: !!clientSecret, isSetupIntent });
  
  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: 'var(--color-primary)',
        colorBackground: 'var(--color-background)',
        colorText: 'var(--color-foreground)',
        colorDanger: 'var(--color-destructive)',
        fontFamily: 'var(--font-sans)',
        spacingUnit: '4px',
        borderRadius: 'var(--radius)',
      },
      labels: 'floating' as const,
    },
    loader: 'auto' as const,
  };

  return (
    <Elements options={options} stripe={stripePromise}>
      <CheckoutForm {...props} isSetupIntent={isSetupIntent} />
    </Elements>
  );
}
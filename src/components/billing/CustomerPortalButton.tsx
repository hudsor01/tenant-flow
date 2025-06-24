import { Button } from '@/components/ui/button';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';
import { Loader2, ExternalLink, CreditCard, XCircle, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

import type { VariantProps } from "class-variance-authority"
import { buttonVariants } from "@/lib/button-variants"

type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];

interface CustomerPortalButtonProps {
  variant?: ButtonVariant | 'simple';
  size?: VariantProps<typeof buttonVariants>['size'];
  className?: string;
}

export function CustomerPortalButton({ 
  variant = 'outline', 
  size = 'default',
  className 
}: CustomerPortalButtonProps) {
  const { redirectToPortal, redirectToPortalWithFlow, isLoading, error } = useCustomerPortal();

  if (variant === 'simple') {
    return (
      <>
        <Button
          onClick={redirectToPortal}
          disabled={isLoading}
          variant="link"
          size={size}
          className={className}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Opening Portal...
            </>
          ) : (
            <>
              <ExternalLink className="mr-2 h-4 w-4" />
              Manage Billing
            </>
          )}
        </Button>
        {error && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={isLoading}
            variant={variant as ButtonVariant}
            size={size}
            className={className}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Settings className="mr-2 h-4 w-4" />
                Manage Subscription
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={redirectToPortal}>
            <ExternalLink className="mr-2 h-4 w-4" />
            <span>Full Billing Portal</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => redirectToPortalWithFlow('payment_method_update')}>
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Update Payment Method</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => redirectToPortalWithFlow('subscription_cancel')}>
            <XCircle className="mr-2 h-4 w-4" />
            <span>Cancel Subscription</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </>
  );
}

// Simple button version for inline use
export function SimpleCustomerPortalButton(props: Omit<CustomerPortalButtonProps, 'variant'>) {
  return <CustomerPortalButton {...props} variant="simple" />;
}
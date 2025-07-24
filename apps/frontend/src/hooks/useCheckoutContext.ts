/**
 * Hook to use checkout context
 * Moved from CheckoutProvider.tsx to fix react-refresh warning
 */
export function useCheckoutContext() {
    // const context = useContext(CheckoutContext)
    // if (!context) {
    //     throw new Error('useCheckoutContext must be used within a CheckoutProvider')
    // }
    return {
        stripe: null,
        isLoading: false,
        error: null,
        confirmPayment: async () => ({ success: false, error: 'Not implemented' })
    }
}
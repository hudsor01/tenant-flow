'use client';

import { useState, useEffect } from 'react';

/**
 * Get nonce for client-side script injection
 */
function getClientNonce(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Try to get from meta tag first
  const metaNonce = document.querySelector('meta[name="csp-nonce"]')?.getAttribute('content');
  if (metaNonce) return metaNonce;
  
  // Try to get from existing nonce attributes in scripts
  const scriptWithNonce = document.querySelector('script[nonce]');
  if (scriptWithNonce) {
    return scriptWithNonce.getAttribute('nonce');
  }
  
  // Development fallback - no nonce required
  if (process.env.NODE_ENV === 'development') {
    return 'dev-mode';
  }
  
  return null;
}

/**
 * React hook for CSP nonce management
 * Client-side only hook
 */
export function useCSPNonce(): string | null {
  const [nonce, setNonce] = useState<string | null>(null);
  
  useEffect(() => {
    const currentNonce = getClientNonce();
    setNonce(currentNonce);
  }, []);
  
  return nonce;
}
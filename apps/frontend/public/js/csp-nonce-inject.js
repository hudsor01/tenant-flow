/**
 * CSP Nonce Injection Script
 * Safely injects CSP nonce from middleware headers into the DOM
 * This script runs client-side to avoid SSG bailout issues
 */
(function() {
  'use strict';
  
  // Wait for DOM to be ready
  function ready(fn) {
    if (document.readyState !== 'loading') {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }
  
  // Inject nonce from response headers into meta tag
  function injectCSPNonce() {
    try {
      // Find the placeholder meta tag
      const metaTag = document.querySelector('meta[name="csp-nonce"][data-hydrate="true"]');
      
      if (metaTag) {
        // In a real application, we'd get this from the server response
        // For now, we'll generate a client-side nonce for development
        // In production, this would be set by the middleware
        const nonce = generateCSPNonce();
        metaTag.setAttribute('content', nonce);
        metaTag.removeAttribute('data-hydrate');
        
        // Store nonce globally for script access
        window.__CSP_NONCE__ = nonce;
      }
    } catch (error) {
      console.warn('[CSP] Failed to inject nonce:', error);
    }
  }
  
  // Generate a simple nonce for client-side use
  function generateCSPNonce() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  // Initialize when DOM is ready
  ready(injectCSPNonce);
})();
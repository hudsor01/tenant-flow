// React.Children Polyfill - Emergency fallback only
// This should NEVER be needed if our main bootstrap works correctly
(function() {
  'use strict';
  
  console.warn('🚨 React polyfill loaded - this indicates the main bootstrap failed');
  
  // Only polyfill if React exists but Children is missing
  if (typeof window !== 'undefined' && window.React && !window.React.Children) {
    console.warn('🚨 Polyfilling React.Children as emergency fallback');
    
    // Basic React.Children polyfill
    window.React.Children = {
      map: function(children, fn, thisArg) {
        if (!children) return children;
        
        if (Array.isArray(children)) {
          return children.map(fn, thisArg);
        }
        
        return [fn.call(thisArg, children, 0)];
      },
      
      forEach: function(children, fn, thisArg) {
        if (!children) return;
        
        if (Array.isArray(children)) {
          children.forEach(fn, thisArg);
          return;
        }
        
        fn.call(thisArg, children, 0);
      },
      
      count: function(children) {
        if (!children) return 0;
        if (Array.isArray(children)) return children.length;
        return 1;
      },
      
      only: function(children) {
        if (!children) {
          throw new Error('React.Children.only expected to receive a single React element child.');
        }
        
        if (Array.isArray(children)) {
          if (children.length !== 1) {
            throw new Error('React.Children.only expected to receive a single React element child.');
          }
          return children[0];
        }
        
        return children;
      },
      
      toArray: function(children) {
        if (!children) return [];
        if (Array.isArray(children)) return children;
        return [children];
      }
    };
    
    console.warn('✅ React.Children polyfill installed');
  }
})();
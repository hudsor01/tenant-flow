require('dotenv').config();

const testConfig = () => {
  console.log('=== Production Payment Flow Configuration Check ===\n');
  
  const vars = {
    'VITE_STRIPE_PUBLISHABLE_KEY': process.env.VITE_STRIPE_PUBLISHABLE_KEY,
    'STRIPE_SECRET_KEY': process.env.STRIPE_SECRET_KEY,
    'STRIPE_WEBHOOK_SECRET': process.env.STRIPE_WEBHOOK_SECRET,
    'VITE_STRIPE_STARTER_MONTHLY': process.env.VITE_STRIPE_STARTER_MONTHLY,
    'VITE_STRIPE_GROWTH_MONTHLY': process.env.VITE_STRIPE_GROWTH_MONTHLY,
    'VITE_STRIPE_FREE_TRIAL': process.env.VITE_STRIPE_FREE_TRIAL
  };
  
  let allValid = true;
  
  Object.entries(vars).forEach(([key, value]) => {
    if (value) {
      const isLive = value.startsWith('pk_live_') || value.startsWith('sk_live_') || value.startsWith('whsec_') || value.startsWith('price_');
      console.log(`✓ ${key}: ${value.substring(0, 15)}... (${isLive ? 'LIVE' : 'TEST'})`);
    } else {
      console.log(`✗ ${key}: MISSING`);
      allValid = false;
    }
  });
  
  console.log(`\n=== Status ===`);
  console.log(`Configuration: ${allValid ? 'COMPLETE' : 'INCOMPLETE'}`);
  
  if (vars.VITE_STRIPE_PUBLISHABLE_KEY && vars.STRIPE_SECRET_KEY) {
    const pubLive = vars.VITE_STRIPE_PUBLISHABLE_KEY.startsWith('pk_live_');
    const secLive = vars.STRIPE_SECRET_KEY.startsWith('sk_live_');
    
    if (pubLive && secLive) {
      console.log('Mode: PRODUCTION (LIVE KEYS)');
    } else if (!pubLive && !secLive) {
      console.log('Mode: TEST');
    } else {
      console.log('Mode: MISMATCH (mixed live/test keys)');
      allValid = false;
    }
  }
  
  return allValid;
};

testConfig();
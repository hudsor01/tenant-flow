export type HeroVariant = 'simple' | 'glow' | 'pattern';

export interface PricingTestimonial {
  text: string;
  author: string;
  role: string;
}

export interface PricingPlan {
  name: string;
  price: string;
  originalPrice?: string;
  yearlyPrice?: string;
  originalYearlyPrice?: string;
  description: string;
  usageLimit?: string;
  features: string[];
  badge?: string;
  gradient?: string;
  featured?: boolean;
  testimonial?: PricingTestimonial;
  ctaText?: string;
  ctaVariant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
}


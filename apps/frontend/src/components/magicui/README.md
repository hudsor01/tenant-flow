# Magic UI Components - TenantFlow Design System

A comprehensive collection of premium animated UI components integrated into the TenantFlow design system. These components provide professional polish and engaging interactions while maintaining accessibility and performance standards.

## 🎯 Overview

Magic UI components are premium animated components designed to enhance user engagement and create professional, modern interfaces. They integrate seamlessly with TenantFlow's existing design system and follow the same accessibility and performance standards.

## 📦 Installation & Usage

All Magic UI components are available through the main index:

```typescript
import { 
  RainbowButton, 
  ShimmerButton, 
  AnimatedGradientText,
  BorderBeam,
  BlurFade 
} from '@/components/magicui'
```

## 🎨 Component Categories

### Text Animations

#### AnimatedGradientText
Animated gradient text for headings and emphasis.

```typescript
<AnimatedGradientText className="text-4xl font-bold">
  Transform Your Property Management
</AnimatedGradientText>
```

**Use cases:**
- Hero section headlines
- Feature section titles  
- Brand messaging
- Call-to-action text

#### NumberTicker
Animated number counting for statistics and metrics.

```typescript
<NumberTicker 
  value={15000}
  suffix="+"
  className="text-2xl font-bold"
/>
```

**Use cases:**
- Dashboard metrics
- Statistics sections
- Achievement counters
- Progress indicators

### Premium Buttons

#### RainbowButton
Animated rainbow border button for premium actions.

```typescript
<RainbowButton variant="default" size="lg">
  Start Free Trial
</RainbowButton>
```

**Use cases:**
- Primary CTAs
- Premium features
- Subscription upgrades
- Special promotions

#### ShimmerButton
Button with traveling shimmer effect.

```typescript
<ShimmerButton 
  shimmerColor="#ffffff"
  className="premium-cta"
>
  Upgrade to Premium
</ShimmerButton>
```

**Use cases:**
- Premium upgrades
- Feature unlocks
- Special offers
- High-value actions

#### InteractiveHoverButton
Button with smooth hover animations and arrow reveal.

```typescript
<InteractiveHoverButton>
  Learn More
</InteractiveHoverButton>
```

**Use cases:**
- Secondary actions
- Navigation buttons
- Content discovery
- Feature exploration

### Layout Animations

#### BlurFade
Smooth blur fade animations for content reveals.

```typescript
<BlurFade delay={0.2} yOffset={8}>
  <Card>Your content</Card>
</BlurFade>
```

**Use cases:**
- Page transitions
- Content reveals
- Staggered animations
- Progressive disclosure

#### AnimatedList
Animated list items with staggered reveals.

```typescript
<AnimatedList 
  items={features}
  delay={100}
/>
```

**Use cases:**
- Feature lists
- Testimonials
- Step-by-step guides
- Content sequences

#### Marquee
Infinite scrolling content for logos and testimonials.

```typescript
<Marquee className="py-4">
  {logoItems.map(logo => (
    <img key={logo.id} src={logo.url} />
  ))}
</Marquee>
```

**Use cases:**
- Client logos
- Testimonial rotation
- Feature highlights
- Social proof

### Background Effects

#### BorderBeam
Animated border light effect for cards and containers.

```typescript
<div className="relative">
  <BorderBeam />
  <Card>Your content</Card>
</div>
```

**Use cases:**
- Feature cards
- Premium content
- Highlighted sections
- Interactive elements

#### Ripple
Animated ripple background effects.

```typescript
<div className="relative">
  <Ripple 
    mainCircleSize={300}
    mainCircleOpacity={0.15}
    numCircles={6}
  />
  <YourContent />
</div>
```

**Use cases:**
- Hero backgrounds
- CTA sections
- Landing page headers
- Feature introductions

#### Meteors
Animated meteor shower background effect.

```typescript
<div className="relative">
  <Meteors number={20} />
  <YourContent />
</div>
```

**Use cases:**
- Dark theme backgrounds
- Technical/innovation themes
- Special event pages
- Dynamic backgrounds

#### GridPattern
Customizable grid patterns for backgrounds.

```typescript
<GridPattern
  width={40}
  height={40}
  className="opacity-30"
/>
```

**Use cases:**
- Section backgrounds
- Technical aesthetics
- Pattern overlays
- Subtle textures

### Interactive Components

#### Globe
Interactive 3D globe with customizable markers.

```typescript
<Globe 
  className="max-w-md"
  config={{
    markers: [
      { location: [40.7128, -74.006], size: 0.1 }
    ]
  }}
/>
```

**Use cases:**
- Global presence
- Location features
- Geographic data
- International themes

#### Confetti
Celebration confetti animations.

```typescript
import confetti from '@/components/magicui/confetti'

// Trigger confetti
confetti({
  particleCount: 100,
  spread: 70,
  origin: { y: 0.6 }
})
```

**Use cases:**
- Success celebrations
- Achievement unlocks
- Special events
- Milestone completions

## 🎨 Design Tokens

Magic UI components use consistent design tokens:

### Colors
- `--color-1` through `--color-5` - Rainbow gradient colors
- Uses TenantFlow theme colors for consistency

### Animations
- `rainbow: 8s` - Rainbow animation duration
- `ripple: 3s` - Ripple effect timing
- `shimmer: 2s` - Shimmer animation speed

### Easings
- `smooth: cubic-bezier(0.4, 0, 0.2, 1)` - Standard easing
- `bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55)` - Playful bounce

## 🚀 Performance Guidelines

### Best Practices
1. **Strategic Usage** - Use Magic UI components sparingly for maximum impact
2. **Hardware Acceleration** - Components use CSS transforms for 60fps performance
3. **Reduced Motion** - All components respect `prefers-reduced-motion` settings
4. **Mobile Optimization** - Optimized for touch interactions and mobile performance

### Performance Tips
```typescript
// Good: Strategic use for key CTAs
<RainbowButton>Start Free Trial</RainbowButton>

// Avoid: Overusing animated components
<div>
  <RainbowButton>Button 1</RainbowButton>
  <ShimmerButton>Button 2</ShimmerButton>
  <InteractiveHoverButton>Button 3</InteractiveHoverButton>
</div>
```

## ♿ Accessibility

### Built-in Features
- **Reduced Motion** - Honors `prefers-reduced-motion: reduce`
- **Keyboard Navigation** - Maintains focus management
- **Screen Readers** - Uses semantic HTML and ARIA attributes
- **Color Contrast** - Maintains WCAG contrast ratios

### Implementation
```typescript
// Reduced motion example
<BlurFade 
  delay={prefersReducedMotion ? 0 : 0.2}
  yOffset={prefersReducedMotion ? 0 : 8}
>
  Content
</BlurFade>
```

## 🎯 Usage Patterns

### Hero Section
```typescript
import { AnimatedGradientText, RainbowButton, Ripple } from '@/components/magicui'

function HeroSection() {
  return (
    <div className="relative py-20">
      <Ripple />
      <div className="text-center">
        <AnimatedGradientText className="text-5xl font-bold mb-6">
          Transform Your Property Management
        </AnimatedGradientText>
        <p className="text-xl mb-8">
          Streamline operations with our premium platform
        </p>
        <RainbowButton size="lg">
          Start Free Trial
        </RainbowButton>
      </div>
    </div>
  )
}
```

### Feature Card
```typescript
import { BorderBeam, BlurFade, ShimmerButton } from '@/components/magicui'

function FeatureCard({ feature, delay }) {
  return (
    <BlurFade delay={delay}>
      <Card className="relative p-6">
        <BorderBeam />
        <h3 className="text-xl font-semibold mb-4">{feature.title}</h3>
        <p className="text-muted-foreground mb-6">{feature.description}</p>
        <ShimmerButton className="w-full">
          Learn More
        </ShimmerButton>
      </Card>
    </BlurFade>
  )
}
```

### Statistics Section
```typescript
import { NumberTicker, GridPattern } from '@/components/magicui'

function StatsSection() {
  return (
    <div className="relative py-16">
      <GridPattern className="opacity-20" />
      <div className="grid grid-cols-3 gap-8 text-center">
        <div>
          <NumberTicker value={15000} suffix="+" className="text-4xl font-bold" />
          <p>Active Users</p>
        </div>
        <div>
          <NumberTicker value={99.9} suffix="%" className="text-4xl font-bold" />
          <p>Uptime</p>
        </div>
        <div>
          <NumberTicker value={50} suffix="+" className="text-4xl font-bold" />
          <p>Countries</p>
        </div>
      </div>
    </div>
  )
}
```

## 🔧 Customization

### Theme Integration
Magic UI components integrate with TenantFlow's theme system:

```typescript
// Automatic theme adaptation
<RainbowButton className="bg-primary text-primary-foreground">
  Themed Button
</RainbowButton>

// Custom styling
<ShimmerButton 
  shimmerColor="var(--primary)"
  className="custom-premium-button"
>
  Custom Button
</ShimmerButton>
```

### CSS Custom Properties
```css
.magic-ui-custom {
  /* Rainbow colors */
  --color-1: hsl(var(--primary));
  --color-2: hsl(var(--secondary));
  --color-3: hsl(var(--accent));
  --color-4: hsl(var(--muted));
  --color-5: hsl(var(--primary));
  
  /* Animation speeds */
  --animation-speed: 6s; /* Custom rainbow speed */
}
```

## 🧪 Testing

Magic UI components include comprehensive visual regression testing:

```bash
# Run visual tests
npm run test:visual

# Update baselines after changes
npm run test:visual:update
```

Components are tested across:
- Multiple browser engines (Chromium, WebKit)
- Different viewport sizes (desktop, mobile)
- Various interaction states (hover, focus, active)
- Theme variations (light, dark)

## 📚 Storybook Documentation

All Magic UI components are documented in Storybook with:
- Interactive examples
- Property controls
- Usage guidelines
- Code examples
- Accessibility notes

Access at: `http://localhost:6006`

## 🚀 Production Usage

### Gradual Implementation
1. Start with high-impact areas (hero sections, CTAs)
2. A/B test enhanced vs standard components
3. Monitor performance metrics
4. Scale successful patterns

### Performance Monitoring
- Lighthouse scores
- Core Web Vitals
- Animation frame rates
- User engagement metrics

### Browser Support
- Modern browsers with CSS transforms
- Progressive enhancement for older browsers
- Graceful degradation without JavaScript

---

## 🎉 Ready to Enhance Your UI

Magic UI components are ready for production use in TenantFlow. They provide professional polish while maintaining the accessibility, performance, and maintainability standards of the existing design system.

Start with strategic implementation in key areas and expand based on user feedback and engagement metrics.
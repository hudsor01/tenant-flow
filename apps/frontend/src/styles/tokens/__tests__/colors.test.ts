/**
 * Color Token Accessibility Tests
 * Validates WCAG 2.1 compliance for all color combinations
 */

import { describe, it, expect } from 'vitest';
import { logger } from '@/lib/logger'
import { primitiveColors, semanticColors, componentColors } from '../colors';
import { logger } from '@/lib/logger'
import { testColorPair, testColorCombinations } from '../utils/contrast';
import { logger } from '@/lib/logger'

describe('Color Token Accessibility', () => {
  describe('Primary Text Combinations', () => {
    it('should meet WCAG AA for primary text on backgrounds', () => {
      const combinations = [
        {
          foreground: semanticColors.foreground.primary,
          background: semanticColors.background.primary,
          label: 'Primary text on primary background',
        },
        {
          foreground: semanticColors.foreground.primary,
          background: semanticColors.background.secondary,
          label: 'Primary text on secondary background',
        },
        {
          foreground: semanticColors.foreground.secondary,
          background: semanticColors.background.primary,
          label: 'Secondary text on primary background',
        },
      ];
      
      const results = testColorCombinations(combinations);
      
      results.forEach(result => {
        expect(result.passes.AA.normal).toBe(true);
        logger.info(`${result.label}: ${result.ratio.toFixed(2)}:1 ${result.recommendation}`, { component: "styles_tokens___tests___colors.test.ts" });
      });
    });
  });
  
  describe('Button Accessibility', () => {
    it('should meet WCAG AA for all button variants', () => {
      const buttonTests = [
        {
          foreground: componentColors.button.primary.text,
          background: componentColors.button.primary.background,
          label: 'Primary button',
        },
        {
          foreground: componentColors.button.secondary.text,
          background: componentColors.button.secondary.background,
          label: 'Secondary button',
        },
        {
          foreground: componentColors.button.danger.text,
          background: componentColors.button.danger.background,
          label: 'Danger button',
        },
      ];
      
      const results = testColorCombinations(buttonTests);
      
      results.forEach(result => {
        expect(result.passes.AA.normal).toBe(true);
        logger.info(`${result.label}: ${result.ratio.toFixed(2)}:1`, { component: "styles_tokens___tests___colors.test.ts" });
      });
    });
  });
  
  describe('Alert and Feedback Colors', () => {
    it('should meet WCAG AA for all feedback states', () => {
      const feedbackTests = [
        {
          foreground: semanticColors.feedback.success.text,
          background: semanticColors.feedback.success.background,
          label: 'Success message',
        },
        {
          foreground: semanticColors.feedback.warning.text,
          background: semanticColors.feedback.warning.background,
          label: 'Warning message',
        },
        {
          foreground: semanticColors.feedback.error.text,
          background: semanticColors.feedback.error.background,
          label: 'Error message',
        },
        {
          foreground: semanticColors.feedback.info.text,
          background: semanticColors.feedback.info.background,
          label: 'Info message',
        },
      ];
      
      const results = testColorCombinations(feedbackTests);
      
      results.forEach(result => {
        expect(result.passes.AA.normal).toBe(true);
        logger.info(`${result.label}: ${result.ratio.toFixed(2)}:1`, { component: "styles_tokens___tests___colors.test.ts" });
      });
    });
  });
  
  describe('Badge Accessibility', () => {
    it('should meet WCAG AA for all badge variants', () => {
      const badgeTests = [
        {
          foreground: componentColors.badge.default.text,
          background: componentColors.badge.default.background,
          label: 'Default badge',
        },
        {
          foreground: componentColors.badge.primary.text,
          background: componentColors.badge.primary.background,
          label: 'Primary badge',
        },
        {
          foreground: componentColors.badge.success.text,
          background: componentColors.badge.success.background,
          label: 'Success badge',
        },
        {
          foreground: componentColors.badge.warning.text,
          background: componentColors.badge.warning.background,
          label: 'Warning badge',
        },
        {
          foreground: componentColors.badge.error.text,
          background: componentColors.badge.error.background,
          label: 'Error badge',
        },
      ];
      
      const results = testColorCombinations(badgeTests);
      
      results.forEach(result => {
        expect(result.passes.AA.normal).toBe(true);
        logger.info(`${result.label}: ${result.ratio.toFixed(2)}:1`, { component: "styles_tokens___tests___colors.test.ts" });
      });
    });
  });
  
  describe('Interactive States', () => {
    it('should maintain accessibility in hover states', () => {
      const hoverTests = [
        {
          foreground: componentColors.button.primary.hover.text,
          background: componentColors.button.primary.hover.background,
          label: 'Primary button hover',
        },
        {
          foreground: componentColors.button.secondary.hover.text,
          background: componentColors.button.secondary.hover.background,
          label: 'Secondary button hover',
        },
        {
          foreground: semanticColors.foreground.primary,
          background: componentColors.card.hover.background,
          label: 'Card hover state',
        },
      ];
      
      const results = testColorCombinations(hoverTests);
      
      results.forEach(result => {
        expect(result.passes.AA.normal).toBe(true);
        logger.info(`${result.label}: ${result.ratio.toFixed(2)}:1`, { component: "styles_tokens___tests___colors.test.ts" });
      });
    });
  });
  
  describe('Dark Mode Support', () => {
    it('should provide accessible inverse color combinations', () => {
      const inverseTests = [
        {
          foreground: semanticColors.foreground.inverse,
          background: semanticColors.background.inverse,
          label: 'Inverse text on inverse background',
        },
        {
          foreground: primitiveColors.charcoal[50],
          background: primitiveColors.steel[700],
          label: 'Light text on dark primary',
        },
        {
          foreground: primitiveColors.charcoal[50],
          background: primitiveColors.teal[700],
          label: 'Light text on dark accent',
        },
      ];
      
      const results = testColorCombinations(inverseTests);
      
      results.forEach(result => {
        expect(result.passes.AA.normal).toBe(true);
        logger.info(`${result.label}: ${result.ratio.toFixed(2)}:1`, { component: "styles_tokens___tests___colors.test.ts" });
      });
    });
  });
  
  describe('Color Palette Coverage', () => {
    it('should provide sufficient color variations', () => {
      // Test that we have enough variations for different use cases
      expect(Object.keys(primitiveColors.steel)).toHaveLength(11);
      expect(Object.keys(primitiveColors.teal)).toHaveLength(11);
      expect(Object.keys(primitiveColors.charcoal)).toHaveLength(11);
      
      // Test semantic mappings exist
      expect(semanticColors.background).toBeDefined();
      expect(semanticColors.foreground).toBeDefined();
      expect(semanticColors.border).toBeDefined();
      expect(semanticColors.interactive).toBeDefined();
      expect(semanticColors.feedback).toBeDefined();
      
      // Test component mappings exist
      expect(componentColors.button).toBeDefined();
      expect(componentColors.input).toBeDefined();
      expect(componentColors.card).toBeDefined();
      expect(componentColors.badge).toBeDefined();
      expect(componentColors.alert).toBeDefined();
    });
  });
  
  describe('High Contrast Mode', () => {
    it('should identify AAA compliant combinations', () => {
      const highContrastTests = [
        {
          foreground: primitiveColors.charcoal[950],
          background: primitiveColors.charcoal[50],
          label: 'Maximum contrast (dark on light)',
        },
        {
          foreground: primitiveColors.charcoal[50],
          background: primitiveColors.charcoal[950],
          label: 'Maximum contrast (light on dark)',
        },
      ];
      
      const results = testColorCombinations(highContrastTests);
      
      results.forEach(result => {
        expect(result.passes.AAA.normal).toBe(true);
        logger.info(`${result.label}: ${result.ratio.toFixed(2)}:1 (AAA compliant)`, { component: "styles_tokens___tests___colors.test.ts" });
      });
    });
  });
});

// Generate accessibility report
describe('Accessibility Report', () => {
  it('should generate comprehensive contrast report', () => {
    const criticalCombinations = [
      // Primary interactions
      { f: semanticColors.foreground.primary, b: semanticColors.background.primary, l: 'Body text' },
      { f: semanticColors.foreground.secondary, b: semanticColors.background.primary, l: 'Secondary text' },
      { f: semanticColors.foreground.muted, b: semanticColors.background.primary, l: 'Muted text' },
      
      // Buttons
      { f: componentColors.button.primary.text, b: componentColors.button.primary.background, l: 'Primary CTA' },
      { f: componentColors.button.secondary.text, b: componentColors.button.secondary.background, l: 'Secondary CTA' },
      
      // Feedback
      { f: semanticColors.feedback.error.text, b: semanticColors.feedback.error.background, l: 'Error state' },
      { f: semanticColors.feedback.success.text, b: semanticColors.feedback.success.background, l: 'Success state' },
    ];
    
    logger.info('\n=== ACCESSIBILITY REPORT ===\n', { component: 'styles_tokens___tests___colors.test.ts' });
    
    criticalCombinations.forEach(({ f: foreground, b: background, l: label }) => {
      const result = testColorPair(foreground, background);
      const status = result.passes.AA.normal ? '✅' : '❌';
      const aaaStatus = result.passes.AAA.normal ? '⭐' : '';
      
      logger.info(`${status} ${label.padEnd(20)} ${result.ratio.toFixed(2)}:1 ${aaaStatus}`, { component: "styles_tokens___tests___colors.test.ts" });
    });
    
    logger.info('\n✅ = WCAG AA compliant | ⭐ = WCAG AAA compliant\n', { component: 'styles_tokens___tests___colors.test.ts' });
  });
});
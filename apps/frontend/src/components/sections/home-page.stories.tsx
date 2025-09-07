import type { Meta, StoryObj } from '@storybook/react';
import Navbar from '@/components/navbar';
import HeroSection from './hero-section';
import FeaturesSection from './features-section';
import PricingSection from './pricing-section';

const meta = {
  title: 'Marketing/Pages/Home (Co-located)',
  parameters: { layout: 'fullscreen' },
  globals: { domain: 'marketing' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <main className="bg-clean-light dark:bg-clean-dark">
      <Navbar />
      <div className="pt-20 space-y-24">
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
      </div>
    </main>
  ),
};


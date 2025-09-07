import type { Meta, StoryObj } from '@storybook/react';
import PricingSection from './pricing-section';
import Navbar from '@/components/navbar';

const meta = {
  title: 'Marketing/Sections/Pricing',
  component: PricingSection,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  globals: { domain: 'marketing' },
} satisfies Meta<typeof PricingSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <main className="bg-clean-light dark:bg-clean-dark min-h-screen">
      <Navbar />
      <div className="pt-24">
        <PricingSection />
      </div>
    </main>
  ),
};


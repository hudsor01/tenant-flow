import type { Meta, StoryObj } from '@storybook/react';
import HeroSection from './hero-section';
import Navbar from '@/components/navbar';

const meta = {
  title: 'Marketing/Sections/Hero',
  component: HeroSection,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  globals: { domain: 'marketing' },
} satisfies Meta<typeof HeroSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <main className="bg-clean-light dark:bg-clean-dark min-h-screen">
      <Navbar />
      <div className="pt-24">
        <HeroSection />
      </div>
    </main>
  ),
};


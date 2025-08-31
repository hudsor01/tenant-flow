import type { Meta, StoryObj } from '@storybook/react';

// Welcome component
const Welcome = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Welcome to TenantFlow Storybook
      </h1>
      <p className="text-gray-600 mb-6">
        This is the component documentation and development environment for TenantFlow.
      </p>
      <div className="bg-blue-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">
          Getting Started
        </h2>
        <ul className="text-blue-800 space-y-1">
          <li>• Browse components in the sidebar</li>
          <li>• Use the Controls panel to interact with component props</li>
          <li>• Switch between light and dark themes</li>
          <li>• View component documentation</li>
        </ul>
      </div>
    </div>
  );
};

const meta: Meta<typeof Welcome> = {
  title: 'Welcome',
  component: Welcome,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
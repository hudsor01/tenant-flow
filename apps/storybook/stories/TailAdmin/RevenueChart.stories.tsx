import type { Meta, StoryObj } from '@storybook/react';
import { RevenueChart, PropertyRevenueChart } from '@repo/frontend/src/components/tailadmin';

const meta: Meta<typeof RevenueChart> = {
  title: 'TailAdmin/Charts/RevenueChart',
  component: RevenueChart,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Professional revenue chart component built with ApexCharts. Features smooth area charts, responsive design, and customizable data visualization for property management metrics.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Chart title displayed at the top',
    },
    data: {
      description: 'Chart data series with name and data points',
    },
    categories: {
      description: 'X-axis categories (months, quarters, etc.)',
    },
    height: {
      control: { type: 'number', min: 200, max: 600, step: 50 },
      description: 'Chart height in pixels',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Default revenue chart
export const Default: Story = {
  args: {
    title: "Revenue Overview",
    height: 350,
  },
};

// Monthly revenue comparison
export const MonthlyComparison: Story = {
  args: {
    title: "Monthly Revenue vs Expenses",
    data: [
      {
        name: "Revenue",
        data: [12500, 13200, 11800, 14100, 15500, 16200, 17800, 18200, 16900, 19400, 20100, 21800],
      },
      {
        name: "Expenses", 
        data: [4200, 4400, 3900, 4300, 4700, 5200, 5600, 5800, 5200, 6100, 6400, 6800],
      },
    ],
    categories: [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ],
    height: 400,
  },
};

// Quarterly view
export const QuarterlyView: Story = {
  args: {
    title: "Quarterly Performance",
    data: [
      {
        name: "Rental Income",
        data: [38500, 42300, 46200, 51300],
      },
      {
        name: "Operating Costs",
        data: [12800, 14200, 15400, 17200],
      },
      {
        name: "Net Profit",
        data: [25700, 28100, 30800, 34100],
      },
    ],
    categories: ["Q1 2024", "Q2 2024", "Q3 2024", "Q4 2024"],
    height: 350,
  },
};

// Property-specific revenue
export const PropertySpecific: Story = {
  render: () => <PropertyRevenueChart />,
};

// Small chart variant
export const Compact: Story = {
  args: {
    title: "Monthly Overview",
    data: [
      {
        name: "Income",
        data: [8500, 9200, 8800, 9100, 9500, 10200],
      },
    ],
    categories: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    height: 250,
  },
};

// Multiple properties comparison
export const MultipleProperties: Story = {
  args: {
    title: "Property Portfolio Performance",
    data: [
      {
        name: "Sunset Apartments",
        data: [4200, 4400, 4100, 4300, 4500, 4700, 4900, 5100, 4800, 5200, 5400, 5600],
      },
      {
        name: "Downtown Lofts",
        data: [3800, 4000, 3700, 3900, 4200, 4500, 4700, 4900, 4600, 5000, 5200, 5400],
      },
      {
        name: "Garden View Complex",
        data: [2800, 3100, 2900, 3200, 3400, 3600, 3800, 4000, 3700, 4100, 4300, 4500],
      },
    ],
    categories: [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ],
    height: 400,
  },
};

// Year-over-year comparison
export const YearOverYear: Story = {
  args: {
    title: "Year-over-Year Growth",
    data: [
      {
        name: "2023",
        data: [8500, 8700, 8400, 8900, 9200, 9500, 9800, 10100, 9700, 10400, 10700, 11000],
      },
      {
        name: "2024",
        data: [9200, 9500, 9100, 9600, 10000, 10400, 10800, 11200, 10700, 11500, 11900, 12300],
      },
    ],
    categories: [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ],
    height: 380,
  },
};

// Dashboard grid layout
export const DashboardLayout: Story = {
  render: () => (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <RevenueChart
        title="Monthly Revenue"
        data={[
          {
            name: "Revenue",
            data: [12500, 13200, 11800, 14100, 15500, 16200],
          },
        ]}
        categories={["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]}
        height={300}
      />
      <RevenueChart
        title="Property Comparison"
        data={[
          {
            name: "Sunset Apts",
            data: [4200, 4400, 4100, 4300, 4500, 4700],
          },
          {
            name: "Downtown Lofts",
            data: [3800, 4000, 3700, 3900, 4200, 4500],
          },
        ]}
        categories={["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]}
        height={300}
      />
      <div className="lg:col-span-2">
        <PropertyRevenueChart />
      </div>
    </div>
  ),
};

// Real-time data simulation
export const RealTimeData: Story = {
  args: {
    title: "Live Revenue Tracking",
    data: [
      {
        name: "Today",
        data: [120, 180, 240, 195, 220, 280, 310, 340, 325, 380, 420, 465],
      },
      {
        name: "Yesterday",
        data: [95, 140, 185, 160, 190, 225, 250, 275, 260, 290, 320, 350],
      },
    ],
    categories: [
      "12 AM", "2 AM", "4 AM", "6 AM", "8 AM", "10 AM",
      "12 PM", "2 PM", "4 PM", "6 PM", "8 PM", "10 PM",
    ],
    height: 350,
  },
};

// Custom styling showcase
export const CustomStyling: Story = {
  args: {
    title: "Revenue Trends",
    className: "shadow-lg border-2 border-blue-200",
    height: 350,
  },
  render: (args) => (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 dark:from-gray-900 dark:to-gray-800">
      <RevenueChart {...args} />
    </div>
  ),
};
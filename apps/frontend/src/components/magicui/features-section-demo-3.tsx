import React from "react";
import { cn } from "@/lib/utils";
import createGlobe from "cobe";
import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Play } from "lucide-react";


export default function FeaturesSectionDemo() {
  const features = [
    {
      title: "Manage Properties Effectively",
      description:
        "Track occupancy, collect rent, and manage maintenance requests across all your properties.",
      skeleton: <SkeletonOne />,
      className:
        "col-span-1 lg:col-span-4 border-b lg:border-r dark:border-neutral-800",
    },
    {
      title: "Tenant Management",
      description:
        "Handle tenant applications, leases, and communications in one centralized platform.",
      skeleton: <SkeletonTwo />,
      className: "border-b col-span-1 lg:col-span-2 dark:border-neutral-800",
    },
    {
      title: "Financial Dashboard",
      description:
        "Monitor rental income, expenses, and property performance with real-time analytics.",
      skeleton: <SkeletonThree />,
      className:
        "col-span-1 lg:col-span-3 lg:border-r  dark:border-neutral-800",
    },
    {
      title: "Automated Workflows",
      description:
        "Streamline rent collection, lease renewals, and maintenance scheduling with smart automation.",
      skeleton: <SkeletonFour />,
      className: "col-span-1 lg:col-span-3 border-b lg:border-none",
    },
  ];
  return (
    <div className="relative z-20 py-10 lg:py-40 max-w-7xl mx-auto">
      <div className="px-8">
        <h4 className="text-3xl lg:text-5xl lg:leading-tight max-w-5xl mx-auto text-center tracking-tight font-medium text-black dark:text-white">
          Everything you need to manage rental properties
        </h4>

        <p className="text-sm lg:text-base  max-w-2xl  my-4 mx-auto text-neutral-500 text-center font-normal dark:text-neutral-300">
          From tenant screening to rent collection, TenantFlow provides all the tools
          property managers need to streamline their operations and maximize returns.
        </p>
      </div>

      <div className="relative ">
        <div className="grid grid-cols-1 lg:grid-cols-6 mt-12 xl:border rounded-md dark:border-neutral-800">
          {features.map((feature) => (
            <FeatureCard key={feature.title} className={feature.className}>
              <FeatureTitle>{feature.title}</FeatureTitle>
              <FeatureDescription>{feature.description}</FeatureDescription>
              <div className=" h-full w-full">{feature.skeleton}</div>
            </FeatureCard>
          ))}
        </div>
      </div>
    </div>
  );
}

const FeatureCard = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn(`p-4 sm:p-8 relative overflow-hidden`, className)}>
      {children}
    </div>
  );
};

const FeatureTitle = ({ children }: { children?: React.ReactNode }) => {
  return (
    <p className=" max-w-5xl mx-auto text-left tracking-tight text-black dark:text-white text-xl md:text-2xl md:leading-snug">
      {children}
    </p>
  );
};

const FeatureDescription = ({ children }: { children?: React.ReactNode }) => {
  return (
    <p
      className={cn(
        "text-sm md:text-base  max-w-4xl text-left mx-auto",
        "text-neutral-500 text-center font-normal dark:text-neutral-300",
        "text-left max-w-sm mx-0 md:text-sm my-2"
      )}
    >
      {children}
    </p>
  );
};

export const SkeletonOne = () => {
  const properties = [
    { id: 1, name: "Sunset Apartments", units: 12, occupied: 10, rent: "$15,600", status: "Active" },
    { id: 2, name: "Oak Street Duplex", units: 2, occupied: 2, rent: "$3,400", status: "Active" },
    { id: 3, name: "Downtown Lofts", units: 8, occupied: 6, rent: "$9,600", status: "Maintenance" },
    { id: 4, name: "Garden View Condos", units: 6, occupied: 4, rent: "$7,200", status: "Active" },
  ];

  return (
    <div className="relative flex py-8 px-2 gap-10 h-full">
      <div className="w-full p-5 mx-auto bg-white dark:bg-neutral-900 shadow-2xl group h-full">
        <div className="flex flex-1 w-full h-full flex-col space-y-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Property Portfolio</h3>
            <div className="text-xs text-gray-500 dark:text-gray-400">28 units • 88% occupied</div>
          </div>
          <div className="space-y-3">
            {properties.map((property) => (
              <div key={property.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900 dark:text-white">{property.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{property.occupied}/{property.units} units occupied</div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-green-600 dark:text-green-400">{property.rent}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">monthly</div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    property.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                  }`}>
                    {property.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 z-40 inset-x-0 h-60 bg-gradient-to-t from-white dark:from-black via-white dark:via-black to-transparent w-full pointer-events-none" />
      <div className="absolute top-0 z-40 inset-x-0 h-60 bg-gradient-to-b from-white dark:from-black via-transparent to-transparent w-full pointer-events-none" />
    </div>
  );
};

export const SkeletonThree = () => {
  const financialData = [
    { label: "Monthly Revenue", value: "$36,800", change: "+12%" },
    { label: "Operating Expenses", value: "$8,400", change: "-3%" },
    { label: "Net Income", value: "$28,400", change: "+15%" },
  ];

  return (
    <div className="relative flex gap-10 h-full">
      <div className="w-full mx-auto bg-white dark:bg-neutral-900 p-6 rounded-lg h-full">
        <div className="flex flex-1 w-full h-full flex-col space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Financial Dashboard</h3>
          
          <div className="grid grid-cols-1 gap-4">
            {financialData.map((item, idx) => (
              <div key={idx} className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{item.label}</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{item.value}</div>
                  </div>
                  <div className={`text-sm font-medium ${
                    item.change.startsWith('+') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {item.change}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
              <span>Occupancy Rate</span>
              <span>88%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: '88%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SkeletonTwo = () => {
  const tenants = [
    { name: "Sarah Johnson", unit: "Apt 12A", status: "Active", lease: "11 months left", avatar: "SJ" },
    { name: "Mike Chen", unit: "Apt 8B", status: "Pending", lease: "Application review", avatar: "MC" },
    { name: "Emma Davis", unit: "Apt 3C", status: "Active", lease: "3 months left", avatar: "ED" },
  ];

  return (
    <div className="relative flex flex-col items-start p-6 gap-4 h-full overflow-hidden">
      <div className="w-full">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Tenant Management</h3>
        <div className="space-y-3">
          {tenants.map((tenant, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                {tenant.avatar}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900 dark:text-white">{tenant.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{tenant.unit} • {tenant.lease}</div>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                tenant.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              }`}>
                {tenant.status}
              </span>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">Quick Actions</div>
          <div className="flex gap-2 text-xs">
            <button className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">Send Notice</button>
            <button className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Collect Rent</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SkeletonFour = () => {
  return (
    <div className="h-60 md:h-60  flex flex-col items-center relative bg-transparent dark:bg-transparent mt-10">
      <Globe className="absolute -right-10 md:-right-10 -bottom-80 md:-bottom-72" />
    </div>
  );
};

export const Globe = ({ className }: { className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let phi = 0;

    if (!canvasRef.current) return;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 600 * 2,
      height: 600 * 2,
      phi: 0,
      theta: 0,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.3, 0.3, 0.3],
      markerColor: [0.1, 0.8, 1],
      glowColor: [1, 1, 1],
      markers: [
        // longitude latitude
        { location: [37.7595, -122.4367], size: 0.03 },
        { location: [40.7128, -74.006], size: 0.1 },
      ],
      onRender: (state) => {
        // Called on every animation frame.
        // `state` will be an empty object, return updated params.
        state.phi = phi;
        phi += 0.01;
      },
    });

    return () => {
      globe.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 600, height: 600, maxWidth: "100%", aspectRatio: 1 }}
      className={className}
    />
  );
};

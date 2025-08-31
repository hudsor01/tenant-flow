import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Switch } from '../../../apps/frontend/src/components/ui/switch';

const meta: Meta<typeof Switch> = {
  title: 'UI/Switch System',
  component: Switch,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    checked: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic Switch States
export const BasicStates: Story = {
  render: () => (
    <div className="space-y-6 w-80">
      <h3 className="text-lg font-semibold">Basic Switch States</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label htmlFor="unchecked" className="text-sm font-medium">
            Unchecked Switch
          </label>
          <Switch id="unchecked" />
        </div>

        <div className="flex items-center justify-between">
          <label htmlFor="checked" className="text-sm font-medium">
            Checked Switch
          </label>
          <Switch id="checked" defaultChecked />
        </div>

        <div className="flex items-center justify-between opacity-50">
          <label htmlFor="disabled-off" className="text-sm font-medium">
            Disabled (Off)
          </label>
          <Switch id="disabled-off" disabled />
        </div>

        <div className="flex items-center justify-between opacity-50">
          <label htmlFor="disabled-on" className="text-sm font-medium">
            Disabled (On)
          </label>
          <Switch id="disabled-on" disabled defaultChecked />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="with-description" className="text-sm font-medium">
              Switch with Description
            </label>
            <p className="text-xs text-muted-foreground">
              This switch has additional context information
            </p>
          </div>
          <Switch id="with-description" />
        </div>
      </div>
    </div>
  ),
};

// Notification Settings
export const NotificationSettings: Story = {
  render: () => {
    const [settings, setSettings] = React.useState({
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      marketingEmails: false,
      maintenanceAlerts: true,
      rentReminders: true,
      leaseExpiryAlerts: true,
      systemUpdates: false,
    });

    const handleSettingChange = (key: keyof typeof settings) => {
      setSettings(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    };

    const notificationGroups = [
      {
        title: 'General Notifications',
        icon: 'i-lucide-bell',
        settings: [
          {
            key: 'emailNotifications' as const,
            label: 'Email Notifications',
            description: 'Receive important updates via email',
          },
          {
            key: 'smsNotifications' as const,
            label: 'SMS Notifications',
            description: 'Get text messages for urgent matters',
          },
          {
            key: 'pushNotifications' as const,
            label: 'Push Notifications',
            description: 'Browser and mobile app notifications',
          },
        ],
      },
      {
        title: 'Property & Rent Alerts',
        icon: 'i-lucide-bell',
        settings: [
          {
            key: 'rentReminders' as const,
            label: 'Rent Reminders',
            description: 'Get reminded before rent is due',
          },
          {
            key: 'maintenanceAlerts' as const,
            label: 'Maintenance Alerts',
            description: 'Updates on maintenance requests and schedules',
          },
          {
            key: 'leaseExpiryAlerts' as const,
            label: 'Lease Expiry Alerts',
            description: 'Notifications before lease expires',
          },
        ],
      },
      {
        title: 'Marketing & Updates',
        icon: 'i-lucide-bell',
        settings: [
          {
            key: 'marketingEmails' as const,
            label: 'Marketing Emails',
            description: 'Promotional content and special offers',
          },
          {
            key: 'systemUpdates' as const,
            label: 'System Updates',
            description: 'Platform updates and new feature announcements',
          },
        ],
      },
    ];

    return (
      <div className="space-y-8 w-full max-w-2xl">
        <div className="text-center">
          <div className="i-lucide-bell mx-auto h-8 w-8 text-primary mb-2" />
          <h3 className="text-lg font-semibold">Notification Preferences</h3>
          <p className="text-sm text-muted-foreground">
            Customize how and when you receive notifications
          </p>
        </div>

        {notificationGroups.map((group) => {
          return (
            <div key={group.title} className="space-y-4">
              <div className="flex items-center gap-2">
                <div className={`${group.icon} h-5 w-5 text-primary`} />
                <h4 className="text-md font-medium">{group.title}</h4>
              </div>
              
              <div className="space-y-3 ml-7">
                {group.settings.map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <label htmlFor={setting.key} className="text-sm font-medium cursor-pointer">
                        {setting.label}
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {setting.description}
                      </p>
                    </div>
                    <Switch
                      id={setting.key}
                      checked={settings[setting.key]}
                      onCheckedChange={() => handleSettingChange(setting.key)}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Notification Summary</h4>
          <p className="text-sm text-muted-foreground">
            You have{' '}
            <span className="font-medium">
              {Object.values(settings).filter(Boolean).length} of {Object.keys(settings).length}
            </span>{' '}
            notification types enabled.
          </p>
        </div>
      </div>
    );
  },
};

// Property Features Management
export const PropertyFeaturesManagement: Story = {
  render: () => {
    const [features, setFeatures] = React.useState({
      petsAllowed: false,
      smokingAllowed: false,
      furnished: true,
      utilitiesIncluded: false,
      parkingIncluded: true,
      wifiIncluded: true,
      cleaningService: false,
      conciergeService: false,
      gymAccess: true,
      poolAccess: false,
      storageUnit: true,
      balconyPatio: true,
    });

    const handleFeatureChange = (key: keyof typeof features) => {
      setFeatures(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    };

    const featureGroups = [
      {
        title: 'Living Policies',
        icon: 'i-lucide-shield',
        features: [
          {
            key: 'petsAllowed' as const,
            label: 'Pets Allowed',
            description: 'Tenants can have cats, dogs, or other pets',
            icon: '🐕',
          },
          {
            key: 'smokingAllowed' as const,
            label: 'Smoking Allowed',
            description: 'Smoking is permitted in the unit',
            icon: '🚭',
          },
        ],
      },
      {
        title: 'Included Services',
        icon: 'i-lucide-zap',
        features: [
          {
            key: 'utilitiesIncluded' as const,
            label: 'Utilities Included',
            description: 'Electricity, gas, water included in rent',
            icon: '⚡',
          },
          {
            key: 'wifiIncluded' as const,
            label: 'Wi-Fi Included',
            description: 'High-speed internet included',
            icon: '📶',
          },
          {
            key: 'cleaningService' as const,
            label: 'Cleaning Service',
            description: 'Regular housekeeping service provided',
            icon: '🧹',
          },
          {
            key: 'conciergeService' as const,
            label: 'Concierge Service',
            description: '24/7 concierge and doorman service',
            icon: '🎩',
          },
        ],
      },
      {
        title: 'Property Features',
        icon: 'i-lucide-wifi',
        features: [
          {
            key: 'furnished' as const,
            label: 'Furnished',
            description: 'Unit comes fully furnished with furniture',
            icon: '🛋️',
          },
          {
            key: 'parkingIncluded' as const,
            label: 'Parking Included',
            description: 'Dedicated parking space included',
            icon: '🚗',
          },
          {
            key: 'storageUnit' as const,
            label: 'Storage Unit',
            description: 'Additional storage space available',
            icon: '📦',
          },
          {
            key: 'balconyPatio' as const,
            label: 'Balcony/Patio',
            description: 'Private outdoor space available',
            icon: '🏞️',
          },
        ],
      },
      {
        title: 'Building Amenities',
        icon: 'i-lucide-shield',
        features: [
          {
            key: 'gymAccess' as const,
            label: 'Gym Access',
            description: 'Access to building fitness center',
            icon: '💪',
          },
          {
            key: 'poolAccess' as const,
            label: 'Pool Access',
            description: 'Access to swimming pool and deck',
            icon: '🏊',
          },
        ],
      },
    ];

    return (
      <div className="space-y-8 w-full max-w-2xl">
        <div className="text-center">
          <div className="i-lucide-shield mx-auto h-8 w-8 text-primary mb-2" />
          <h3 className="text-lg font-semibold">Property Features & Amenities</h3>
          <p className="text-sm text-muted-foreground">
            Configure what's included with this property
          </p>
        </div>

        {featureGroups.map((group) => {
          const IconComponent = group.icon;
          
          return (
            <div key={group.title} className="space-y-4">
              <div className="flex items-center gap-2">
                <IconComponent className="h-5 w-5 text-primary" />
                <h4 className="text-md font-medium">{group.title}</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-7">
                {group.features.map((feature) => (
                  <div
                    key={feature.key}
                    className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                      features[feature.key] ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2 flex-1">
                      <span className="text-lg">{feature.icon}</span>
                      <div>
                        <label htmlFor={feature.key} className="text-sm font-medium cursor-pointer">
                          {feature.label}
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      id={feature.key}
                      checked={features[feature.key]}
                      onCheckedChange={() => handleFeatureChange(feature.key)}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Feature Summary</h4>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">
              {Object.values(features).filter(Boolean).length} features
            </span>{' '}
            are currently enabled for this property.
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(features)
              .filter(([_, enabled]) => enabled)
              .map(([key, _]) => {
                const labels = {
                  petsAllowed: 'Pets OK',
                  smokingAllowed: 'Smoking OK',
                  furnished: 'Furnished',
                  utilitiesIncluded: 'Utilities',
                  parkingIncluded: 'Parking',
                  wifiIncluded: 'Wi-Fi',
                  cleaningService: 'Cleaning',
                  conciergeService: 'Concierge',
                  gymAccess: 'Gym',
                  poolAccess: 'Pool',
                  storageUnit: 'Storage',
                  balconyPatio: 'Balcony',
                };
                return (
                  <span
                    key={key}
                    className="inline-block px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                  >
                    {labels[key as keyof typeof labels]}
                  </span>
                );
              })
            }
          </div>
        </div>
      </div>
    );
  },
};

// User Privacy Settings
export const PrivacySettings: Story = {
  render: () => {
    const [privacy, setPrivacy] = React.useState({
      profileVisible: true,
      contactInfoVisible: false,
      showOnlineStatus: true,
      shareActivityData: false,
      allowDataCollection: false,
      enableTracking: false,
      shareWithThirdParties: false,
      showInDirectory: true,
      allowMessages: true,
      publicProfile: false,
    });

    const handlePrivacyChange = (key: keyof typeof privacy) => {
      setPrivacy(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    };

    const privacyGroups = [
      {
        title: 'Profile Visibility',
        icon: 'i-lucide-eye',
        description: 'Control who can see your profile and information',
        settings: [
          {
            key: 'profileVisible' as const,
            label: 'Profile Visible to Others',
            description: 'Other tenants and landlords can view your profile',
            level: 'medium',
          },
          {
            key: 'contactInfoVisible' as const,
            label: 'Contact Info Visible',
            description: 'Phone number and email visible to property managers',
            level: 'high',
          },
          {
            key: 'showOnlineStatus' as const,
            label: 'Show Online Status',
            description: 'Display when you\'re active on the platform',
            level: 'low',
          },
          {
            key: 'showInDirectory' as const,
            label: 'Include in Tenant Directory',
            description: 'Appear in building\'s tenant directory',
            level: 'medium',
          },
        ],
      },
      {
        title: 'Data & Privacy',
        icon: 'i-lucide-lock',
        description: 'Manage your data collection and sharing preferences',
        settings: [
          {
            key: 'shareActivityData' as const,
            label: 'Share Activity Data',
            description: 'Help improve the platform by sharing usage analytics',
            level: 'low',
          },
          {
            key: 'allowDataCollection' as const,
            label: 'Allow Data Collection',
            description: 'Collect data to personalize your experience',
            level: 'medium',
          },
          {
            key: 'enableTracking' as const,
            label: 'Enable Usage Tracking',
            description: 'Track how you use features for improvement',
            level: 'medium',
          },
          {
            key: 'shareWithThirdParties' as const,
            label: 'Share with Third Parties',
            description: 'Allow sharing anonymized data with partners',
            level: 'high',
          },
        ],
      },
      {
        title: 'Communication',
        icon: 'i-lucide-bell',
        description: 'Control how others can contact you',
        settings: [
          {
            key: 'allowMessages' as const,
            label: 'Allow Direct Messages',
            description: 'Other users can send you direct messages',
            level: 'low',
          },
          {
            key: 'publicProfile' as const,
            label: 'Public Profile',
            description: 'Your profile is visible to anyone, even non-users',
            level: 'high',
          },
        ],
      },
    ];

    const getPrivacyLevelColor = (level: string) => {
      switch (level) {
        case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900';
        case 'medium': return 'text-orange-600 bg-orange-100 dark:bg-orange-900';
        case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900';
        default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900';
      }
    };

    return (
      <div className="space-y-8 w-full max-w-2xl">
        <div className="text-center">
          <div className="i-lucide-lock mx-auto h-8 w-8 text-primary mb-2" />
          <h3 className="text-lg font-semibold">Privacy & Data Settings</h3>
          <p className="text-sm text-muted-foreground">
            Control your privacy and data sharing preferences
          </p>
        </div>

        {privacyGroups.map((group) => {
          return (
            <div key={group.title} className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`${group.icon} h-5 w-5 text-primary`} />
                  <h4 className="text-md font-medium">{group.title}</h4>
                </div>
                <p className="text-sm text-muted-foreground ml-7">{group.description}</p>
              </div>
              
              <div className="space-y-3 ml-7">
                {group.settings.map((setting) => (
                  <div key={setting.key} className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <label htmlFor={setting.key} className="text-sm font-medium cursor-pointer">
                          {setting.label}
                        </label>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getPrivacyLevelColor(setting.level)}`}>
                          {setting.level} risk
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {setting.description}
                      </p>
                    </div>
                    <Switch
                      id={setting.key}
                      checked={privacy[setting.key]}
                      onCheckedChange={() => handlePrivacyChange(setting.key)}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="p-4 border rounded-lg">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <div className="i-lucide-shield h-4 w-4" />
            Privacy Score
          </h4>
          {(() => {
            const enabledSettings = Object.values(privacy).filter(Boolean).length;
            const totalSettings = Object.keys(privacy).length;
            const privacyScore = Math.round(((totalSettings - enabledSettings) / totalSettings) * 100);
            
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Privacy Level</span>
                  <span className={`text-sm font-medium ${
                    privacyScore >= 70 ? 'text-green-600' :
                    privacyScore >= 40 ? 'text-orange-600' : 'text-red-600'
                  }`}>
                    {privacyScore}% Private
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      privacyScore >= 70 ? 'bg-green-500' :
                      privacyScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${privacyScore}%` }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {enabledSettings} of {totalSettings} data sharing options enabled
                </p>
              </div>
            );
          })()}
        </div>
      </div>
    );
  },
};

// Application Settings
export const ApplicationSettings: Story = {
  render: () => {
    const [settings, setSettings] = React.useState({
      darkMode: false,
      autoSave: true,
      soundEffects: true,
      animations: true,
      desktopNotifications: false,
      emailDigest: true,
      autoLogout: false,
      compactView: false,
      highContrast: false,
      reduceMotion: false,
    });

    const handleSettingChange = (key: keyof typeof settings) => {
      setSettings(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    };

    const settingGroups = [
      {
        title: 'Appearance',
        icon: settings.darkMode ? 'i-lucide-moon' : 'i-lucide-sun',
        settings: [
          {
            key: 'darkMode' as const,
            label: 'Dark Mode',
            description: 'Use dark theme for better viewing in low light',
            icon: settings.darkMode ? 'i-lucide-moon' : 'i-lucide-sun',
          },
          {
            key: 'compactView' as const,
            label: 'Compact View',
            description: 'Show more content by reducing spacing',
            icon: 'i-lucide-eye',
          },
          {
            key: 'highContrast' as const,
            label: 'High Contrast',
            description: 'Increase contrast for better readability',
            icon: 'i-lucide-eye',
          },
        ],
      },
      {
        title: 'Behavior',
        icon: 'i-lucide-zap',
        settings: [
          {
            key: 'autoSave' as const,
            label: 'Auto-save',
            description: 'Automatically save your work as you type',
            icon: 'i-lucide-zap',
          },
          {
            key: 'autoLogout' as const,
            label: 'Auto-logout',
            description: 'Automatically log out after 30 minutes of inactivity',
            icon: 'i-lucide-lock',
          },
        ],
      },
      {
        title: 'Audio & Visual',
        icon: settings.soundEffects ? 'i-lucide-volume-2' : 'i-lucide-volume-x',
        settings: [
          {
            key: 'soundEffects' as const,
            label: 'Sound Effects',
            description: 'Play sounds for notifications and interactions',
            icon: settings.soundEffects ? 'i-lucide-volume-2' : 'i-lucide-volume-x',
          },
          {
            key: 'animations' as const,
            label: 'Animations',
            description: 'Enable smooth transitions and animations',
            icon: 'i-lucide-zap',
          },
          {
            key: 'reduceMotion' as const,
            label: 'Reduce Motion',
            description: 'Minimize animations for motion sensitivity',
            icon: 'i-lucide-eye',
          },
        ],
      },
      {
        title: 'Notifications',
        icon: 'i-lucide-bell',
        settings: [
          {
            key: 'desktopNotifications' as const,
            label: 'Desktop Notifications',
            description: 'Show browser notifications for important updates',
            icon: 'i-lucide-bell',
          },
          {
            key: 'emailDigest' as const,
            label: 'Email Digest',
            description: 'Receive weekly summary emails',
            icon: 'i-lucide-bell',
          },
        ],
      },
    ];

    return (
      <div className="space-y-8 w-full max-w-2xl">
        <div className="text-center">
          <div className="i-lucide-zap mx-auto h-8 w-8 text-primary mb-2" />
          <h3 className="text-lg font-semibold">Application Settings</h3>
          <p className="text-sm text-muted-foreground">
            Customize your TenantFlow experience
          </p>
        </div>

        {settingGroups.map((group) => {
          return (
            <div key={group.title} className="space-y-4">
              <div className="flex items-center gap-2">
                <div className={`${group.icon} h-5 w-5 text-primary`} />
                <h4 className="text-md font-medium">{group.title}</h4>
              </div>
              
              <div className="space-y-3 ml-7">
                {group.settings.map((setting) => {
                  return (
                    <div key={setting.key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`${setting.icon} h-4 w-4 text-muted-foreground`} />
                        <div>
                          <label htmlFor={setting.key} className="text-sm font-medium cursor-pointer">
                            {setting.label}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {setting.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        id={setting.key}
                        checked={settings[setting.key]}
                        onCheckedChange={() => handleSettingChange(setting.key)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Settings Summary</h4>
          <p className="text-sm text-muted-foreground">
            You have{' '}
            <span className="font-medium">
              {Object.values(settings).filter(Boolean).length} of {Object.keys(settings).length}
            </span>{' '}
            optional features enabled.
          </p>
        </div>
      </div>
    );
  },
};

// Validation & Error States
export const ValidationStates: Story = {
  render: () => (
    <div className="space-y-8 w-96">
      <div>
        <h3 className="text-lg font-semibold mb-4">Valid Settings</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
            <div>
              <label htmlFor="valid-switch" className="text-sm font-medium cursor-pointer">
                Email Notifications
              </label>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                ✓ Successfully enabled
              </p>
            </div>
            <Switch id="valid-switch" defaultChecked />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Settings with Warnings</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800">
            <div>
              <label htmlFor="warning-switch" className="text-sm font-medium cursor-pointer">
                Data Sharing
              </label>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                ⚠ May affect privacy
              </p>
            </div>
            <Switch id="warning-switch" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Disabled Settings</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg opacity-50">
            <div>
              <label htmlFor="disabled-switch" className="text-sm font-medium">
                Premium Feature
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Upgrade required to access this feature
              </p>
            </div>
            <Switch id="disabled-switch" disabled />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg opacity-50">
            <div>
              <label htmlFor="disabled-on" className="text-sm font-medium">
                System Setting (On)
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                This setting is managed by your administrator
              </p>
            </div>
            <Switch id="disabled-on" disabled defaultChecked />
          </div>
        </div>
      </div>
    </div>
  ),
};

// Accessibility Demonstration
export const AccessibilityDemo: Story = {
  render: () => (
    <div className="space-y-6 w-96">
      <h3 className="text-lg font-semibold">Accessibility Features</h3>
      <p className="text-sm text-muted-foreground">
        All switches include proper ARIA labels, keyboard navigation, and screen reader support.
      </p>
      
      <div className="space-y-4">
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium mb-3">
            Accessibility Settings
          </legend>
          
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <label htmlFor="screen-reader" className="text-sm font-medium cursor-pointer">
                Screen Reader Optimization
              </label>
              <p className="text-xs text-muted-foreground mt-1" id="screen-reader-help">
                Optimize interface for screen reader users
              </p>
            </div>
            <Switch 
              id="screen-reader"
              aria-describedby="screen-reader-help"
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <label htmlFor="keyboard-nav" className="text-sm font-medium cursor-pointer">
                Enhanced Keyboard Navigation
              </label>
              <p className="text-xs text-muted-foreground mt-1" id="keyboard-nav-help">
                Show focus indicators and keyboard shortcuts
              </p>
            </div>
            <Switch 
              id="keyboard-nav"
              aria-describedby="keyboard-nav-help"
              defaultChecked
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <label htmlFor="announcements" className="text-sm font-medium cursor-pointer">
                Status Announcements
              </label>
              <p className="text-xs text-muted-foreground mt-1" id="announcements-help">
                Announce important changes to screen readers
              </p>
            </div>
            <Switch 
              id="announcements"
              aria-describedby="announcements-help"
              defaultChecked
            />
          </div>
        </fieldset>

        <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded">
          <p><strong>Keyboard navigation:</strong> Use Tab to focus, Space or Enter to toggle</p>
          <p><strong>Screen readers:</strong> Each switch announces its current state and purpose</p>
          <p><strong>ARIA support:</strong> Proper labels and descriptions for all switches</p>
        </div>
      </div>
    </div>
  ),
};

// Interactive Playground
export const Playground: Story = {
  args: {
    checked: false,
    disabled: false,
  },
  render: (args) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label htmlFor="playground-switch" className="text-sm font-medium">
          Interactive Playground Switch
        </label>
        <Switch id="playground-switch" {...args} />
      </div>
      <p className="text-xs text-muted-foreground">
        Use the controls to adjust the switch properties.
      </p>
    </div>
  ),
};
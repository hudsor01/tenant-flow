import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming/create';

const theme = create({
  base: 'light',
  brandTitle: 'TenantFlow Design System',
  brandUrl: 'https://tenantflow.app',
  brandImage: '/tenant-flow-logo.png',
  brandTarget: '_self',

  // UI
  appBg: '#f9fafb',
  appContentBg: '#ffffff',
  appPreviewBg: '#ffffff',
  appBorderColor: '#e5e7eb',
  appBorderRadius: 8,

  // Text colors
  textColor: '#111827',
  textInverseColor: '#ffffff',
  textMutedColor: '#6b7280',

  // Toolbar default and active colors
  barTextColor: '#6b7280',
  barSelectedColor: '#2563eb',
  barHoverColor: '#2563eb',
  barBg: '#ffffff',

  // Form colors
  inputBg: '#ffffff',
  inputBorder: '#d1d5db',
  inputTextColor: '#111827',
  inputBorderRadius: 6,

  // Brand colors
  colorPrimary: '#2563eb',
  colorSecondary: '#3b82f6',
});

addons.setConfig({
  theme,
  showToolbar: true,
  showPanel: true,
  panelPosition: 'bottom',
  enableShortcuts: true,
  showNav: true,
  sidebarAnimations: true,
  sidebar: {
    showRoots: true,
    collapsedRoots: ['other'],
  },
  toolbar: {
    title: { hidden: false },
    zoom: { hidden: false },
    eject: { hidden: false },
    copy: { hidden: false },
    fullscreen: { hidden: false },
  },
});
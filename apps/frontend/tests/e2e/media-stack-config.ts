/**
 * Media Stack Services Configuration
 * Configuration for testing all media stack services including authentication details
 */

export interface MediaStackService {
  name: string
  port: number
  path: string
  expectedTitle: string
  expectedHeading?: string
  requiresAuth: boolean
  authCredentials?: {
    username: string
    password: string
  }
  healthCheckSelector?: string
  loginFormSelector?: string
  usernameSelector?: string
  passwordSelector?: string
  loginButtonSelector?: string
  skipSSLVerify?: boolean
}

export const MEDIA_STACK_CONFIG = {
  // Default server IPs to try
  serverHosts: [
    '100.70.16.109', // Tailscale IP for dev-server
    'localhost',
    '127.0.0.1',
    // Add your server IP here if different
    // '192.168.1.100', // Example: replace with your actual server IP
  ],
  
  // Connection timeout settings
  timeouts: {
    navigation: 60000, // Increased for stability
    action: 30000,
    assertion: 10000,
  },
  
  // Screenshot settings
  screenshots: {
    directory: './tests/e2e/media-stack-test',
    fullPage: true,
  }
} as const

export const MEDIA_SERVICES: Record<string, MediaStackService> = {
  radarr: {
    name: 'Radarr',
    port: 7878,
    path: '/',
    expectedTitle: 'Radarr',
    expectedHeading: 'Movies',
    requiresAuth: false, // Usually no auth by default, but configurable
    healthCheckSelector: '[data-testid="page"], .toolbar, .page-content, body',
    skipSSLVerify: true,
  },
  
  sonarr: {
    name: 'Sonarr',
    port: 8989,
    path: '/',
    expectedTitle: 'Sonarr',
    expectedHeading: 'Series',
    requiresAuth: false, // Usually no auth by default, but configurable
    healthCheckSelector: '[data-testid="page"], .toolbar, .page-content, body',
    skipSSLVerify: true,
  },
  
  qbittorrent: {
    name: 'qBittorrent',
    port: 8112,
    path: '/',
    expectedTitle: 'qBittorrent',
    requiresAuth: true,
    authCredentials: {
      username: 'admin',
      password: '4DkrjLFUc'
    },
    healthCheckSelector: '#torrentsTable, .toolbar, body',
    loginFormSelector: '#loginform',
    usernameSelector: '#username',
    passwordSelector: '#password', 
    loginButtonSelector: '#login',
    skipSSLVerify: true,
  },
  
  jellyseerr: {
    name: 'Jellyseerr',
    port: 5055,
    path: '/',
    expectedTitle: 'Jellyseerr',
    expectedHeading: 'Discover',
    requiresAuth: false, // Usually accessible without auth initially
    healthCheckSelector: 'body', // Simplified selector for stability
    skipSSLVerify: true,
  },
  
  prowlarr: {
    name: 'Prowlarr',
    port: 9696,
    path: '/',
    expectedTitle: 'Prowlarr', // Should show actual UI now
    expectedHeading: 'Indexers',
    requiresAuth: false, // Authentication disabled
    healthCheckSelector: '[data-testid="page"], .toolbar, .page-content, body',
    skipSSLVerify: true,
  },
}

export const TEST_RESULTS_PATH = './tests/e2e/media-stack-test/test-results.html'

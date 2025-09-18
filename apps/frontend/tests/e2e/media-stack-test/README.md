# Media Stack Services Testing

This directory contains comprehensive Playwright tests for verifying the health and accessibility of all media stack services.

## Services Tested

- **Radarr** (port 7878) - Movie management
- **Sonarr** (port 8989) - TV series management  
- **qBittorrent** (port 8112) - BitTorrent client
- **Jellyseerr** (port 5055) - Media request management
- **Prowlarr** (port 9696) - Indexer management

## Features

✅ **Multi-host testing** - Tests localhost, 127.0.0.1, and custom IPs  
✅ **Authentication handling** - Automatically handles login where required  
✅ **Visual verification** - Takes screenshots of each service UI  
✅ **Error detection** - Identifies and reports UI errors  
✅ **Comprehensive reporting** - Generates HTML and JSON reports  
✅ **Flexible configuration** - Easy to customize service settings  

## Quick Start

### Run Tests

```bash
# Run comprehensive test (recommended)
npm run test:media-stack

# Run all individual service tests
npm run test:media-stack:all

# Or run directly with Playwright
npx playwright test media-stack-services.spec.ts --project=chromium-no-auth
```

### View Results

After running tests, check these files:

- **HTML Report**: `./tests/e2e/media-stack-test/media-stack-report.html`
- **JSON Results**: `./tests/e2e/media-stack-test/media-stack-results.json`
- **Screenshots**: `./tests/e2e/media-stack-test/*.png`

## Configuration

### Custom Server IP

Edit `/tests/e2e/media-stack-config.ts` to add your server IP:

```typescript
export const MEDIA_STACK_CONFIG = {
  serverHosts: [
    'localhost',
    '127.0.0.1',
    '192.168.1.100', // Add your server IP here
  ],
  // ...
}
```

### Service Authentication

Update authentication credentials in the config file:

```typescript
export const MEDIA_SERVICES = {
  qbittorrent: {
    // ...
    authCredentials: {
      username: 'admin',
      password: 'your-password' // Update this
    },
    // ...
  },
}
```

## Test Architecture

### Files Structure

```
media-stack-test/
├── README.md                     # This file
├── media-stack-config.ts         # Service configurations
├── media-stack-pages.ts          # Page object models
├── media-stack-utils.ts          # Test utilities
├── media-stack-services.spec.ts  # Main test suite
├── run-media-stack-tests.sh      # Test runner script
└── [generated files]             # Screenshots, reports
```

### Test Flow

1. **Discovery**: Tests each configured host to find accessible services
2. **Navigation**: Opens each service's main page
3. **Authentication**: Handles login if required
4. **Verification**: Checks page title, content, and error states
5. **Screenshot**: Captures visual proof of accessibility
6. **Reporting**: Generates comprehensive HTML and JSON reports

## Troubleshooting

### Common Issues

**Service not accessible**
- Verify the service is running on the expected port
- Check firewall settings
- Ensure correct IP address in configuration

**Authentication failures**
- Verify credentials in config file
- Check if service has authentication enabled
- Some services may require initial setup

**Screenshot failures**
- Usually non-critical, test will continue
- Check browser permissions and disk space

### Debug Mode

For detailed debugging, run with verbose output:

```bash
npx playwright test media-stack-services.spec.ts --project=chromium-no-auth --headed --debug
```

## Customization

### Adding New Services

1. Add service configuration to `MEDIA_SERVICES` in `media-stack-config.ts`
2. Create specialized page class in `media-stack-pages.ts` (if needed)
3. Add test case in `media-stack-services.spec.ts`

### Modifying Test Behavior

- **Timeouts**: Adjust in `media-stack-config.ts`
- **Screenshots**: Configure quality and path settings
- **Error Detection**: Add custom error selectors for specific services
- **Authentication**: Customize login flows per service

## CI/CD Integration

Include in your pipeline:

```yaml
- name: Test Media Stack Services
  run: npm run test:media-stack
  continue-on-error: true  # Don't fail build if media services are down
```

The tests are designed to be informational and won't fail your build if services are temporarily unavailable.

## Report Features

The HTML report includes:

- 📊 **Dashboard** with success rates and statistics
- 🖼️ **Screenshots** embedded for visual verification  
- ❌ **Error details** with specific failure reasons
- 📈 **Response times** for performance monitoring
- 🔍 **Service details** including URLs and authentication status

Open `media-stack-report.html` in any browser to view the full report.
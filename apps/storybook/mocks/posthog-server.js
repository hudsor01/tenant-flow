// Mock for PostHog server-side analytics in Storybook
// This prevents Node.js module import errors in the browser

export const captureServerEvent = (event, properties) => {
  // Mock server-side PostHog event capture for Storybook
  console.log('Mock captureServerEvent called:', { event, properties });
  return Promise.resolve({ success: true });
};

export const identifyServerUser = (userId, properties) => {
  // Mock server-side PostHog user identification for Storybook
  console.log('Mock identifyServerUser called:', { userId, properties });
  return Promise.resolve({ success: true });
};

// Default export mock
const mockPostHogServer = {
  capture: captureServerEvent,
  identify: identifyServerUser,
  shutdown: () => Promise.resolve()
};

export default mockPostHogServer;
// Mock for server-side auth actions in Storybook
// These are browser-safe mocks that prevent Node.js module import errors

export const signInWithEmailAndPassword = async (prevState, formData) => {
  // Mock successful login for Storybook
  console.log('Mock signInWithEmailAndPassword called with:', formData);
  return {
    success: true,
    message: 'Mock login successful',
    user: {
      id: 'mock-user-id',
      email: 'demo@tenantflow.com',
      role: 'landlord'
    }
  };
};

export const signUpWithEmailAndPassword = async (prevState, formData) => {
  // Mock successful signup for Storybook
  console.log('Mock signUpWithEmailAndPassword called with:', formData);
  return {
    success: true,
    message: 'Mock signup successful',
    user: {
      id: 'mock-user-id',
      email: 'demo@tenantflow.com',
      role: 'tenant'
    }
  };
};

export const signOut = async () => {
  // Mock signout for Storybook
  console.log('Mock signOut called');
  return {
    success: true,
    message: 'Mock logout successful'
  };
};

export const resetPassword = async (prevState, formData) => {
  // Mock password reset for Storybook
  console.log('Mock resetPassword called with:', formData);
  return {
    success: true,
    message: 'Mock password reset email sent'
  };
};

export const updateProfile = async (prevState, formData) => {
  // Mock profile update for Storybook
  console.log('Mock updateProfile called with:', formData);
  return {
    success: true,
    message: 'Mock profile updated successfully'
  };
};
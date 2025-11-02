// jest.setup.js
// Note: Use jest.useFakeTimers() in individual tests if needed
// Don't use it globally as it conflicts with @testing-library/react-native

// Minimal Intl mock for RN/jest if needed
if (!global.Intl || !global.Intl.DateTimeFormat) {
  global.Intl = {
    DateTimeFormat: function () {
      return { format: () => 'November 2025' };
    },
  };
}

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock environment variables for tests
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock expo-router hooks
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSegments: () => [],
  useSearchParams: () => ({}),
}));
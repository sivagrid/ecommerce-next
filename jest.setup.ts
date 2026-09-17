import '@testing-library/jest-dom';

// Required for JWT auth tests
process.env.JWT_ACCESS_SECRET  = 'test-access-secret-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-characters-long';
process.env.NODE_ENV = 'test';

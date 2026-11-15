/**
 * Framework-free ESM entry point of the portable account kit.
 *
 * This barrel is deliberately independent of React, Next.js, the DOM and any
 * project-specific API client. Importing it in `node:test` requires no
 * bundler, no jsdom and no additional package.
 */

export * from './capabilities.mjs';
export * from './providers.mjs';
export * from './session.mjs';
export * from './otp-format.mjs';
export * from './otp-qr.mjs';

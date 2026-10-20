/** @type {import('next').NextConfig} */

// Security headers for the sandbox deployment.
// CSP keeps everything first-party: no third-party ad scripts, no analytics, no remote frames.
const isDev = process.env.NODE_ENV !== 'production';

// `wasm-unsafe-eval` is required by the self-hosted Tesseract OCR engine.
// It permits WebAssembly compilation only; it does not re-enable JS eval.
const scriptSrc = isDev
  ? "'self' 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval'"
  : "'self' 'unsafe-inline' 'wasm-unsafe-eval'";

const csp = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' blob:",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Camera is requested only after the user taps the receipt scanner; no
  // background capture and no upload of the image (OCR runs in-memory).
  { key: 'Permissions-Policy', value: 'geolocation=(), camera=(self), microphone=(self)' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  // We are a web sandbox; no third-party ad or tracking scripts are loaded anywhere.
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The OCR engine runs only in the browser (dynamic import). Keep its large
  // core/wasm assets out of the serverless output-file trace.
  experimental: {
    outputFileTracingExcludes: {
      '*': ['node_modules/tesseract.js/**', 'node_modules/tesseract.js-core/**'],
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

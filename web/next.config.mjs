import path from 'path'
import { fileURLToPath } from 'url'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
// Turbopack resolveAlias must be project-relative (absolute paths get a bogus `./` prefix).
const farcasterMiniAppSolanaStub = './lib/stubs/farcaster-mini-app-solana.js'
const farcasterMiniAppSolanaStubAbsolute = path.join(
  projectRoot,
  'lib/stubs/farcaster-mini-app-solana.js',
)

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Pin root so Turbopack resolves node_modules/next under pnpm (avoids HMR panics)
    root: projectRoot,
    resolveAlias: {
      // Relative path — Turbopack on Windows cannot resolve absolute paths yet
      '@farcaster/mini-app-solana': './lib/stubs/farcaster-mini-app-solana.js',
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@farcaster/mini-app-solana': farcasterMiniAppSolanaStubAbsolute,
    }
    return config
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig

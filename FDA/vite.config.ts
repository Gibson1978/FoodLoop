// vite.config.ts (CLEANED FINAL CONFIGURATION)

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// --- CONFIGURATION FLAGS ---
// This flag is now ONLY for logging purposes, but you can keep it to confirm your build environment.
const isMobileBuild = process.env.VITE_PLATFORM === 'mobile';
console.log(`Building for platform: ${isMobileBuild ? 'MOBILE' : 'WEB'}`);


export default defineConfig({
  plugins: [react()],
  
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      // Your existing aliases (keeping them ensures resolution stability for these libraries)
      'vaul@1.1.2': path.resolve(__dirname, 'node_modules/vaul'),
      'sonner@2.0.3': path.resolve(__dirname, 'node_modules/sonner'),
      'recharts@2.15.2': path.resolve(__dirname, 'node_modules/recharts'),
      'react-resizable-panels@2.1.7': path.resolve(__dirname, 'node_modules/react-resizable-panels'),
      'react-hook-form@7.55.0': path.resolve(__dirname, 'node_modules/react-hook-form'),
      'react-day-picker@8.10.1': path.resolve(__dirname, 'node_modules/react-day-picker'),
      'next-themes@0.4.6': path.resolve(__dirname, 'node_modules/next-themes'),
      'lucide-react@0.487.0': path.resolve(__dirname, 'node_modules/lucide-react'),
      'input-otp@1.4.2': path.resolve(__dirname, 'node_modules/input-otp'),
      'embla-carousel-react@8.6.0': path.resolve(__dirname, 'node_modules/embla-carousel-react'),
      'cmdk@1.1.1': path.resolve(__dirname, 'node_modules/cmdk'),
      'class-variance-authority@0.7.1': path.resolve(__dirname, 'node_modules/class-variance-authority'),
      '@radix-ui/react-tooltip@1.1.8': path.resolve(__dirname, 'node_modules/@radix-ui/react-tooltip'),
      '@radix-ui/react-toggle@1.1.2': path.resolve(__dirname, 'node_modules/@radix-ui/react-toggle'),
      '@radix-ui/react-toggle-group@1.1.2': path.resolve(__dirname, 'node_modules/@radix-ui/react-toggle-group'),
      '@radix-ui/react-tabs@1.1.3': path.resolve(__dirname, 'node_modules/@radix-ui/react-tabs'),
      '@radix-ui/react-switch@1.1.3': path.resolve(__dirname, 'node_modules/@radix-ui/react-switch'),
      '@radix-ui/react-slot@1.1.2': path.resolve(__dirname, 'node_modules/@radix-ui/react-slot'),
      '@radix-ui/react-slider@1.2.3': path.resolve(__dirname, 'node_modules/@radix-ui/react-slider'),
      '@radix-ui/react-separator@1.1.2': path.resolve(__dirname, 'node_modules/@radix-ui/react-separator'),
      '@radix-ui/react-select@2.1.6': path.resolve(__dirname, 'node_modules/@radix-ui/react-select'),
      '@radix-ui/react-scroll-area@1.2.3': path.resolve(__dirname, 'node_modules/@radix-ui/react-scroll-area'),
      '@radix-ui/react-radio-group@1.2.3': path.resolve(__dirname, 'node_modules/@radix-ui/react-radio-group'),
      '@radix-ui/react-progress@1.1.2': path.resolve(__dirname, 'node_modules/@radix-ui/react-progress'),
      '@radix-ui/react-popover@1.1.6': path.resolve(__dirname, 'node_modules/@radix-ui/react-popover'),
      '@radix-ui/react-navigation-menu@1.2.5': path.resolve(__dirname, 'node_modules/@radix-ui/react-navigation-menu'),
      '@radix-ui/react-menubar@1.1.6': path.resolve(__dirname, 'node_modules/@radix-ui/react-menubar'),
      '@radix-ui/react-label@2.1.2': path.resolve(__dirname, 'node_modules/@radix-ui/react-label'),
      '@radix-ui/react-hover-card@1.1.6': path.resolve(__dirname, 'node_modules/@radix-ui/react-hover-card'),
      '@radix-ui/react-dropdown-menu@2.1.6': path.resolve(__dirname, 'node_modules/@radix-ui/react-dropdown-menu'),
      '@radix-ui/react-dialog@1.1.6': path.resolve(__dirname, 'node_modules/@radix-ui/react-dialog'),
      '@radix-ui/react-context-menu@2.2.6': path.resolve(__dirname, 'node_modules/@radix-ui/react-context-menu'),
      '@radix-ui/react-collapsible@1.1.3': path.resolve(__dirname, 'node_modules/@radix-ui/react-collapsible'),
      '@radix-ui/react-checkbox@1.1.4': path.resolve(__dirname, 'node_modules/@radix-ui/react-checkbox'),
      '@radix-ui/react-avatar@1.1.3': path.resolve(__dirname, 'node_modules/@radix-ui/react-avatar'),
      '@radix-ui/react-aspect-ratio@1.1.2': path.resolve(__dirname, 'node_modules/@radix-ui/react-aspect-ratio'),
      '@radix-ui/react-alert-dialog@1.1.6': path.resolve(__dirname, 'node_modules/@radix-ui/react-alert-dialog'),
      '@radix-ui/react-accordion@1.2.3': path.resolve(__dirname, 'node_modules/@radix-ui/react-accordion'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'build',
  },
  server: {
    port: 3000,
    open: true,
  },
});
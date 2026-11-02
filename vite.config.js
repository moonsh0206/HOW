import { defineConfig } from 'vite';
import { pagesBase } from './scripts/pages-base.js';

export default defineConfig(({ command, isPreview }) => ({
  base: pagesBase(process.env.VITE_BASE_PATH ?? (command === 'serve' && !isPreview ? '/' : '/HOW/')),
}));

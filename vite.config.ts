import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  const useProxy = env.VITE_USE_PROXY === 'true';

  console.log('Vite Proxy Configuration:', {
    useProxy,
    mode,
    VITE_USE_PROXY: env.VITE_USE_PROXY,
  });

  return {
    server: {
      host: '::',
      port: 8080,
      ...(useProxy && {
        proxy: {
          '/api': {
            target: env.VITE_BACKEND_API_URL,
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
          },
        },
      }),
    },
    plugins: [
      react(),
      // Temporarily disabled due to syntax errors
      // mode === 'development' &&
      // componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      include: ['xlsx', 'mammoth'],
    },
  };
});

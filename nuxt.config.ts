// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-09-23',
  devtools: { enabled: true },
  ssr: false,
  experimental: {
    viteEnvironmentApi: true,
  },

  modules: ['@nuxtjs/tailwindcss', '@vite-pwa/nuxt', 'nuxt-auth-utils'],

  css: ['~/assets/css/main.css'],

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.ts',
  },

  nitro: {
    preset: 'cloudflare-pages',
    prerender: {
      crawlLinks: false,
      routes: ['/sitemap.xml', '/robots.txt'],
      ignore: ['/api', '/admin'],
    },
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
    modules: ['nitro-cloudflare-dev'],
  },

  components: {
    dirs: [
      '~/components/shared',
      '~/components/customers',
      '~/components/deliveries',
      '~/components/payments',
      '~/components/reports',
      '~/components/settings',
      '~/components/stock',
      '~/components/orders',
    ],
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  runtimeConfig: {
    sessionPassword: process.env.NUXT_SESSION_PASSWORD,
    backupSecret: process.env.BACKUP_SECRET,
    public: {
      appName: 'Gas Supplier App',
    },
  },

  app: {
    head: {
      title: 'Gas Supplier App',
      viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
    },
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Gas Supplier App',
      short_name: 'GasSupplier',
      description: 'Gas cylinder supplier management',
      theme_color: '#1d100c',
      background_color: '#1d100c',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      navigateFallback: '/',
      runtimeCaching: [
        {
          urlPattern: /\/api\/customers/,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'api-customers', expiration: { maxAgeSeconds: 3600 } },
        },
        {
          urlPattern: /\/api\/products/,
          handler: 'CacheFirst',
          options: { cacheName: 'api-products', expiration: { maxAgeSeconds: 86400 } },
        },
        {
          urlPattern: /\/api\/deliveries/,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'api-deliveries', expiration: { maxAgeSeconds: 3600 } },
        },
      ],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: false,
      type: 'module',
    },
  },
})

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-09-23',
  devtools: { enabled: true },
  ssr: false,

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
    session: {
      maxAge: 60 * 60 * 24 * 365, // 1 year
    },
    public: {
      appName: 'Tuvvur Super gas',
    },
  },

  app: {
    head: {
      title: 'Tuvvur Super gas',
      viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
      meta: [
        { name: 'theme-color', content: '#1d100c' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'SuperGas' },
      ],
    },
  },

  pwa: {
    registerType: 'autoUpdate',
    injectRegister: 'auto',
    manifest: {
      name: 'SuperGas',
      short_name: 'SuperGas',
      description: 'Gas cylinder supplier management',
      theme_color: '#1d100c',
      background_color: '#1d100c',
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      start_url: '/',
      icons: [
        { src: '/logo/supergas-logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        { src: '/logo/supergas-logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
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

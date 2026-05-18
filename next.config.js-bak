/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Přesměrování na rekant.html
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/',
          destination: '/rekant.html',
        },
      ],
    };
  },

  // Bezpečnostní redirecty - blokování starých cest
  async redirects() {
    return [
      // Blokování admin/CMS cest
      {
        source: '/component/:path*',
        destination: '/rekant.html',
        permanent: true,
      },
      {
        source: '/component/users/:path*',
        destination: '/rekant.html',
        permanent: true,
      },
      {
        source: '/administrator/:path*',
        destination: '/rekant.html',
        permanent: true,
      },
      {
        source: '/index.php/:path*',
        destination: '/rekant.html',
        permanent: true,
      },
      // Starý obsah - přesměrování na katalog
      {
        source: '/kontakt/:path*',
        destination: '/rekant.html#kontakt',
        permanent: true,
      },
      {
        source: '/produkty/:path*',
        destination: '/rekant.html#katalog',
        permanent: true,
      },
      {
        source: '/sluzby-servis/:path*',
        destination: '/rekant.html',
        permanent: true,
      },
      {
        source: '/reference/:path*',
        destination: '/rekant.html',
        permanent: true,
      },
    ];
  },

  // Headers pro SEO a bezpečnost
  async headers() {
    return [
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'POST, GET, OPTIONS',
          },
        ],
      },
      // SEO meta headers pro hlavní stránku
      {
        source: '/rekant.html',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=3600',
          },
        ],
      },
    ];
  },
};
module.exports = nextConfig;

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

  // Headers pro SEO
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
    ];
  },
};

module.exports = nextConfig;

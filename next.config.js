/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/kontakt',
        destination: '/rekant.html#kontakt',
        permanent: true,
      },
      {
        source: '/kontakt/',
        destination: '/rekant.html#kontakt',
        permanent: true,
      },
      {
        source: '/sluzby-servis',
        destination: '/rekant.html',
        permanent: true,
      },
      {
        source: '/sluzby-servis/',
        destination: '/rekant.html',
        permanent: true,
      },
      {
        source: '/produkty',
        destination: '/rekant.html#katalog',
        permanent: true,
      },
      {
        source: '/produkty/',
        destination: '/rekant.html#katalog',
        permanent: true,
      },
      {
        source: '/reference',
        destination: '/rekant.html',
        permanent: true,
      },
      {
        source: '/reference/',
        destination: '/rekant.html',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
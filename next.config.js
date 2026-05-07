/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/kontakt',
        destination: '/#kontakt',
        permanent: true,
      },
      {
        source: '/kontakt/',
        destination: '/#kontakt',
        permanent: true,
      },
      {
        source: '/sluzby-servis',
        destination: '/',
        permanent: true,
      },
      {
        source: '/sluzby-servis/',
        destination: '/',
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
        destination: '/',
        permanent: true,
      },
      {
        source: '/reference/',
        destination: '/',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
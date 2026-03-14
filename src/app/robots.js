export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin'],
      },
    ],
    sitemap: 'https://www.selfpaced.com.au/sitemap.xml',
    host: 'https://www.selfpaced.com.au',
  }
}

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin'],
      },
    ],
    sitemap: 'https://exambooster.com.au/sitemap.xml',
    host: 'https://exambooster.com.au',
  }
}

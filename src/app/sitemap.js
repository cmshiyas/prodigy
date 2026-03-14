export default function sitemap() {
  const base = 'https://exambooster.com.au'
  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}

export default function sitemap() {
  const base = 'https://www.selfpaced.com.au'
  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}

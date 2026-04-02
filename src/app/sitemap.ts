// src/app/sitemap.ts
import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://nyme.app'
  const now  = new Date()

  return [
    { url: `${base}`,                           lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/partenaires`,               lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/contact`,                   lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/service-client`,            lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/politique-confidentialite`, lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/politique-application`,     lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ]
}

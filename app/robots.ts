import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/*/admin',
          '/dashboard',
          '/*/dashboard',
          '/api/',
          '/*/api/',
          '/auth/',
          '/*/auth/',
        ],
      },
      {
        userAgent: 'Google-Extended',
        allow: '/',
        disallow: [
          '/admin',
          '/*/admin',
          '/dashboard',
          '/*/dashboard',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

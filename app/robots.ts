import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://leagueflow.app';

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

import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getSiteUrl } from '@/lib/site-url';

const locales = ['th', 'en'];
const publicRoutes = [
  '',
  '/tournaments',
  '/registrations',
  '/overlay',
  '/free-overlay',
  '/privacy-policy',
  '/terms-of-service',
  '/refund-policy',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  // Base static entries for each locale
  const staticEntries: MetadataRoute.Sitemap = [];

  for (const route of publicRoutes) {
    for (const locale of locales) {
      const url = `${siteUrl}/${locale}${route}`;
      staticEntries.push({
        url,
        lastModified: now,
        changeFrequency: route === '' ? 'daily' : 'weekly',
        priority: route === '' ? 1.0 : (route === '/tournaments' || route === '/registrations') ? 0.9 : 0.7,
        alternates: {
          languages: {
            th: `${siteUrl}/th${route}`,
            en: `${siteUrl}/en${route}`,
          },
        },
      });
    }
  }

  // Attempt to fetch public tournaments for dynamic sitemap indexing
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('id, updated_at')
        .limit(100);

      if (tournaments && tournaments.length > 0) {
        for (const t of tournaments) {
          for (const locale of locales) {
            staticEntries.push({
              url: `${siteUrl}/${locale}/tournaments/${t.id}`,
              lastModified: t.updated_at ? new Date(t.updated_at) : now,
              changeFrequency: 'daily',
              priority: 0.8,
              alternates: {
                languages: {
                  th: `${siteUrl}/th/tournaments/${t.id}`,
                  en: `${siteUrl}/en/tournaments/${t.id}`,
                },
              },
            });
          }
        }
      }
    }
  } catch (e) {
    console.error('Error fetching tournaments for sitemap:', e);
  }

  return staticEntries;
}

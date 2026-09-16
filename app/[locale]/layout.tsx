import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Noto_Sans_Thai } from "next/font/google";
import "../globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { CookieBanner } from "@/components/cookies/cookie-banner";
import { PageViewTracker } from "@/hooks/use-analytics";
import { ScrollToTop } from "@/components/ui/scroll-to-top";

import { PresenceTracker } from "@/components/providers/presence-tracker";

const notoSansThai = Noto_Sans_Thai({
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  subsets: ['thai'],
  variable: '--font-noto-sans-thai',
});

import { JsonLd } from "@/components/seo/json-ld";
import { getSiteUrl } from "@/lib/site-url";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isThai = locale === 'th';
  const siteUrl = getSiteUrl();

  return {
    title: {
      default: isThai
        ? "League Flow | แพลตฟอร์มจัดการแข่งขันฟุตบอลและกีฬา สร้างตารางแข่งอัตโนมัติ"
        : "League Flow | Sports & Football Tournament Management Platform",
      template: "%s | League Flow",
    },
    description: isThai
      ? "League Flow แพลตฟอร์มจัดการแข่งขันฟุตบอลและกีฬาครบวงจร สร้างตารางแข่งอัตโนมัติ (Bracket & Round Robin) สรุปผลคะแนนสดเรียลไทม์ รับสมัครทีมพร้อมชำระเงิน PromptPay และ OBS Live Score Overlay"
      : "League Flow - All-in-one tournament management platform for football and sports. Automated bracket generator, real-time live scoring, team registration, and OBS live streaming overlays.",
    keywords: isThai
      ? [
          "จัดการแข่งขันฟุตบอล",
          "จัดการทัวร์นาเมนต์",
          "สร้างตารางแข่ง",
          "โปรแกรมการแข่งขัน",
          "ระบบจัดการลีก",
          "สมัครแข่งบอล",
          "League Flow",
          "Tournament Management",
          "Football League",
          "Match Scoring",
          "ตารางแข่งบอล",
          "สายแข่งบอล",
          "โปรแกรมจัดสายการแข่งขัน",
          "OBS Scoreboard Overlay"
        ]
      : [
          "Tournament Management",
          "Football League Management",
          "Bracket Generator",
          "Round Robin Schedule",
          "Live Match Scoring",
          "Sports Tournament Platform",
          "OBS Scoreboard Overlay",
          "League Flow"
        ],
    authors: [{ name: "League Flow", url: siteUrl }],
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: `${siteUrl}/${locale}`,
      languages: {
        th: `${siteUrl}/th`,
        en: `${siteUrl}/en`,
      },
    },
    openGraph: {
      type: "website",
      locale: isThai ? "th_TH" : "en_US",
      alternateLocale: isThai ? "en_US" : "th_TH",
      title: isThai
        ? "League Flow | แพลตฟอร์มจัดการแข่งขันฟุตบอลและกีฬามืออาชีพ"
        : "League Flow | Professional Sports Tournament Management",
      description: isThai
        ? "สร้างตารางแข่งอัตโนมัติ บันทึกผลคะแนนเรียลไทม์ และระบบสมัครทีมออนไลน์ครบวงจร"
        : "Automated bracket generation, real-time match scoring, and online team registration.",
      siteName: "League Flow",
      url: `${siteUrl}/${locale}`,
    },
    twitter: {
      card: "summary_large_image",
      title: isThai
        ? "League Flow | แพลตฟอร์มจัดการแข่งขันฟุตบอลมืออาชีพ"
        : "League Flow | Sports Tournament Management",
      description: isThai
        ? "จัดการแข่งขันฟุตบอลและกีฬาครบวงจร บันทึกผลเรียลไทม์ และระบบสมัครทีมออนไลน์"
        : "Tournament management, real-time live score, and team registration.",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: 'uZqMBYSLdlDxnlF8IB0FUtrsQ7krGX8EsN3jSuNU9kQ',
    },
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as typeof routing.locales[number])) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning className="scroll-smooth">
      <head>
        <meta name="google-site-verification" content="uZqMBYSLdlDxnlF8IB0FUtrsQ7krGX8EsN3jSuNU9kQ" />
        <JsonLd locale={locale} />
      </head>
      <body
        suppressHydrationWarning
        className={`${notoSansThai.variable} font-sans antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
            <CookieBanner />
            <PageViewTracker />
            <PresenceTracker />
            <ScrollToTop />
          </ThemeProvider>
        </NextIntlClientProvider>
        {/* Vercel Web Analytics */}
        <Analytics />
      </body>
    </html>
  );
}

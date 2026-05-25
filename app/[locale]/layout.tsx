import type { Metadata } from "next";
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

const notoSansThai = Noto_Sans_Thai({
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  subsets: ['thai'],
  variable: '--font-noto-sans-thai',
});

export const metadata: Metadata = {
  title: {
    default: "LeagueFlow | แพลตฟอร์มจัดการแข่งขันฟุตบอลมืออาชีพ",
    template: "%s | LeagueFlow",
  },
  description: "LeagueFlow - แพลตฟอร์มจัดการแข่งขันฟุตบอลและกีฬาครบวงจร ช่วยให้คุณสร้างตารางแข่งอัตโนมัติ บันทึกผลคะแนนเรียลไทม์ จัดการทีม และระบบชำระเงิน PromptPay รองรับทั้งภาษาไทยและอังกฤษ",
  keywords: [
    "จัดการแข่งขันฟุตบอล",
    "จัดการทัวร์นาเมนต์",
    "สร้างตารางแข่ง",
    "โปรแกรมการแข่งขัน",
    "ระบบจัดการลีก",
    "สมัครแข่งบอล",
    "LeagueFlow",
    "Tournament Management",
    "Football League",
    "Match Scoring"
  ],
  authors: [{ name: "LeagueFlow" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://leagueflow.app"),
  openGraph: {
    type: "website",
    locale: "th_TH",
    alternateLocale: "en_US",
    title: "LeagueFlow | แพลตฟอร์มจัดการแข่งขันฟุตบอลมืออาชีพ",
    description: "สร้างและจัดการการแข่งขันฟุตบอลของคุณแบบมืออาชีพ ด้วยระบบตารางแข่งอัตโนมัติและผลคะแนนเรียลไทม์",
    siteName: "LeagueFlow",
  },
  twitter: {
    card: "summary_large_image",
    title: "LeagueFlow | แพลตฟอร์มจัดการแข่งขันฟุตบอลมืออาชีพ",
    description: "จัดการแข่งขันฟุตบอลและกีฬาครบวงจร บันทึกผลเรียลไทม์ และระบบสมัครทีมออนไลน์",
  },
  robots: {
    index: true,
    follow: true,
  },
};

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
      <body
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
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

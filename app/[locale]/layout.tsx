import type { Metadata } from "next";
import { Geist, Geist_Mono, Chakra_Petch } from "next/font/google";
import "../globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { CookieBanner } from "@/components/cookie-consent/banner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const chakraPetch = Chakra_Petch({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin', 'thai'],
  variable: '--font-chakra-petch',
});

export const metadata: Metadata = {
  title: {
    default: "LeagueFlow | Tournament Management Platform",
    template: "%s | LeagueFlow",
  },
  description: "Create, manage, and run professional football tournaments with real-time scoring, automated fixtures, team registrations, and PromptPay billing. Multilingual (EN/TH).",
  keywords: ["tournament management", "football league", "match scoring", "fixtures", "standings", "PromptPay", "team registration", "เครื่องมือจัดการทัวร์นาเมนต์"],
  authors: [{ name: "LeagueFlow" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://leagueflow.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: "th_TH",
    title: "LeagueFlow | Tournament Management Platform",
    description: "Create, manage, and run professional football tournaments with real-time scoring, automated fixtures, and PromptPay billing.",
    siteName: "LeagueFlow",
  },
  twitter: {
    card: "summary_large_image",
    title: "LeagueFlow | Tournament Management Platform",
    description: "Create, manage, and run professional football tournaments.",
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
  if (!routing.locales.includes(locale as any)) {
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
        className={`${geistSans.variable} ${geistMono.variable} ${chakraPetch.variable} font-sans antialiased`}
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
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

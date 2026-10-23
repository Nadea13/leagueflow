import React from 'react';
import { getSiteUrl } from '@/lib/site-url';

interface JsonLdProps {
  locale: string;
}

export function JsonLd({ locale }: JsonLdProps) {
  const isThai = locale === 'th';
  const siteUrl = getSiteUrl();

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Tourni',
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    sameAs: [
      'https://www.facebook.com/profile.php?id=61583928452496',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      availableLanguage: ['Thai', 'English'],
    },
  };

  const softwareAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: isThai ? 'Tourni - แพลตฟอร์มจัดการแข่งขันฟุตบอลและกีฬา' : 'Tourni - Tournament & Sports Management Platform',
    applicationCategory: 'SportsApplication',
    operatingSystem: 'All Modern Web Browsers',
    url: `${siteUrl}/${locale}`,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'THB',
      availability: 'https://schema.org/InStock',
    },
    description: isThai
      ? 'แพลตฟอร์มจัดการแข่งขันฟุตบอลและกีฬาครบวงจร สร้างตารางแข่งอัตโนมัติ (Single Elimination, Double Elimination, Round Robin), สรุปผลคะแนนสดเรียลไทม์, รับสมัครทีมพร้อมชำระเงิน PromptPay และ OBS Live Score Overlay'
      : 'Comprehensive sports tournament management platform with automated bracket generation, real-time live scoring, online team registration with PromptPay, and OBS broadcast overlays.',
    featureList: isThai
      ? [
          'สร้างตารางแข่งขันอัตโนมัติ (Bracket & Round Robin)',
          'ระบบรับสมัครทีมออนไลน์ พร้อมระบบสลิป PromptPay',
          'บันทึกผลการแข่งขันและสถิติสดแบบเรียลไทม์',
          'Live Overlay ต่อเข้า OBS สำหรับการถ่ายทอดสด',
          'ระบบจัดการรายชื่อนักกีฬาและสตาฟ',
        ]
      : [
          'Automated bracket generator (Single/Double Elimination & Round Robin)',
          'Online team registration with automated PromptPay payment',
          'Real-time live scoring and match statistics',
          'OBS Live Score Overlay for live streaming broadcasts',
          'Roster & staff management',
        ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: isThai
      ? [
          {
            '@type': 'Question',
            name: 'Tourni คืออะไร?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Tourni คือแพลตฟอร์มจัดการแข่งขันกีฬาและฟุตบอลแบบครบวงจร ที่ช่วยผู้จัดสร้างสายการแข่งขัน (Bracket) และตารางแข่งพบกันหมด (Round Robin) อัตโนมัติ บันทึกผลคะแนนแบบเรียลไทม์ เปิดรับสมัครทีมออนไลน์ และมีระบบ Live Scoreboard Overlay สำหรับสตรีมมิ่งสดผ่าน OBS',
            },
          },
          {
            '@type': 'Question',
            name: 'Tourni รองรับกีฬาประเภทใดบ้าง?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'รองรับฟุตบอล (Football), บาสเกตบอล (Basketball), แบดมินตัน (Badminton), วอลเลย์บอล (Volleyball), ฟุตซอล (Futsal), คริกเก็ต และเซปักตะกร้อ',
            },
          },
          {
            '@type': 'Question',
            name: 'วิธีสร้างตารางแข่งขันฟุตบอลอัตโนมัติทำอย่างไร?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: '1. สมัครสมาชิกและสร้างทัวร์นาเมนต์ใหม่ 2. เลือกระบบการแข่งขัน (น็อคเอาท์ หรือ พบกันหมด) 3. เพิ่มทีมหรือเปิดรับสมัครออนไลน์ 4. ระบบจะจัดตารางแข่ง วันที่ เวลา และสายการแข่งขันให้อัตโนมัติทันที',
            },
          },
          {
            '@type': 'Question',
            name: 'Tourni สามารถใช้งานฟรีได้หรือไม่?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Tourni มีแพ็กเกจฟรีสำหรับทดลองใช้งาน รวมถึงฟีเจอร์ Free Live Overlay สำหรับการถ่ายทอดสดโดยไม่มีค่าใช้จ่าย และมีแพ็กเกจ Event และ Cup สำหรับผู้จัดทัวร์นาเมนต์ขนาดใหญ่',
            },
          },
        ]
      : [
          {
            '@type': 'Question',
            name: 'What is Tourni?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Tourni is a complete tournament and sports management platform providing automatic bracket generation, real-time live scoring, online team registration, and OBS live broadcast overlays.',
            },
          },
          {
            '@type': 'Question',
            name: 'What sports are supported on Tourni?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Tourni supports Football, Basketball, Badminton, Volleyball, Futsal, Cricket, and Sepak Takraw.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is Tourni free to use?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes, Tourni offers free tiers and free live score overlays, as well as premium packages for large-scale tournaments.',
            },
          },
        ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}

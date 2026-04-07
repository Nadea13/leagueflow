'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function BackButton() {
    const router = useRouter();
    const t = useTranslations('Common');

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="group mb-6 -ml-2 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1 font-bold uppercase italic tracking-wider text-[10px]"
        >
            <ChevronLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
            {t('back')}
        </Button>
    );
}

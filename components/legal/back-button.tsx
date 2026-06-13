'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function BackButton() {
    const router = useRouter();

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-10 w-10 shrink-0 hover:bg-primary/10 hover:text-primary transition-all"
        >
            <ArrowLeft className="h-4 w-4" />
        </Button>
    );
}

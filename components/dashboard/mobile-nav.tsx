"use client"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { MainNav } from './main-nav';
import Link from 'next/link';
import { useState } from 'react';

export function MobileNav() {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <nav className="grid gap-2 text-lg font-medium">
                    <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold mb-4" onClick={() => setOpen(false)}>
                        <span className="">LeagueFlow</span>
                    </Link>
                    <div onClick={() => setOpen(false)}>
                        <MainNav />
                    </div>
                </nav>
            </SheetContent>
        </Sheet>
    )
}

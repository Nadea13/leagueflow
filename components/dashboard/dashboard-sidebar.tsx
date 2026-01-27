import { MainNav } from './main-nav';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function DashboardSidebar({ className }: { className?: string }) {
    return (
        <div className={cn("border-r bg-muted/40", className)}>
            <div className="flex h-full max-h-screen flex-col gap-2">
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                        <span className="">LeagueFlow</span>
                    </Link>
                </div>
                <div className="flex-1 overflow-auto py-2">
                    <MainNav className="px-2 font-medium lg:px-4" />
                </div>
            </div>
        </div>
    )
}

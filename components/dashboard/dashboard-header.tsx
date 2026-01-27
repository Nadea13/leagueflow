import { UserNav } from './user-nav';
import { MobileNav } from './mobile-nav';

export function DashboardHeader({ userEmail }: { userEmail: string | undefined }) {
    return (
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 sticky top-0 z-40 w-full transition-all backdrop-blur-sm">
            <MobileNav />
            <div className="w-full flex-1">
                {/* Search or Title could go here */}
            </div>
            <UserNav email={userEmail} />
        </header>
    )
}

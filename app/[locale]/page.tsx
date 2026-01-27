import { Link } from "@/i18n/routing";
import { Trophy, Zap, List, Share2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Navbar */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Trophy className="h-6 w-6 text-primary" />
            <span>LeagueFlow</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="#features" className="hover:text-primary transition-colors">
              Features
            </Link>
            <Link href="#" className="hover:text-primary transition-colors">
              Pricing
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="/dashboard">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent -z-10" />
          <div className="container mx-auto px-4 text-center max-w-4xl">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
              Manage Your Football League in <span className="text-primary">Seconds</span>.
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              The easiest way to organize tournaments, generate fixtures, and track standings.
              No spreadsheet required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button size="lg" className="h-12 px-8 text-lg" asChild>
                <Link href="/dashboard">
                  Start for Free <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-lg">
                View Demo
              </Button>
            </div>

            {/* Screenshot Placeholder */}
            <div className="relative mx-auto rounded-xl border bg-muted/50 p-4 shadow-2xl max-w-5xl overflow-hidden aspect-video flex items-center justify-center">
              <div className="text-muted-foreground flex flex-col items-center gap-2">
                <Trophy className="h-16 w-16 opacity-20" />
                <p className="font-medium opacity-50">Dashboard Screenshot Placeholder</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Everything You Need</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Stop wrestling with complicated tools. LeagueFlow gives you powerful features kept simple.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Feature 1 */}
              <div className="flex flex-col items-center text-center p-6 bg-background rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Automated Fixtures</h3>
                <p className="text-muted-foreground">
                  Generate Round Robin schedules with one click. Handle odd numbers of teams automatically.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col items-center text-center p-6 bg-background rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary">
                  <List className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Live Standings</h3>
                <p className="text-muted-foreground">
                  Table updates automatically as you enter scores. Points, goal difference, and rankings calculated instantly.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col items-center text-center p-6 bg-background rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary">
                  <Share2 className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Public Sharing</h3>
                <p className="text-muted-foreground">
                  Share read-only links with fans and players instantly. No login required for viewers.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-10 border-t">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Trophy className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">LeagueFlow</span>
          </div>
          <p>© {new Date().getFullYear()} LeagueFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

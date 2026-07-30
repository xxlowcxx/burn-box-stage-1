import { Switch, Route, Router, Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import DrivePage from "@/pages/drive";
import AuditPage from "@/pages/audit";
import { Shield, FolderOpen, Activity, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-sidebar p-4 gap-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-2 py-2">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="text-primary shrink-0">
          <path d="M16 4L4 9v7c0 6.5 5 11.5 12 12 7-.5 12-5.5 12-12V9L16 4z"
            stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
          <path d="M11 16l3.5 3.5L21 13" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-bold text-lg tracking-tight" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          SafeDrive
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        <Link href="/">
          <Button variant="ghost" className="w-full justify-start gap-2.5 font-medium" data-testid="link-drive">
            <FolderOpen className="w-4 h-4" /> My Drive
          </Button>
        </Link>
        <Link href="/audit">
          <Button variant="ghost" className="w-full justify-start gap-2.5 font-medium" data-testid="link-audit">
            <Activity className="w-4 h-4" /> Audit Log
          </Button>
        </Link>
      </nav>

      {/* Security badge */}
      <div className="mt-auto p-3 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 mb-1.5">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold">Safety Scanner</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Every file is pattern-scanned. Originals deleted. Only safe copies kept.
        </p>
      </div>
    </aside>
  );
}

function TopBar() {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
      {/* Mobile logo */}
      <div className="flex items-center gap-2.5 md:hidden">
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none" className="text-primary shrink-0">
          <path d="M16 4L4 9v7c0 6.5 5 11.5 12 12 7-.5 12-5.5 12-12V9L16 4z"
            stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
          <path d="M11 16l3.5 3.5L21 13" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-bold text-base tracking-tight" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          SafeDrive
        </span>
      </div>

      {/* Mobile nav */}
      <div className="flex md:hidden items-center gap-1">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1.5" data-testid="link-drive-mobile">
            <FolderOpen className="w-4 h-4" />
          </Button>
        </Link>
        <Link href="/audit">
          <Button variant="ghost" size="sm" className="gap-1.5" data-testid="link-audit-mobile">
            <Activity className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      <div className="hidden md:block" />

      <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-theme-toggle"
        aria-label="Toggle theme">
        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </Button>
    </header>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={DrivePage} />
      <Route path="/audit" component={AuditPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router hook={useHashLocation}>
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <TopBar />
                <ScrollArea className="flex-1">
                  <main className="min-h-full">
                    <AppRouter />
                  </main>
                </ScrollArea>
              </div>
            </div>
          </Router>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

import { Button } from "@/components/ui/button";
import { BookOpen, Menu, User } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";

const Header = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    // Check current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-accent rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">
              Narrated
            </span>
          </a>
          
          {/* Navigation - Hidden on mobile */}
          <nav className="hidden md:flex items-center gap-8">
            <a 
              href="/what-we-do" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              What We Do
            </a>
            <a 
              href="/pricing" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </a>
            <a 
              href="/faq" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              FAQ
            </a>
          </nav>
          
          {/* CTA Button */}
          <div className="flex items-center gap-4">
            {user ? (
              <Button 
                variant="hero" 
                className="hidden sm:inline-flex"
                onClick={() => window.location.href = '/dashboard'}
              >
                <User className="w-4 h-4 mr-2" />
                My Profile
              </Button>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-foreground/80 hover:text-foreground hidden sm:inline-flex"
                  onClick={() => window.location.href = '/auth'}
                >
                  Login
                </Button>
                <Button 
                  variant="hero" 
                  className="hidden sm:inline-flex"
                  onClick={() => window.location.href = '/auth'}
                >
                  Get Started
                </Button>
              </>
            )}
            
            {/* Mobile menu button */}
            <button className="md:hidden p-2 text-muted-foreground hover:text-foreground">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
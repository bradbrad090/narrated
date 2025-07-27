import { Button } from "@/components/ui/button";
import { BookOpen, Menu, User, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const Header = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

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
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-all duration-300 group">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
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
                onClick={() => navigate('/dashboard')}
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
                  onClick={() => navigate('/auth')}
                >
                  Login
                </Button>
                <Button 
                  variant="hero" 
                  className="hidden sm:inline-flex"
                  onClick={() => navigate('/auth')}
                >
                  Get Started
                </Button>
              </>
            )}
            
            {/* Mobile menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <button className="md:hidden p-2 text-muted-foreground hover:text-foreground">
                  <Menu className="w-5 h-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle className="text-left">Menu</SheetTitle>
                  <SheetDescription className="text-left">
                    Navigate through our services
                  </SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-8">
                  <a 
                    href="/what-we-do" 
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors py-2"
                    onClick={() => setIsOpen(false)}
                  >
                    What We Do
                  </a>
                  <a 
                    href="/pricing" 
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors py-2"
                    onClick={() => setIsOpen(false)}
                  >
                    Pricing
                  </a>
                  <a 
                    href="/faq" 
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors py-2"
                    onClick={() => setIsOpen(false)}
                  >
                    FAQ
                  </a>
                  <div className="border-t pt-4 mt-4">
                    {user ? (
                      <Button 
                        variant="hero" 
                        className="w-full"
                        onClick={() => {
                          navigate('/dashboard');
                          setIsOpen(false);
                        }}
                      >
                        <User className="w-4 h-4 mr-2" />
                        My Profile
                      </Button>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => {
                            navigate('/auth');
                            setIsOpen(false);
                          }}
                        >
                          Login
                        </Button>
                        <Button 
                          variant="hero" 
                          className="w-full"
                          onClick={() => {
                            navigate('/auth');
                            setIsOpen(false);
                          }}
                        >
                          Get Started
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
import { Button } from "@/components/ui/button";
import { BookOpen, Menu } from "lucide-react";

const Header = () => {
  return (
    <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-accent rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">
              AI Autobiography
            </span>
          </div>
          
          {/* Navigation - Hidden on mobile */}
          <nav className="hidden md:flex items-center gap-8">
            <a 
              href="#how-it-works" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              How It Works
            </a>
            <a 
              href="#benefits" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Benefits
            </a>
            <a 
              href="#pricing" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </a>
            <a 
              href="#faq" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              FAQ
            </a>
          </nav>
          
          {/* CTA Button */}
          <div className="flex items-center gap-4">
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
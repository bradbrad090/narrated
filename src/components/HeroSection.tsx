import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import heroImage from "@/assets/hero-book.jpg";

const HeroSection = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGetStarted = async () => {
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to get started.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Save email to signup table
      const { error } = await supabase
        .from('signup' as any)
        .insert({ email: email.trim() });

      if (error) {
        console.error('Error saving email:', error);
        // Continue to auth page even if saving fails
      }

      // Navigate to auth page with email as query parameter
      navigate(`/auth?email=${encodeURIComponent(email.trim())}&signup=true`);
    } catch (error) {
      console.error('Unexpected error:', error);
      // Continue to auth page even if saving fails
      navigate(`/auth?email=${encodeURIComponent(email.trim())}&signup=true`);
    }
  };
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-subtle overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="Elegant vintage book with memories" 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-hero opacity-60"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-primary-foreground mb-4 sm:mb-6 leading-relaxed pb-2">
            <span className="block sm:inline">Your Life Story,</span>
            <span className="block text-transparent bg-gradient-accent bg-clip-text">
              Written by you
            </span>
          </h1>
          
          <p className="text-base sm:text-xl md:text-2xl text-primary-foreground/90 mb-6 sm:mb-8 mt-4 leading-relaxed max-w-3xl mx-auto px-4 sm:px-0">
            <span className="hidden sm:inline">Share your memories through conversation with our intelligent assistant, and watch as your unique life story 
            transforms into a beautifully crafted autobiography, professionally printed and delivered to your door.</span>
            <span className="sm:hidden">Transform your memories into a beautiful autobiography with AI assistance.</span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4 sm:px-0 max-w-md mx-auto">
            <Input 
              type="email" 
              placeholder="Enter your email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-12 w-full rounded-md border border-primary-foreground/30 bg-primary-foreground/10 backdrop-blur-sm px-4 py-3 text-base text-primary-foreground placeholder:text-primary-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            />
            <Button 
              variant="accent" 
              size="lg" 
              onClick={handleGetStarted}
              className="text-base sm:text-lg px-6 sm:px-8 py-3 font-semibold w-full sm:w-auto whitespace-nowrap"
            >
              Get Started
            </Button>
          </div>
          
          <div className="mt-6 sm:mt-12 hidden sm:flex flex-col sm:flex-row gap-4 sm:gap-8 justify-center items-center text-primary-foreground/80 text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-accent rounded-full"></div>
              <span>Intelligent Writing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-accent rounded-full"></div>
              <span>Professional Publishing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-accent rounded-full"></div>
              <span>Delivered to Your Door</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Subtle glow effect */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-accent/20 rounded-full blur-3xl"></div>
    </section>
  );
};

export default HeroSection;
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import UserDashboardSection from "@/components/UserDashboardSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import BenefitsSection from "@/components/BenefitsSection";
import ContactPrompt from "@/components/ContactPrompt";
import Footer from "@/components/Footer";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Narrated - From Conversation to Keepsake | Autobiography Servicee</title>
        <meta name="description" content="Write your life story. No writing experience needed - just share your memories and we do the rest. Printed and delivered." />
        <meta name="keywords" content="autobiography writing, writing assistant, life story book, memoir service, family history, legacy preservation, personal biography" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Narrated - Tell Your Story, We'll Write the Book" />
        <meta property="og:description" content="Transform your memories into a beautiful autobiography. Share your story through conversation - no writing required." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://narrated.com" />
        <meta property="og:image" content="https://narrated.com/hero-book.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Narrated - Tell Your Story, We'll Write the Book" />
        <meta name="twitter:description" content="Transform your memories into a beautiful autobiography. Share your story through conversation - no writing required." />
        <meta name="twitter:image" content="https://narrated.com/hero-book.jpg" />
        <link rel="canonical" href="https://narrated.com" />
      </Helmet>
      <div className="min-h-screen">
        <Header />
        {user ? (
          <UserDashboardSection user={user} />
        ) : (
          <HeroSection />
        )}
        <HowItWorksSection />
        <BenefitsSection />
        <ContactPrompt />
        <Footer />
      </div>
    </>
  );
};

export default Index;
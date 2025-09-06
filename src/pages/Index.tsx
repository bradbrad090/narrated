import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import BenefitsSection from "@/components/BenefitsSection";
import ContactPrompt from "@/components/ContactPrompt";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Narrated - From Conversation to Keepsake | Autobiography Servicee</title>
        <meta name="description" content="Write your life story with AI assistance. No writing experience needed - just share your memories and our intelligent system creates a professional autobiography. Printed and delivered." />
        <meta name="keywords" content="autobiography writing, AI writing assistant, life story book, memoir service, family history, legacy preservation, personal biography, ghostwriting service" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Narrated - Tell Your Story, We'll Write the Book" />
        <meta property="og:description" content="Transform your memories into a beautiful autobiography with AI assistance. Share your story through conversation - no writing required." />
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
        <HeroSection />
        <HowItWorksSection />
        <BenefitsSection />
        <ContactPrompt />
        <Footer />
      </div>
    </>
  );
};

export default Index;
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import BenefitsSection from "@/components/BenefitsSection";
import CallToActionSection from "@/components/CallToActionSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Narrated - AI-Powered Autobiography Writing Service</title>
        <meta name="description" content="Transform your life story into a beautifully written autobiography with AI. Professional ghostwriting, premium printing, and custom cover design. Preserve your legacy for future generations." />
      </Helmet>
      <div className="min-h-screen">
      <Header />
      <HeroSection />
      <HowItWorksSection />
      <BenefitsSection />
      <CallToActionSection />
      <Footer />
      </div>
    </>
  );
};

export default Index;

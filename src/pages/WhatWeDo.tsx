import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Mic, Sparkles, BookOpen, ArrowRight, Check } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useNavigate } from "react-router-dom";

const WhatWeDo = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>How It Works | Narrated</title>
        <meta name="description" content="Turn conversations into a professionally printed autobiography. Share your stories by voice or text, and we'll craft them into a beautiful book." />
        <link rel="canonical" href="https://narrated.com/what-we-do" />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="pt-16 sm:pt-20">
          {/* Hero - Clean and focused */}
          <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 sm:mb-6 leading-tight">
                Talk. We Write. You Get a Book.
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
                Share your memories through natural conversation. Our AI transforms your words into a professionally written autobiography, delivered as a hardcover book.
              </p>
              <Button 
                size="lg"
                onClick={() => navigate('/auth')}
                className="px-6 sm:px-8 min-h-[48px] text-base"
              >
                Start Your Free Chapter
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </section>

          {/* Visual Timeline */}
          <section className="bg-muted/30 py-12 sm:py-16 md:py-24">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-4xl mx-auto">
                
                {/* Step 1 */}
                <div className="flex gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-12 md:mb-16">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Mic className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
                    </div>
                    <div className="w-0.5 h-full bg-border mt-3 sm:mt-4" />
                  </div>
                  <div className="pb-6 sm:pb-8">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2">
                      1. Share Your Stories
                    </h2>
                    <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
                      Answer guided questions about your life—childhood, career, family, adventures. Use voice recording or type. Go at your own pace.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        Voice or text—whatever feels natural
                      </li>
                      <li className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        Thoughtful prompts to spark memories
                      </li>
                      <li className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        Save progress and continue anytime
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-12 md:mb-16">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary-foreground" />
                    </div>
                    <div className="w-0.5 h-full bg-border mt-3 sm:mt-4" />
                  </div>
                  <div className="pb-6 sm:pb-8">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2">
                      2. AI Crafts Your Chapters
                    </h2>
                    <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
                      Our AI transforms your conversations into polished, narrative chapters. Your authentic voice, professionally written.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        Maintains your unique voice and style
                      </li>
                      <li className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        Review and request changes anytime
                      </li>
                      <li className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        Add photos to bring stories to life
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4 sm:gap-6 md:gap-8">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary-foreground" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2">
                      3. Receive Your Book
                    </h2>
                    <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
                      Get a beautiful hardcover autobiography delivered to your door. A lasting legacy for your family.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        Digital copy ready in 3 business days
                      </li>
                      <li className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        Printed hardcover in 2-3 weeks
                      </li>
                      <li className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        Order additional copies anytime
                      </li>
                    </ul>
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* Simple CTA */}
          <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
                Ready to Preserve Your Story?
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 px-2">
                Start with a free chapter. No credit card required.
              </p>
              <Button 
                size="lg"
                onClick={() => navigate('/auth')}
                className="px-6 sm:px-8 min-h-[48px] text-base"
              >
                Begin Your Story
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default WhatWeDo;

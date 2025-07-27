import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { BookOpen, Mic, Users, Gift } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const WhatWeDo = () => {
  return (
    <>
      <Helmet>
        <title>What We Do - AI Autobiography Writing Services | Narrated</title>
        <meta name="description" content="Discover how Narrated transforms your life stories into professional autobiographies using AI technology. From conversational interviews to published books." />
      </Helmet>
      <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              What We Do
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              We help you preserve your life story through AI-powered conversations, 
              turning your spoken memories into beautiful written narratives.
            </p>
          </div>

          {/* Services Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            <div className="p-6 bg-background rounded-xl border border-border/50 shadow-elegant">
              <div className="w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center mb-4">
                <Mic className="w-6 h-6 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Conversational Writing</h3>
              <p className="text-muted-foreground">
                Simply talk to our AI assistant. It asks thoughtful questions and helps you 
                recall important memories naturally through conversation.
              </p>
            </div>

            <div className="p-6 bg-background rounded-xl border border-border/50 shadow-elegant">
              <div className="w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Professional Narratives</h3>
              <p className="text-muted-foreground">
                Your spoken words are transformed into beautifully written chapters, 
                maintaining your voice while ensuring professional quality.
              </p>
            </div>

            <div className="p-6 bg-background rounded-xl border border-border/50 shadow-elegant">
              <div className="w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center mb-4">
                <Gift className="w-6 h-6 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Legacy Preservation</h3>
              <p className="text-muted-foreground">
                Create a lasting legacy for your family and future generations 
                with stories that capture your unique perspective and experiences.
              </p>
            </div>
          </div>

          {/* Process Section */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground mb-8">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Start Talking</h3>
                <p className="text-muted-foreground">
                  Begin with any memory or story. Our AI will guide you with thoughtful questions.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">AI Crafts Your Story</h3>
                <p className="text-muted-foreground">
                  Your words are transformed into compelling narratives while preserving your voice.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Share Your Legacy</h3>
                <p className="text-muted-foreground">
                  Receive your completed autobiography to share with loved ones.
                </p>
              </div>
            </div>

            <Button 
              size="lg" 
              className="bg-gradient-accent text-accent-foreground font-semibold px-8 py-3"
              onClick={() => window.location.href = '/auth'}
            >
              Start Your Story Today
            </Button>
          </div>
        </div>
      </main>

      <Footer />
      </div>
    </>
  );
};

export default WhatWeDo;
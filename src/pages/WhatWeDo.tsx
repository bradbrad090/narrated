import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { BookOpen, Mic, Users, Gift, Sparkles, MessageCircle, Heart, CheckCircle, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";

const WhatWeDo = () => {
  return (
    <>
      <Helmet>
        <title>How AI Autobiography Writing Works | What We Do | Narrated</title>
        <meta name="description" content="Discover how Narrated uses conversational AI to help you write your life story. From guided conversations to professional printing - see our complete process." />
        <meta name="keywords" content="AI autobiography process, how to write life story, memoir writing process, autobiography creation, AI assisted writing" />
        <link rel="canonical" href="https://narrated.com/what-we-do" />
      </Helmet>
      <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      <main className="pt-24 pb-16 overflow-hidden">
        {/* Hero Section with Animated Elements */}
        <div className="container mx-auto px-6 mb-24">
          <div className="text-center mb-12 animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              Preserve Your Legacy Through Conversation
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              Transform spoken memories into a professionally crafted autobiography. 
              No writing required. Just share your stories.
            </p>
          </div>

          {/* Feature Cards with Hover Effects */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card className="group relative overflow-hidden border-2 hover:border-accent/50 transition-all duration-500 hover:shadow-glow animate-fade-in-up">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gradient-accent rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                  <MessageCircle className="w-8 h-8 text-accent-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-foreground">Natural Conversations</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Answer thoughtful questions that spark memories, or simply talk about a story you wish to share. Choose voice recording or typing. Whatever feels natural.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                    <span>Voice or text input</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                    <span>Guided conversation flow</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                    <span>At your own pace</span>
                  </li>
                </ul>
              </CardContent>
              <div className="absolute inset-0 bg-gradient-accent opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
            </Card>

            <Card className="group relative overflow-hidden border-2 hover:border-accent/50 transition-all duration-500 hover:shadow-glow animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gradient-hero rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-foreground">AI-Crafted Narratives</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Your words become beautifully written chapters that sound authentically you. Professionally polished yet personally meaningful.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                    <span>Maintains your voice</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                    <span>Professional quality</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                    <span>Unlimited chapters</span>
                  </li>
                </ul>
              </CardContent>
              <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
            </Card>

            <Card className="group relative overflow-hidden border-2 hover:border-accent/50 transition-all duration-500 hover:shadow-glow animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gradient-accent rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                  <Heart className="w-8 h-8 text-accent-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-foreground">Family Legacy</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Create a treasured family heirloom. Multiple family members can contribute, ensuring a complete story.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                    <span>Printed hardcover book</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                    <span>Add recipes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                    <span>Photo integration</span>
                  </li>
                </ul>
              </CardContent>
              <div className="absolute inset-0 bg-gradient-accent opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
            </Card>
          </div>
        </div>

        {/* How It Works - Visual Timeline */}
        <div className="bg-background py-20">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Your Journey to a Published Autobiography
              </h2>
              <p className="text-xl text-muted-foreground">Simple, guided, and completely personalized</p>
            </div>

            <div className="max-w-5xl mx-auto">
              <div className="grid md:grid-cols-3 gap-12 relative">
                {/* Connection Line */}
                <div className="hidden md:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-accent via-primary to-accent opacity-20" />
                
                {/* Step 1 */}
                <div className="relative animate-slide-in-right">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6">
                      <div className="w-24 h-24 bg-gradient-accent rounded-full flex items-center justify-center shadow-glow animate-glow-pulse">
                        <span className="text-4xl font-bold text-accent-foreground">1</span>
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <Mic className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-foreground">Share Your Stories</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Start a conversation about any memory. We guide you with thoughtful questions, 
                      making storytelling natural and enjoyable.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative animate-slide-in-right" style={{ animationDelay: '0.2s' }}>
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6">
                      <div className="w-24 h-24 bg-gradient-hero rounded-full flex items-center justify-center shadow-elegant">
                        <span className="text-4xl font-bold text-primary-foreground">2</span>
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-accent-foreground" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-foreground">AI Crafts Your Chapters</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Our editing team transform your conversations into beautifully written chapters. 
                      professionally polished while staying true to your authentic voice.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative animate-slide-in-right" style={{ animationDelay: '0.4s' }}>
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6">
                      <div className="w-24 h-24 bg-gradient-accent rounded-full flex items-center justify-center shadow-glow">
                        <span className="text-4xl font-bold text-accent-foreground">3</span>
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-foreground">Receive Your Book</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Get your autobiography delivered, digital within 3 business days, printed hardcover in 2-3 weeks. 
                      A lasting legacy for generations to treasure.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="container mx-auto px-6 py-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-12 md:p-16 shadow-elegant">
            <div className="relative z-10 text-center max-w-3xl mx-auto">
              <Gift className="w-16 h-16 text-accent mx-auto mb-6 animate-float" />
              <h2 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
                Start Your Free Chapter Today
              </h2>
              <p className="text-xl text-primary-foreground/90 mb-8 leading-relaxed">
                No credit card required. Begin preserving your memories in minutes.
              </p>
              <div className="flex justify-center">
                <Button 
                  size="lg" 
                  className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-12 py-6 text-lg rounded-full shadow-glow hover:scale-105 transition-transform duration-300 w-full sm:w-auto"
                  onClick={() => window.location.href = '/auth'}
                >
                  Begin Your Story
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-glow/10 rounded-full blur-3xl" />
          </div>
        </div>
      </main>

      <Footer />
      </div>
    </>
  );
};

export default WhatWeDo;
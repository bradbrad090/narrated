import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Pricing = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Choose the plan that works best for your story. 
              No hidden fees, no surprises.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
            {/* Basic Plan */}
            <div className="p-8 bg-background rounded-xl border border-border/50 shadow-elegant">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-foreground mb-2">Starter</h3>
                <p className="text-muted-foreground mb-4">Perfect for getting started</p>
                <div className="text-4xl font-bold text-foreground">$49</div>
                <p className="text-sm text-muted-foreground">one-time payment</p>
              </div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-accent" />
                  <span className="text-muted-foreground">Up to 5 chapters</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-accent" />
                  <span className="text-muted-foreground">AI conversation assistant</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-accent" />
                  <span className="text-muted-foreground">Professional editing</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-accent" />
                  <span className="text-muted-foreground">PDF download</span>
                </li>
              </ul>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.href = '/auth'}
              >
                Get Started
              </Button>
            </div>

            {/* Premium Plan - Featured */}
            <div className="p-8 bg-gradient-accent rounded-xl border-2 border-accent shadow-glow relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-accent text-accent-foreground px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
              
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-accent-foreground mb-2">Complete</h3>
                <p className="text-accent-foreground/80 mb-4">For your full life story</p>
                <div className="text-4xl font-bold text-accent-foreground">$149</div>
                <p className="text-sm text-accent-foreground/80">one-time payment</p>
              </div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-accent-foreground" />
                  <span className="text-accent-foreground/90">Unlimited chapters</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-accent-foreground" />
                  <span className="text-accent-foreground/90">Advanced AI conversation</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-accent-foreground" />
                  <span className="text-accent-foreground/90">Professional editing</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-accent-foreground" />
                  <span className="text-accent-foreground/90">Multiple format downloads</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-accent-foreground" />
                  <span className="text-accent-foreground/90">Priority support</span>
                </li>
              </ul>
              
              <Button 
                variant="secondary" 
                className="w-full bg-accent-foreground text-accent hover:bg-accent-foreground/90"
                onClick={() => window.location.href = '/auth'}
              >
                Start Writing
              </Button>
            </div>

            {/* Premium Plus Plan */}
            <div className="p-8 bg-background rounded-xl border border-border/50 shadow-elegant">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-foreground mb-2">Legacy</h3>
                <p className="text-muted-foreground mb-4">For families & generations</p>
                <div className="text-4xl font-bold text-foreground">$299</div>
                <p className="text-sm text-muted-foreground">one-time payment</p>
              </div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-accent" />
                  <span className="text-muted-foreground">Everything in Complete</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-accent" />
                  <span className="text-muted-foreground">Multiple family stories</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-accent" />
                  <span className="text-muted-foreground">Professional print book</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-accent" />
                  <span className="text-muted-foreground">White-glove service</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-accent" />
                  <span className="text-muted-foreground">Dedicated support</span>
                </li>
              </ul>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.href = '/auth'}
              >
                Contact Us
              </Button>
            </div>
          </div>

          {/* Guarantee Section */}
          <div className="text-center bg-background/50 rounded-xl p-8 border border-border/50">
            <h3 className="text-2xl font-bold text-foreground mb-4">30-Day Money-Back Guarantee</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We're confident you'll love your autobiography. If you're not completely satisfied 
              within 30 days, we'll refund your payment in full.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
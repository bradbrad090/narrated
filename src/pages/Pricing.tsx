import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Medal, Crown, Gem, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Pricing = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      setCheckingAuth(false);
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGetStarted = () => {
    if (isLoggedIn) {
      // If logged in, take them to homepage to view their books
      navigate("/");
    } else {
      // If logged out, take them to signup
      navigate("/auth");
    }
  };

  const plans = [
    {
      name: "Free Tier",
      description: "Start your story with one free chapter",
      features: ["One free chapter", "Professional editing", "Emailed on completion"],
      isFree: true,
    },
    {
      name: "Basic",
      price: "$9",
      description: "Unlimited story creation in digital format",
      icon: Medal,
      iconColor: "text-amber-700",
      features: [
        "Unlimited chapters and word count",
        "Professional editing",
        "20 recipes",
        "100 photos",
        "Digital delivery (PDF)",
      ],
      theme: {
        border: "border-amber-300",
        background: "bg-gradient-to-br from-amber-100/70 to-orange-100/50",
      },
    },
    {
      name: "Standard",
      price: "$19",
      description: "Unlimited story as a printed book",
      icon: Crown,
      iconColor: "text-slate-700",
      features: [
        "Unlimited chapters and word count",
        "Professional editing",
        "20 recipes",
        "100 photos",
        "Printed book + Digital PDF",
      ],
      featured: true,
      theme: {
        border: "border-slate-400",
        background: "bg-gradient-to-br from-slate-100/70 to-gray-100/50",
      },
    },
    {
      name: "Premium",
      price: "$39",
      description: "Premium book with multiple copies",
      icon: Gem,
      iconColor: "text-yellow-700",
      features: [
        "Unlimited chapters and word count",
        "Professional editing",
        "Unlimited recipes",
        "Unlimited photos",
        "Premium book + Digital PDF",
        "5 copies",
      ],
      theme: {
        border: "border-yellow-400",
        background: "bg-gradient-to-br from-yellow-100/70 to-amber-100/50",
      },
    },
  ];

  return (
    <>
      <Helmet>
        <title>Autobiography Writing Pricing - Plans from $0 | Narrated</title>
        <meta
          name="description"
          content="Clear pricing for AI-assisted autobiography writing. Free Tier $0, Basic $9, Standard $19, Premium $39. Professional editing and printing included."
        />
        <meta
          name="keywords"
          content="autobiography pricing, life story cost, memoir writing price, AI writing service cost, book printing price"
        />
        <link rel="canonical" href="https://narrated.com/pricing" />
      </Helmet>
      <div className="min-h-screen bg-gradient-subtle">
        <Header />

        <main className="pt-20 sm:pt-24 pb-16 px-4 sm:px-6">
          <div className="container mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-10 sm:mb-16">
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-foreground mb-4 sm:mb-6">Simple, Transparent Pricing</h1>
              <p className="text-base sm:text-xl text-muted-foreground max-w-3xl mx-auto px-2">
                <span className="hidden sm:inline">All users start on the free tier, which includes one free chapter that is professionally edited and
                emailed to you upon completion. Choose the plan that best fits your story. All plans include intelligent
                conversations, professional writing, and editing. No hidden fees.</span>
                <span className="sm:hidden">Start free with one chapter. Upgrade anytime for unlimited chapters and printing.</span>
              </p>
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-16 max-w-7xl mx-auto items-stretch">
              {plans.map((plan, index) => {
                const Icon = plan.icon;

                return (
                  <Card
                    key={index}
                    className={`relative flex flex-col ${
                      plan.isFree ? "border-border/50" : `${plan.theme?.border} ${plan.theme?.background}`
                    } ${plan.featured ? "shadow-elegant sm:scale-105" : ""}`}
                  >
                    {plan.featured && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                          Most Popular
                        </span>
                      </div>
                    )}
                    <CardHeader className="text-center">
                      {Icon && (
                        <div className="flex justify-center mb-2">
                          <Icon className={`w-6 h-6 ${plan.iconColor}`} />
                        </div>
                      )}
                      <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                      {plan.price && <div className="text-4xl font-bold text-primary mb-2">{plan.price}</div>}
                      <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-grow p-4 sm:p-6">
                      <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 flex-grow">
                        {plan.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-start gap-2 sm:gap-3">
                            <Check className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-xs sm:text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      {!plan.isFree && (
                        <Button
                          className={`w-full mt-auto ${plan.featured ? "bg-primary hover:bg-primary/90" : ""}`}
                          variant={plan.featured ? "default" : "outline"}
                          onClick={handleGetStarted}
                          disabled={checkingAuth}
                        >
                          {checkingAuth ? "Loading..." : isLoggedIn ? "View Your Books" : "Get Started"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Additional Info */}
            <div className="text-center bg-card rounded-2xl p-8 shadow-elegant max-w-4xl mx-auto mb-8">
              <h2 className="text-2xl font-semibold mb-4">Money-Back Guarantee</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We're confident you'll love your autobiography. If you're not completely satisfied within 30 days, we'll
                refund your payment in full.
              </p>
            </div>

            {/* Gift Section */}
            <div className="text-center bg-gradient-to-br from-accent/10 to-primary/10 rounded-2xl p-8 shadow-elegant max-w-4xl mx-auto border border-accent/20">
              <div className="flex justify-center mb-4">
                <Gift className="w-12 h-12 text-accent" />
              </div>
              <h2 className="text-2xl font-semibold mb-4">Gift an Autobiography</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
                Give the gift of preserving memories. Purchase any tier as a gift and we'll send you a unique redemption
                code to share with your loved one.
              </p>
              <Button variant="hero" size="lg" onClick={() => navigate("/gift")}>
                <Gift className="w-4 h-4 mr-2" />
                Purchase a Gift
              </Button>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Pricing;

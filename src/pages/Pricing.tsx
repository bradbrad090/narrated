import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const Pricing = () => {
  const plans = [
    {
      name: "Free Tier",
      price: "$0",
      description: "Start your story with one free chapter",
      features: [
        "One free chapter",
        "Professional editing",
        "Emailed on completion",
      ]
    },
    {
      name: "Basic",
      price: "$49",
      description: "Unlimited story creation in digital format",
      features: [
        "Unlimited chapters and word count",
        "Professional editing",
        "20 recipes",
        "100 photos",
        "Digital delivery (PDF)",
      ]
    },
    {
      name: "Standard",
      price: "$199",
      description: "Unlimited story as a printed book",
      features: [
        "Unlimited chapters and word count",
        "Professional editing",
        "20 recipes",
        "100 photos",
        "Printed book + digital PDF",
      ],
      featured: true
    },
    {
      name: "Premium",
      price: "$399",
      description: "Premium book with multiple copies",
      features: [
        "Unlimited chapters and word count",
        "Professional editing",
        "20 recipes",
        "100 photos",
        "Premium book + digital PDF",
        "5 copies",
      ]
    }
  ];

  return (
    <>
      <Helmet>
        <title>Autobiography Writing Pricing - Plans from $0 | Narrated</title>
        <meta name="description" content="Clear pricing for AI-assisted autobiography writing. Free Tier $0, Basic $49, Standard $199, Premium $399. Professional editing and printing included." />
        <meta name="keywords" content="autobiography pricing, life story cost, memoir writing price, AI writing service cost, book printing price" />
        <link rel="canonical" href="https://narrated.com/pricing" />
      </Helmet>
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
                All users start on the free tier, which includes one free chapter that is professionally edited and emailed to you upon completion. Choose the plan that best fits your story. All plans include intelligent conversations, 
                professional writing, and editing. No hidden fees.
              </p>
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16 max-w-7xl mx-auto items-stretch">
              {plans.map((plan, index) => (
                <Card key={index} className={`relative flex flex-col ${plan.featured ? 'border-primary shadow-elegant scale-105' : 'border-border/50'}`}>
                  {plan.featured && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                    <div className="text-4xl font-bold text-primary mb-2">{plan.price}</div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-grow">
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-primary flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className={`w-full ${plan.featured ? 'bg-primary hover:bg-primary/90' : ''}`}
                      variant={plan.featured ? "default" : "outline"}
                      onClick={() => window.location.href = '/auth'}
                    >
                      Get Started
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Additional Info */}
            <div className="text-center bg-card rounded-2xl p-8 shadow-elegant max-w-4xl mx-auto">
              <h2 className="text-2xl font-semibold mb-4">Money-Back Guarantee</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We're confident you'll love your autobiography. If you're not completely satisfied 
                within 30 days, we'll refund your payment in full.
              </p>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Pricing;

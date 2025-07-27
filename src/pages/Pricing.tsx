import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const Pricing = () => {
  const plans = [
    {
      name: "Essential Story",
      price: "$299",
      description: "Perfect for capturing your key life moments",
      features: [
        "3-4 conversation sessions",
        "50-80 page autobiography",
        "Professional editing",
        "Digital delivery (PDF)",
        "Basic cover design"
      ]
    },
    {
      name: "Complete Legacy",
      price: "$599",
      description: "Comprehensive life story documentation",
      features: [
        "6-8 conversation sessions",
        "100-150 page autobiography",
        "Professional editing & formatting",
        "Premium hardcover book",
        "Custom cover design",
        "Digital & physical delivery",
        "Family sharing copies (2)"
      ],
      featured: true
    },
    {
      name: "Premium Heritage",
      price: "$999",
      description: "The ultimate legacy preservation experience",
      features: [
        "10-12 conversation sessions",
        "150-200+ page autobiography",
        "Professional editing & proofreading",
        "Luxury hardcover with dust jacket",
        "Custom photo integration",
        "Digital & physical delivery",
        "Family sharing copies (5)",
        "Genealogy research assistance"
      ]
    }
  ];

  return (
    <>
      <Helmet>
        <title>Pricing - Affordable Autobiography Writing Plans | Narrated</title>
        <meta name="description" content="Choose from our flexible pricing plans for AI-powered autobiography writing. Professional quality books starting at competitive rates with premium printing included." />
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
                Choose the plan that best fits your story. All plans include AI-powered conversations, 
                professional writing, and editing. No hidden fees.
              </p>
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-3 gap-8 mb-16 max-w-6xl mx-auto">
              {plans.map((plan, index) => (
                <Card key={index} className={`relative ${plan.featured ? 'border-primary shadow-elegant scale-105' : 'border-border/50'}`}>
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
                  <CardContent>
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
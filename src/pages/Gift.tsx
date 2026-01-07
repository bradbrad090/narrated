import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Gift as GiftIcon, Medal, Crown, Gem, Check, ArrowLeft } from "lucide-react";
import { z } from "zod";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
const giftFormSchema = z.object({
  recipientEmail: z.string().email({
    message: "Invalid recipient email address"
  }).max(255),
  purchaserEmail: z.string().email({
    message: "Invalid purchaser email address"
  }).max(255),
  purchaserName: z.string().max(100).optional(),
  giftMessage: z.string().max(500).optional()
});
type GiftFormData = z.infer<typeof giftFormSchema>;
const Gift = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedTier = searchParams.get("tier") as "basic" | "standard" | "premium" | null;
  const [selectedTier, setSelectedTier] = useState<"basic" | "standard" | "premium" | null>(preselectedTier);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<GiftFormData>({
    recipientEmail: "",
    purchaserEmail: "",
    purchaserName: "",
    giftMessage: ""
  });
  const [errors, setErrors] = useState<Partial<Record<keyof GiftFormData, string>>>({});
  const {
    toast
  } = useToast();
  const tiers = [{
    id: "basic" as const,
    name: "Basic",
    price: "$9",
    description: "One book with digital format",
    icon: <Medal className="h-6 w-6 text-amber-700" />,
    features: ["Unlimited chapters", "10 recipes", "50 photos", "Digital PDF"],
    theme: {
      border: "border-amber-300",
      background: "bg-gradient-to-br from-amber-100/70 to-orange-100/50",
      iconColor: "text-amber-700"
    }
  }, {
    id: "standard" as const,
    name: "Standard",
    price: "$19",
    description: "One book with digital and printed copy",
    icon: <Crown className="h-6 w-6 text-slate-700" />,
    features: ["Unlimited chapters", "20 recipes", "100 photos", "Digital Copy & Printed Book"],
    featured: true,
    theme: {
      border: "border-slate-400",
      background: "bg-gradient-to-br from-slate-100/70 to-gray-100/50",
      iconColor: "text-slate-700"
    }
  }, {
    id: "premium" as const,
    name: "Premium",
    price: "$39",
    description: "One premium book with multiple copies",
    icon: <Gem className="h-6 w-6 text-yellow-700" />,
    features: ["Unlimited chapters", "Unlimited recipes", "Unlimited photos", "Digital Copy and Printed Book", "5 Free Copies"],
    theme: {
      border: "border-yellow-400",
      background: "bg-gradient-to-br from-yellow-100/70 to-amber-100/50",
      iconColor: "text-yellow-700"
    }
  }];
  const validateForm = (): boolean => {
    try {
      giftFormSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof GiftFormData, string>> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof GiftFormData] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };
  const handleInputChange = (field: keyof GiftFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };
  const handlePurchaseGift = async (tier: "basic" | "standard" | "premium") => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    setSelectedTier(tier);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("create-gift-payment", {
        body: {
          tier,
          recipient_email: formData.recipientEmail,
          purchaser_email: formData.purchaserEmail,
          purchaser_name: formData.purchaserName || undefined,
          gift_message: formData.giftMessage || undefined
        }
      });
      if (error) {
        throw new Error(error.message);
      }
      if (data?.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Gift payment error:", error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to process gift payment",
        variant: "destructive"
      });
      setIsLoading(false);
      setSelectedTier(null);
    }
  };
  return <>
      <Helmet>
        <title>Gift a Story - Narrated | Give the Gift of Legacy</title>
        <meta name="description" content="Give the perfect gift - help your loved ones preserve their life stories. Choose from our Basic, Standard, or Premium autobiography packages." />
        <meta name="keywords" content="gift card, autobiography gift, life story gift, memoir gift, legacy gift" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gradient-subtle">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-6 sm:py-12 pt-20 sm:pt-24">
          {/* Back Button */}
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 sm:mb-6 group min-h-[44px]">
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back
          </Button>

          {/* Hero Section */}
          <div className="text-center mb-8 sm:mb-12 space-y-3 sm:space-y-4">
            <div className="flex justify-center mb-3 sm:mb-4">
              <div className="p-3 sm:p-4 bg-primary/10 rounded-full">
                <GiftIcon className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4">
              Give the Gift of Legacy
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
              Help someone special preserve their life story. Purchase a gift to unlock one autobiography book with premium features.
            </p>
            <div className="flex items-center justify-center gap-2 text-muted-foreground px-4">
              <span className="text-xs sm:text-sm text-center">The perfect gift for parents, grandparents, or anyone with a story to tell</span>
            </div>
          </div>

          {/* Gift Details Form */}
          <Card className="max-w-2xl mx-auto mb-8 sm:mb-12 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Gift Details</CardTitle>
              <CardDescription>Enter the recipient and your information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="recipientEmail" className="text-sm">
                    Recipient Email <span className="text-destructive">*</span>
                  </Label>
                  <Input id="recipientEmail" type="email" placeholder="recipient@example.com" value={formData.recipientEmail} onChange={e => handleInputChange("recipientEmail", e.target.value)} className={`min-h-[44px] ${errors.recipientEmail ? "border-destructive" : ""}`} />
                  {errors.recipientEmail && <p className="text-sm text-destructive">{errors.recipientEmail}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchaserEmail" className="text-sm">
                    Your Email <span className="text-destructive">*</span>
                  </Label>
                  <Input id="purchaserEmail" type="email" placeholder="your@example.com" value={formData.purchaserEmail} onChange={e => handleInputChange("purchaserEmail", e.target.value)} className={`min-h-[44px] ${errors.purchaserEmail ? "border-destructive" : ""}`} />
                  {errors.purchaserEmail && <p className="text-sm text-destructive">{errors.purchaserEmail}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchaserName" className="text-sm">Your Name (Optional)</Label>
                <Input id="purchaserName" type="text" placeholder="John Doe" value={formData.purchaserName} onChange={e => handleInputChange("purchaserName", e.target.value)} className="min-h-[44px]" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="giftMessage">
                  Personal Message (Optional)
                  <span className="text-sm text-muted-foreground ml-2">
                    {formData.giftMessage?.length || 0}/500
                  </span>
                </Label>
                <Textarea id="giftMessage" placeholder="Write a personal message to the recipient..." value={formData.giftMessage} onChange={e => handleInputChange("giftMessage", e.target.value)} maxLength={500} rows={4} className={errors.giftMessage ? "border-destructive" : ""} />
                {errors.giftMessage && <p className="text-sm text-destructive">{errors.giftMessage}</p>}
              </div>

              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">How it works:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Complete your purchase below</li>
                  <li>Recipient receives an email with their unique gift code</li>
                  <li>They redeem the code to unlock one book with the gifted tier</li>
                  <li>They start creating their book immediately</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Tier Selection */}
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">Choose a Package</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {tiers.map(tier => <Card key={tier.id} className={`relative flex flex-col ${tier.theme.border} ${tier.theme.background} ${tier.featured ? "shadow-elegant scale-105" : ""} transition-all hover:shadow-lg`}>
                  {tier.featured && <Badge className="absolute -top-2 left-4 bg-primary">Most Popular</Badge>}

                  <CardHeader className="pb-3 space-y-2">
                    <div className="flex items-center gap-2">
                      {tier.icon}
                      <CardTitle className="text-xl">{tier.name}</CardTitle>
                    </div>
                    <div className="text-3xl font-bold text-primary">{tier.price}</div>
                    <CardDescription className="min-h-[40px]">{tier.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="flex flex-col flex-1 pt-0">
                    <ul className="space-y-2 text-sm flex-1 mb-6">
                      {tier.features.map((feature, index) => <li key={index} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>)}
                    </ul>

                    <Button onClick={() => handlePurchaseGift(tier.id)} disabled={isLoading} className="w-full" size="lg">
                      {isLoading && selectedTier === tier.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isLoading && selectedTier === tier.id ? "Processing..." : "Purchase Gift"}
                    </Button>
                  </CardContent>
                </Card>)}
            </div>
          </div>

          {/* Additional Information */}
          <div className="max-w-4xl mx-auto mt-12 text-center space-y-4">
            <div className="bg-muted/30 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">100% Satisfaction Guaranteed</h3>
              <p className="text-muted-foreground">
                Gift codes are valid for 1 year from purchase date. 
              </p>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>;
};
export default Gift;
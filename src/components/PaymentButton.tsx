import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, Crown, Medal, Gem } from "lucide-react";

interface PaymentButtonProps {
  bookId: string;
  currentTier?: "free" | "basic" | "standard" | "premium";
  purchaseStatus?: string;
  onPaymentStart?: () => void;
  className?: string;
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  bookId,
  currentTier = "free",
  purchaseStatus,
  onPaymentStart,
  className = "",
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const freeTier = {
    id: "free" as const,
    name: "Free Tier",
    price: "$0",
    description: "Start your story with one free chapter",
    icon: <Check className="h-5 w-5" />,
    features: ["Professional editing", "Emailed on completion", "No word limit"],
    buttonText: "Current Plan",
  };

  const paidTiers = [
    {
      id: "basic" as const,
      name: "Basic",
      price: "$9",
      description: "Digital format with unlimited chapters",
      icon: <Medal className="h-5 w-5 text-amber-700" />,
      features: ["Unlimited chapters", "10 recipes", "50 photos", "Digital PDF"],
      buttonText: "Upgrade",
      theme: {
        border: "border-amber-300",
        background: "bg-gradient-to-br from-amber-100/70 to-orange-100/50",
        iconColor: "text-amber-700",
      },
    },
    {
      id: "standard" as const,
      name: "Standard",
      price: "$19",
      description: "Digital and Printed Copy",
      icon: <Crown className="h-5 w-5 text-slate-700" />,
      features: ["Unlimited chapters", "20 recipes", "100 photos", "Digital Copy & Printed Book"],
      buttonText: "Upgrade",
      featured: true,
      theme: {
        border: "border-slate-400",
        background: "bg-gradient-to-br from-slate-100/70 to-gray-100/50",
        iconColor: "text-slate-700",
      },
    },
    {
      id: "premium" as const,
      name: "Premium",
      price: "$39",
      description: "Premium book with multiple copies",
      icon: <Gem className="h-5 w-5 text-yellow-700" />,
      features: [
        "Unlimited chapters",
        "Unlimited recipes",
        "Unlimited photos",
        "Digital Copy and Printed Book",
        "5 Free Copies",
      ],
      buttonText: "Upgrade",
      theme: {
        border: "border-yellow-400",
        background: "bg-gradient-to-br from-yellow-100/70 to-amber-100/50",
        iconColor: "text-yellow-700",
      },
    },
  ];

  const handlePayment = async (tier: "free" | "basic" | "standard" | "premium") => {
    if (!bookId) {
      toast({
        title: "Error",
        description: "No book selected for payment",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    onPaymentStart?.();

    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: {
          bookId: bookId,
          tier: tier,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (tier === "free") {
        toast({
          title: "Success",
          description: "Free tier activated for your book",
        });
        // Refresh the page or update state as needed
        window.location.reload();
      } else if (data.url) {
        // Open Stripe checkout in new tab
        window.open(data.url, "_blank");

        toast({
          title: "Redirecting to payment",
          description: "Complete your payment in the new tab to upgrade your book",
        });
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isPurchased = (tier: "free" | "basic" | "standard" | "premium") => {
    return currentTier === tier && (purchaseStatus === "active" || tier === "free");
  };

  const isPending = (tier: "free" | "basic" | "standard" | "premium") => {
    return currentTier === tier && purchaseStatus === "pending";
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Free Tier - Full Width */}
      <Card className={`relative ${isPurchased(freeTier.id) ? "ring-2 ring-primary bg-muted/30" : "border-border/50"}`}>
        {isPurchased(freeTier.id) && <Badge className="absolute -top-2 left-4 bg-primary">Current Plan</Badge>}

        <CardHeader className="pb-2 sm:pb-3 space-y-1 sm:space-y-1.5">
          <CardTitle className="text-base sm:text-lg">{freeTier.name}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">{freeTier.description}</CardDescription>
        </CardHeader>

        <CardContent className="pt-0">
          <ul className="space-y-0.5 sm:space-y-1.5 text-sm">
            {freeTier.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Paid Tiers - 3 Column Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {paidTiers.map((tier) => (
          <Card
            key={tier.id}
            className={`relative flex flex-col ${tier.theme.border} ${tier.theme.background} ${
              isPurchased(tier.id) ? "ring-2 ring-primary" : ""
            } ${tier.featured ? "shadow-elegant" : ""}`}
          >
            {isPurchased(tier.id) && <Badge className="absolute -top-2 left-4 bg-primary">Current Plan</Badge>}
            {tier.featured && !isPurchased(tier.id) && (
              <Badge className="absolute -top-2 left-4 bg-primary">Most Popular</Badge>
            )}

            <CardHeader className="pb-2 sm:pb-3 space-y-1 sm:space-y-1.5">
              <div className="flex items-center gap-1.5 sm:gap-2">
                {tier.icon}
                <CardTitle className="text-base sm:text-lg">{tier.name}</CardTitle>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-primary">{tier.price}</div>
              <CardDescription className="text-xs sm:text-sm min-h-[32px] sm:min-h-[40px]">
                {tier.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col flex-1 pt-0">
              <ul className="space-y-0.5 sm:space-y-2 text-sm flex-1 mb-4">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-2">
                <Button
                  onClick={() => handlePayment(tier.id)}
                  disabled={isLoading || isPurchased(tier.id)}
                  className="w-full text-xs sm:text-sm py-1.5 sm:py-2 h-auto"
                  variant={isPurchased(tier.id) ? "outline" : "outline"}
                >
                  {isLoading && <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />}
                  {isPurchased(tier.id) ? "Current Plan" : isPending(tier.id) ? "Payment Pending..." : tier.buttonText}
                </Button>

                {isPending(tier.id) && (
                  <p className="text-xs text-muted-foreground text-center">
                    Complete your payment to activate this tier
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PaymentButton;

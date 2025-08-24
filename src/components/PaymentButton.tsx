import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, Crown, Star } from 'lucide-react';

interface PaymentButtonProps {
  bookId: string;
  currentTier?: 'free' | 'paid' | 'premium';
  purchaseStatus?: string;
  onPaymentStart?: () => void;
  className?: string;
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  bookId,
  currentTier = 'free',
  purchaseStatus,
  onPaymentStart,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const tiers = [
    {
      id: 'free' as const,
      name: 'Free',
      price: '$0',
      description: 'Basic book creation with limited features',
      icon: <Check className="h-5 w-5" />,
      features: ['Basic conversation mode', 'Limited chapters', 'Standard export'],
      buttonText: 'Use Free Version'
    },
    {
      id: 'paid' as const,
      name: 'Standard',
      price: '$29.99',
      description: 'Full featured book creation experience',
      icon: <Star className="h-5 w-5" />,
      features: ['All conversation modes', 'Unlimited chapters', 'Premium export', 'AI assistance'],
      buttonText: 'Upgrade'
    },
    {
      id: 'premium' as const,
      name: 'Premium',
      price: '$49.99',
      description: 'Professional book creation with advanced features',
      icon: <Crown className="h-5 w-5" />,
      features: ['Everything in Standard', 'Priority support', 'Advanced AI models', 'Professional editing'],
      buttonText: 'Upgrade'
    }
  ];

  const handlePayment = async (tier: 'free' | 'paid' | 'premium') => {
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
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          bookId: bookId,
          tier: tier
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (tier === 'free') {
        toast({
          title: "Success",
          description: "Free tier activated for your book",
        });
        // Refresh the page or update state as needed
        window.location.reload();
      } else if (data.url) {
        // Open Stripe checkout in new tab
        window.open(data.url, '_blank');
        
        toast({
          title: "Redirecting to payment",
          description: "Complete your payment in the new tab to upgrade your book",
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isPurchased = (tier: 'free' | 'paid' | 'premium') => {
    return currentTier === tier && (purchaseStatus === 'active' || tier === 'free');
  };

  const isPending = (tier: 'free' | 'paid' | 'premium') => {
    return currentTier === tier && purchaseStatus === 'pending';
  };

  return (
    <div className={`grid gap-6 md:grid-cols-3 ${className}`}>
      {tiers.map((tier) => (
        <Card 
          key={tier.id} 
          className={`relative flex flex-col ${
            isPurchased(tier.id) ? 'ring-2 ring-primary' : ''
          } ${
            currentTier === tier.id ? 'border-primary' : ''
          }`}
        >
          {isPurchased(tier.id) && (
            <Badge className="absolute -top-2 left-4 bg-primary">
              Current Plan
            </Badge>
          )}
          
          <CardHeader>
            <div className="flex items-center gap-2">
              {tier.icon}
              <CardTitle className="text-xl">{tier.name}</CardTitle>
            </div>
            <div className="text-3xl font-bold">{tier.price}</div>
            <CardDescription>{tier.description}</CardDescription>
          </CardHeader>
          
          <CardContent className="flex flex-col flex-1">
            <ul className="space-y-2 text-sm flex-1">
              {tier.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
            
            <div className="mt-4 space-y-2">
              <Button
                onClick={() => handlePayment(tier.id)}
                disabled={isLoading || isPurchased(tier.id)}
                className="w-full"
                variant={isPurchased(tier.id) ? "outline" : "default"}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPurchased(tier.id) 
                  ? "Current Plan" 
                  : isPending(tier.id)
                  ? "Payment Pending..."
                  : tier.buttonText
                }
              </Button>
              
              {isPending(tier.id) && (
                <p className="text-sm text-muted-foreground text-center">
                  Complete your payment to activate this tier
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PaymentButton;
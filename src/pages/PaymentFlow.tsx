import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';

const PaymentFlow = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handlePayment = async () => {
    setLoading(true);
    try {
      // For testing - this would normally take a bookId parameter
      const bookId = "test-book-id";
      
      // Simulate payment process
      toast.success("Payment simulation - redirecting to success page");
      
      // In real implementation, this would:
      // 1. Create Stripe checkout session for the specific book
      // 2. Redirect to Stripe
      // 3. Handle success/cancel callbacks
      // 4. Update book.is_paid = true on success
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Payment Flow - Test</title>
        <meta name="description" content="Test payment flow for autobiography book" />
      </Helmet>
      
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Unlock Your Full Book</h1>
            <p className="text-muted-foreground">
              You've reached the 1,500 word trial limit. Unlock unlimited writing for this book.
            </p>
          </div>

          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Full Book Access
                <Badge variant="secondary">Most Popular</Badge>
              </CardTitle>
              <CardDescription>
                Unlock unlimited writing, editing, and AI assistance for this book
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold">$9</div>
                <div className="text-sm text-muted-foreground">One-time payment per book</div>
              </div>
              
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Unlimited word count
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  AI-powered content generation
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Professional formatting
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Export to PDF/EPUB
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Lifetime access to this book
                </li>
              </ul>

              <Button 
                onClick={handlePayment} 
                disabled={loading}
                size="lg" 
                className="w-full"
              >
                {loading ? "Processing..." : "Unlock Full Book"}
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                Secure payment processed by Stripe. 30-day money-back guarantee.
              </p>
            </CardContent>
          </Card>

          <div className="text-center space-y-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              Continue with Trial (Read Only)
            </Button>
            
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Trial Summary</h3>
              <p className="text-sm text-muted-foreground">
                Words used: 1,500 / 1,500 (Trial limit reached)
              </p>
              <p className="text-sm text-muted-foreground">
                You can still read your content but cannot edit or add more until you upgrade.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentFlow;
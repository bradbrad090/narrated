import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Gift, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const giftCodeSchema = z.object({
  code: z.string()
    .min(1, 'Gift code is required')
    .regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Invalid code format. Use format: XXXX-XXXX-XXXX')
});

const RedeemGift = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [code, setCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const formatCodeInput = (input: string): string => {
    // Remove any non-alphanumeric characters
    const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Add dashes after every 4 characters
    const formatted = cleaned.match(/.{1,4}/g)?.join('-') || cleaned;
    
    // Limit to 14 characters (12 chars + 2 dashes)
    return formatted.slice(0, 14);
  };

  const handleCodeChange = (value: string) => {
    const formatted = formatCodeInput(value);
    setCode(formatted);
    setError(null);
    setValidationError(null);
  };

  const validateCode = (): boolean => {
    try {
      giftCodeSchema.parse({ code });
      setValidationError(null);
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setValidationError(err.errors[0].message);
      }
      return false;
    }
  };

  const handleRedeem = async () => {
    if (!validateCode()) {
      return;
    }

    setIsRedeeming(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('redeem-gift-code', {
        body: { code }
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.success) {
        toast({
          title: 'Gift Redeemed Successfully!',
          description: data.message || 'Your gift has been applied to your account.',
        });

        // Show gift message if present
        if (data.giftMessage || data.purchaserName) {
          setTimeout(() => {
            toast({
              title: data.purchaserName ? `From ${data.purchaserName}` : 'Gift Message',
              description: data.giftMessage || 'Enjoy your gift!',
              duration: 8000,
            });
          }, 1000);
        }

        // Redirect to dashboard or book page after short delay
        setTimeout(() => {
          if (data.bookId) {
            navigate(`/write/${data.bookId}`);
          } else {
            navigate('/dashboard');
          }
        }, 2000);
      }
    } catch (err) {
      console.error('Redemption error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to redeem gift code';
      setError(errorMessage);
      
      toast({
        title: 'Redemption Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isRedeeming) {
      handleRedeem();
    }
  };

  return (
    <>
      <Helmet>
        <title>Redeem Gift Code | Narrated</title>
        <meta 
          name="description" 
          content="Redeem your Narrated gift code to unlock your autobiography package and start preserving your life story." 
        />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
        <Header />

        <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Gift className="h-10 w-10 text-primary" />
                </div>
              </div>
              
              <CardTitle className="text-2xl">Redeem Your Gift</CardTitle>
              <CardDescription>
                Enter your gift code below to unlock your autobiography package
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Code Input */}
              <div className="space-y-2">
                <Label htmlFor="giftCode">
                  Gift Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="giftCode"
                  type="text"
                  placeholder="XXXX-XXXX-XXXX"
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isRedeeming}
                  className={`text-center text-lg font-mono tracking-wider ${
                    validationError ? 'border-destructive' : ''
                  }`}
                  maxLength={14}
                  autoComplete="off"
                  autoFocus
                />
                {validationError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Format: XXXX-XXXX-XXXX (letters and numbers only)
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Information Box */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  What happens after redemption:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-6">
                  <li>Your account will be upgraded to the gifted tier</li>
                  <li>All tier features will be unlocked immediately</li>
                  <li>You can start creating your autobiography right away</li>
                </ul>
              </div>

              {/* Redeem Button */}
              <Button
                onClick={handleRedeem}
                disabled={isRedeeming || !code}
                className="w-full"
                size="lg"
              >
                {isRedeeming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redeeming...
                  </>
                ) : (
                  <>
                    <Gift className="mr-2 h-4 w-4" />
                    Redeem Gift Code
                  </>
                )}
              </Button>

              {/* Help Text */}
              <div className="text-center space-y-2 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Don't have a gift code?
                </p>
                <Button 
                  variant="link" 
                  onClick={() => navigate('/gift')}
                  className="text-sm"
                >
                  Purchase a gift for someone
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default RedeemGift;

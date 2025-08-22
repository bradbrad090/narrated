import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [bookId, setBookId] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const bookIdParam = searchParams.get('book_id');
    
    if (!sessionId || !bookIdParam) {
      setVerificationStatus('failed');
      setIsVerifying(false);
      return;
    }
    
    setBookId(bookIdParam);
    verifyPayment(sessionId, bookIdParam);
  }, [searchParams]);

  const verifyPayment = async (sessionId: string, bookId: string) => {
    try {
      console.log('Verifying payment:', { sessionId, bookId });
      
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: {
          sessionId: sessionId,
          bookId: bookId
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success && data.paymentStatus === 'paid') {
        setVerificationStatus('success');
        toast({
          title: "Payment Successful!",
          description: "Your book tier has been upgraded successfully.",
        });
      } else {
        setVerificationStatus('failed');
        toast({
          title: "Payment Verification Failed",
          description: "There was an issue verifying your payment. Please contact support.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setVerificationStatus('failed');
      toast({
        title: "Verification Error",
        description: error instanceof Error ? error.message : "Failed to verify payment",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleContinue = () => {
    if (bookId) {
      navigate(`/write/${bookId}`);
    } else {
      navigate('/dashboard');
    }
  };

  const handleRetry = () => {
    const sessionId = searchParams.get('session_id');
    const bookIdParam = searchParams.get('book_id');
    
    if (sessionId && bookIdParam) {
      setIsVerifying(true);
      setVerificationStatus('pending');
      verifyPayment(sessionId, bookIdParam);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {isVerifying && (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <CardTitle>Verifying Payment...</CardTitle>
              <CardDescription>
                Please wait while we confirm your payment
              </CardDescription>
            </>
          )}
          
          {!isVerifying && verificationStatus === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <CardTitle>Payment Successful!</CardTitle>
              <CardDescription>
                Your book tier has been upgraded successfully
              </CardDescription>
            </>
          )}
          
          {!isVerifying && verificationStatus === 'failed' && (
            <>
              <AlertCircle className="h-12 w-12 mx-auto text-red-500" />
              <CardTitle>Payment Verification Failed</CardTitle>
              <CardDescription>
                There was an issue verifying your payment
              </CardDescription>
            </>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {!isVerifying && verificationStatus === 'success' && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  ✅ Payment confirmed<br />
                  ✅ Book tier upgraded<br />
                  ✅ All features unlocked
                </p>
              </div>
              
              <Button onClick={handleContinue} className="w-full">
                Continue to Your Book
              </Button>
            </div>
          )}
          
          {!isVerifying && verificationStatus === 'failed' && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700">
                  If your payment was successful but verification failed, please contact our support team with your session ID:
                </p>
                <code className="text-xs break-all">
                  {searchParams.get('session_id')}
                </code>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleRetry} variant="outline" className="flex-1">
                  Retry Verification
                </Button>
                <Button onClick={handleContinue} className="flex-1">
                  Continue Anyway
                </Button>
              </div>
            </div>
          )}
          
          {isVerifying && (
            <div className="text-center text-sm text-muted-foreground">
              This may take a few moments...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
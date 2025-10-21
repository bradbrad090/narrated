import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Gift, Mail, Heart } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const GiftSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const recipientEmail = searchParams.get('recipient_email');
  const purchaserEmail = searchParams.get('purchaser_email');
  const tier = searchParams.get('tier');

  const tierNames: Record<string, string> = {
    basic: 'Basic',
    standard: 'Standard',
    premium: 'Premium'
  };

  return (
    <>
      <Helmet>
        <title>Gift Purchase Successful - Thank You | Narrated</title>
        <meta 
          name="description" 
          content="Your gift purchase has been confirmed. The recipient will receive an email with their unique gift code." 
        />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
        <Header />

        <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <Card className="w-full max-w-2xl shadow-xl">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="relative">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                  <Gift className="h-8 w-8 text-primary absolute -bottom-1 -right-1 bg-background rounded-full p-1" />
                </div>
              </div>
              
              <CardTitle className="text-3xl">Gift Purchase Successful!</CardTitle>
              <CardDescription className="text-base">
                Your gift has been sent successfully
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Confirmation Details */}
              <div className="bg-green-50 dark:bg-green-950/20 p-6 rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">
                      Payment Confirmed
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Your payment has been processed successfully
                    </p>
                  </div>
                </div>

                {tier && (
                  <div className="flex items-start gap-3">
                    <Gift className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">
                        {tierNames[tier] || tier} Package
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Gift package tier selected
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">
                      Emails Sent
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Both you and the recipient have been notified
                    </p>
                  </div>
                </div>
              </div>

              {/* What Happens Next */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  What Happens Next
                </h3>
                
                <ol className="space-y-3 ml-7">
                  {recipientEmail && (
                    <li className="text-sm">
                      <span className="font-medium">Recipient Email:</span>
                      <br />
                      <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">
                        {recipientEmail}
                      </code>
                      <p className="text-muted-foreground mt-1">
                        Will receive an email with a unique gift code
                      </p>
                    </li>
                  )}
                  
                  {purchaserEmail && (
                    <li className="text-sm">
                      <span className="font-medium">Confirmation Email:</span>
                      <br />
                      <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">
                        {purchaserEmail}
                      </code>
                      <p className="text-muted-foreground mt-1">
                        You'll receive a confirmation with purchase details
                      </p>
                    </li>
                  )}
                  
                  <li className="text-sm">
                    <span className="font-medium">Redemption:</span>
                    <p className="text-muted-foreground mt-1">
                      The recipient can redeem their gift code when they sign up or log in
                    </p>
                  </li>
                  
                  <li className="text-sm">
                    <span className="font-medium">Start Creating:</span>
                    <p className="text-muted-foreground mt-1">
                      After redemption, they can immediately start creating their autobiography
                    </p>
                  </li>
                </ol>
              </div>

              {/* Important Information */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">Important Information:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Gift codes are valid for 1 year from purchase date</li>
                  <li>The recipient can redeem the code at any time within this period</li>
                  <li>Both emails may take a few minutes to arrive</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  onClick={() => navigate('/')} 
                  variant="outline"
                  className="flex-1"
                >
                  Return Home
                </Button>
                <Button 
                  onClick={() => navigate('/gift')} 
                  className="flex-1"
                >
                  <Gift className="mr-2 h-4 w-4" />
                  Send Another Gift
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

export default GiftSuccess;

import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail } from "lucide-react";

const Contact = () => {
  return (
    <>
      <Helmet>
        <title>Contact Narrated - AI Autobiography Writing Support</title>
        <meta name="description" content="Get help with your autobiography project. Contact our Perth-based team for questions about AI-assisted life story writing, pricing, or technical support." />
        <meta name="keywords" content="autobiography support, AI writing help, contact narrated, Perth autobiography service, life story assistance" />
        <link rel="canonical" href="https://narrated.com/contact" />
      </Helmet>
      <div className="min-h-screen">
      <Header />
      <div className="pt-20 pb-16">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
            <p className="text-xl text-muted-foreground">
              We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>
          
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Send us a message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input placeholder="Your Name" />
              </div>
              <div>
                <Input type="email" placeholder="Your Email" />
              </div>
              <div>
                <Input placeholder="Subject" />
              </div>
              <div>
                <Textarea placeholder="Your Message" rows={6} />
              </div>
              <Button className="w-full">Send Message</Button>
            </CardContent>
          </Card>

          <div className="max-w-2xl mx-auto mt-12">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-muted"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-background text-muted-foreground">or</span>
              </div>
            </div>

            <div className="mt-8 text-center p-8 rounded-lg bg-muted/50 border border-muted">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Mail className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Contact us via email</h3>
              </div>
              <a 
                href="mailto:hello@narrated.com.au" 
                className="text-primary hover:text-primary/80 transition-colors font-medium text-lg"
              >
                hello@narrated.com.au
              </a>
            </div>
          </div>
        </div>
      </div>
      <Footer />
      </div>
    </>
  );
};

export default Contact;
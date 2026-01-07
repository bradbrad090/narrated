import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const FAQ = () => {
  const faqs = [
    {
      question: "What is Narrated and how does it work?",
      answer: "Narrated uses AI-guided conversations to help you create your life story. Simply have a conversation with our AI assistant about your memories, and it will craft them into beautifully written chapters. Start with a free chapter, then upgrade to create your complete autobiography."
    },
    {
      question: "Do I really get a free chapter?",
      answer: "Yes! Everyone starts with our free tier - one professionally written chapter delivered via email. No credit card required. It's the perfect way to experience the magic of seeing your memories transformed into a written story."
    },
    {
      question: "What if I don't know where to start?",
      answer: "Our AI assistant guides you through the entire process. It asks thoughtful questions about different periods of your life - childhood, career, family, relationships - helping you recall and share memories naturally. Just pick any memory that comes to mind and start talking!"
    },
    {
      question: "Can I use voice or do I have to type?",
      answer: "Both! You can type your responses or use voice recording - whatever feels most comfortable. Many users prefer voice input as it makes storytelling feel more natural and conversational."
    },
    {
      question: "What's the difference between the pricing tiers?",
      answer: "Free tier includes 1 chapter via email. Basic ($49) gives you unlimited chapters and a digital PDF with up to 100 photos. Standard ($199) adds a professionally printed hardcover book. Premium ($399) includes an upgraded premium hardcover with 5 additional copies, perfect for sharing with family."
    },
    {
      question: "How does purchasing and upgrading work?",
      answer: "You can start for free and upgrade anytime. When you upgrade to a paid tier, you only pay the difference in price. For example, if you have Basic ($49) and want Standard ($199), you only pay $150 more. All your conversations and chapters are preserved when you upgrade."
    },
    {
      question: "When do I get charged?",
      answer: "Never for the free tier. For paid plans, you're charged a one-time payment when you select and confirm your tier. There are no subscriptions or recurring charges - just a single payment for your autobiography."
    },
    {
      question: "What format will my autobiography be in?",
      answer: "Free tier delivers via email. Basic tier includes a digital PDF download. Standard and Premium tiers include both a digital PDF and a professionally printed hardcover book with custom cover design."
    },
    {
      question: "Is my personal information secure?",
      answer: "Absolutely. We use bank-level encryption and secure cloud storage for all your conversations and personal information. Your data is never shared with third parties or used to train AI models. You retain full ownership and copyright of your story."
    },
    {
      question: "Can I include photos in my autobiography?",
      answer: "Yes! Basic and Standard plans include up to 100 photos. Premium plan offers unlimited photo uploads. Simply upload digital photos (JPG, PNG, or HEIC) and they'll be professionally integrated into your chapters."
    },
    {
      question: "Can I add more content later?",
      answer: "Yes! You can continue having conversations and adding chapters anytime. Your autobiography is never truly finished - you can always add new memories, stories, and photos as you remember them."
    },
    {
      question: "Do you offer refunds?",
      answer: "Yes, we offer a 30-day money-back guarantee on all paid plans. If you're not completely satisfied with your autobiography, we'll provide a full refund - no questions asked."
    },
    {
      question: "Can family members contribute to the story?",
      answer: "Absolutely! Family members can participate in your conversations, and doing interviews as a group can be especially beneficial. Multiple perspectives help create a more encompassing and complete story, capturing memories and details that one person alone might not remember."
    },
    {
      question: "What devices can I use?",
      answer: "Narrated works on any device with a web browser - desktop, laptop, tablet, or smartphone. No app download required. Your conversations and chapters sync across all your devices automatically."
    },
    {
      question: "How long until I receive my physical book?",
      answer: "For Standard and Premium plans with printed books, delivery takes 2-3 weeks after you finalize your content. Digital PDFs are available for instant download as soon as your chapters are complete."
    }
  ];

  return (
    <>
      <Helmet>
        <title>Autobiography Writing FAQ - Common Questions | Narrated</title>
        <meta name="description" content="Answers to frequently asked questions about AI-assisted autobiography writing. Learn about our process, pricing, timelines, and what makes Narrated different." />
        <meta name="keywords" content="autobiography FAQ, AI writing questions, memoir writing help, life story FAQ, Narrated questions" />
        <link rel="canonical" href="https://narrated.com/faq" />
      </Helmet>
      <div className="min-h-screen bg-gradient-subtle">
        <Header />
        
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-6 max-w-4xl">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
                Frequently Asked Questions
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Everything you need to know about preserving your life story with Narrated.
              </p>
            </div>

            {/* FAQ Accordion */}
            <Card className="mb-12">
              <CardContent className="p-6">
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent>
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* Call to Action */}
            <div className="text-center bg-card rounded-2xl p-8 shadow-elegant">
              <h2 className="text-2xl font-semibold mb-4">Still Have Questions?</h2>
              <p className="text-muted-foreground mb-6">
                Can't find the answer you're looking for? We're here to help you get started on your autobiography journey.
              </p>
              <Button 
                size="lg" 
                className="bg-gradient-accent text-accent-foreground font-semibold px-8 py-3"
                onClick={() => window.location.href = '/contact'}
              >
                Contact Us
              </Button>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default FAQ;
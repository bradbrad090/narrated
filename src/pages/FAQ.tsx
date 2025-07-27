import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const FAQ = () => {
  const faqs = [
    {
      question: "How long does the process take?",
      answer: "Most autobiographies are completed within 4-8 weeks, depending on the plan you choose and the number of conversation sessions required."
    },
    {
      question: "What if I don't know where to start?",
      answer: "Our AI assistant is designed to guide you through the process. It will ask thoughtful questions to help you recall and organize your memories naturally."
    },
    {
      question: "How many conversation sessions do I need?",
      answer: "This varies by plan and personal preference. Most people find 6-8 sessions sufficient for a comprehensive autobiography, but you can always add more sessions if needed."
    },
    {
      question: "Can I review and edit my story before it's finalized?",
      answer: "Absolutely! You'll receive drafts throughout the process and have multiple opportunities to review, provide feedback, and request revisions."
    },
    {
      question: "What format will my autobiography be in?",
      answer: "All plans include a digital PDF version. Higher-tier plans also include professionally printed hardcover books with custom cover design."
    },
    {
      question: "Is my personal information secure?",
      answer: "Yes, we take privacy very seriously. All conversations and personal information are encrypted and stored securely. We never share your stories with third parties."
    },
    {
      question: "Can I include photos in my autobiography?",
      answer: "Yes! Our Premium Heritage plan includes photo integration. You can provide digital photos that will be professionally incorporated into your book."
    },
    {
      question: "What if I want to add more content later?",
      answer: "You can always purchase additional conversation sessions to expand your autobiography. We'll seamlessly integrate new content with your existing story."
    },
    {
      question: "Do you offer refunds?",
      answer: "Yes, we offer a 30-day money-back guarantee. If you're not completely satisfied with your autobiography, we'll provide a full refund."
    },
    {
      question: "Can family members contribute to the story?",
      answer: "Absolutely! Family members can participate in conversation sessions or provide additional memories and perspectives that will be woven into your narrative."
    }
  ];

  return (
    <>
      <Helmet>
        <title>FAQ - Frequently Asked Questions | Narrated</title>
        <meta name="description" content="Get answers to common questions about our AI autobiography writing service. Learn about our process, pricing, timeline, and how we preserve your life stories." />
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
                onClick={() => window.location.href = '/auth'}
              >
                Get Started Today
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
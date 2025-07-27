import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const FAQ = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-4xl">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-muted-foreground">
              Everything you need to know about creating your autobiography with Narrated.
            </p>
          </div>

          {/* FAQ Accordion */}
          <Accordion type="single" collapsible className="mb-16">
            <AccordionItem value="how-it-works">
              <AccordionTrigger className="text-left">
                How does the AI conversation work?
              </AccordionTrigger>
              <AccordionContent>
                Our AI assistant engages you in natural conversation about your life experiences. 
                It asks thoughtful follow-up questions to help you remember details and explore 
                your stories more deeply. You can speak naturally, and the AI will guide the 
                conversation to capture the most meaningful aspects of your life.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="time-required">
              <AccordionTrigger className="text-left">
                How long does it take to complete an autobiography?
              </AccordionTrigger>
              <AccordionContent>
                This depends entirely on you! Some people complete their story in a few focused 
                sessions over a week, while others prefer to take their time over several months. 
                There's no rush - you can work at your own pace and save your progress as you go.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="quality">
              <AccordionTrigger className="text-left">
                Will my autobiography sound professional?
              </AccordionTrigger>
              <AccordionContent>
                Absolutely. While the AI maintains your unique voice and personality, it also 
                ensures professional writing quality. The final result reads like a polished 
                memoir while staying true to your authentic voice and experiences.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="privacy">
              <AccordionTrigger className="text-left">
                Is my personal information secure?
              </AccordionTrigger>
              <AccordionContent>
                Yes, we take privacy very seriously. Your stories and personal information are 
                encrypted and stored securely. You own your content completely, and we never 
                share your information with third parties. You can delete your account and 
                all associated data at any time.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="editing">
              <AccordionTrigger className="text-left">
                Can I edit my autobiography after it's written?
              </AccordionTrigger>
              <AccordionContent>
                Yes! You have full control to edit, revise, and refine your autobiography at 
                any time. You can add new chapters, modify existing content, or reorganize 
                your story however you'd like.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="formats">
              <AccordionTrigger className="text-left">
                What formats can I download my autobiography in?
              </AccordionTrigger>
              <AccordionContent>
                Depending on your plan, you can download your autobiography as a PDF, EPUB, 
                or even order a professional printed book. All formats are beautifully 
                formatted and ready to share with family and friends.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="support">
              <AccordionTrigger className="text-left">
                What if I need help during the process?
              </AccordionTrigger>
              <AccordionContent>
                We're here to help! All plans include access to our support team. Premium 
                plan users get priority support, and Legacy plan users receive dedicated 
                white-glove service to ensure your experience is perfect.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="family">
              <AccordionTrigger className="text-left">
                Can I create autobiographies for family members?
              </AccordionTrigger>
              <AccordionContent>
                Yes! Our Legacy plan is designed for families who want to preserve multiple 
                stories. You can help elderly relatives tell their stories or create a 
                collection of family histories. Contact us to discuss multi-person projects.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Contact Section */}
          <div className="text-center bg-background/50 rounded-xl p-8 border border-border/50">
            <h3 className="text-2xl font-bold text-foreground mb-4">Still Have Questions?</h3>
            <p className="text-muted-foreground mb-6">
              We're here to help you tell your story. Get in touch with our friendly support team.
            </p>
            <Button 
              size="lg" 
              className="bg-gradient-accent text-accent-foreground font-semibold"
              onClick={() => window.location.href = '/auth'}
            >
              Get Started Today
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;
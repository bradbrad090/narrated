import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle } from "lucide-react";

const CallToActionSection = () => {
  return (
    <section className="py-24 bg-gradient-hero">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-primary-foreground mb-6">
            Ready to Begin Your
            <span className="block text-transparent bg-gradient-accent bg-clip-text">
              Life Story?
            </span>
          </h2>
          
          <p className="text-xl md:text-2xl text-primary-foreground/90 mb-12 leading-relaxed">
            Join hundreds of people who have already preserved their legacy with Narrated.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="flex items-center justify-center gap-3 text-primary-foreground/90">
              <CheckCircle className="w-5 h-5 text-accent" />
              <span>30-Day Money Back Guarantee</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-primary-foreground/90">
              <CheckCircle className="w-5 h-5 text-accent" />
              <span>Unlimited Revisions</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-primary-foreground/90">
              <CheckCircle className="w-5 h-5 text-accent" />
              <span>Premium Print Quality</span>
            </div>
          </div>
          
          <div className="bg-card/10 backdrop-blur-sm rounded-2xl p-8 mb-12 border border-primary-foreground/20">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="text-left">
                <h3 className="text-2xl font-semibold text-primary-foreground mb-4">
                  Launch Special
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary-foreground/80">
                    <span className="line-through">$399</span>
                    <span className="text-accent font-bold text-2xl">$199</span>
                  </div>
                  <p className="text-primary-foreground/70 text-sm">
                     Limited time offer - Save $200
                  </p>
                </div>
              </div>
              
              <div className="text-left">
                <h4 className="font-semibold text-primary-foreground mb-3">
                  What's Included:
                </h4>
                <ul className="space-y-2 text-primary-foreground/80 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-accent" />
                    <span>Unlimited AI conversations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-accent" />
                    <span>Professional editing & formatting</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-accent" />
                    <span>Premium hardcover book</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-accent" />
                    <span>Free worldwide shipping</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <Button 
            variant="accent" 
            size="lg" 
            className="text-base sm:text-xl px-6 sm:px-12 py-4 sm:py-6 font-bold group w-full sm:w-auto max-w-xs sm:max-w-none mx-auto"
          >
            <span className="sm:hidden">Start Now</span>
            <span className="hidden sm:inline">Start Your Autobiography Now</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform ml-2" />
          </Button>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent/10 rounded-full blur-3xl"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary-glow/10 rounded-full blur-3xl"></div>
    </section>
  );
};

export default CallToActionSection;
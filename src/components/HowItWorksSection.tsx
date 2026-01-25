import { MessageCircle, PenTool, Truck } from "lucide-react";
import conversationImage from "@/assets/conversation-family.jpg";
import deliveryImage from "@/assets/family-book-delivery.jpg";
const HowItWorksSection = () => {
  return <section className="py-12 sm:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-16">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-6">
            How It Works
          </h2>
          <p className="text-sm sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            From conversation to published autobiography in three simple steps
          </p>
        </div>
        
        {/* Mobile: Compact vertical timeline */}
        <div className="sm:hidden max-w-sm mx-auto space-y-6">
          {/* Step 1 Mobile */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-gradient-accent rounded-full flex items-center justify-center shadow-glow flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-accent-foreground" />
              </div>
              <div className="w-0.5 flex-1 bg-border mt-2"></div>
            </div>
            <div className="pb-4">
              <h3 className="text-lg font-semibold text-foreground mb-1">Share Your Story</h3>
              <p className="text-sm text-muted-foreground">Talk about your memories and experiences.</p>
            </div>
          </div>
          
          {/* Step 2 Mobile */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-gradient-accent rounded-full flex items-center justify-center shadow-glow flex-shrink-0">
                <PenTool className="w-6 h-6 text-accent-foreground" />
              </div>
              <div className="w-0.5 flex-1 bg-border mt-2"></div>
            </div>
            <div className="pb-4">
              <h3 className="text-lg font-semibold text-foreground mb-1">We Write Your Story</h3>
              <p className="text-sm text-muted-foreground">We transform your stories into a beautiful autobiography.</p>
            </div>
          </div>
          
          {/* Step 3 Mobile */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-gradient-accent rounded-full flex items-center justify-center shadow-glow flex-shrink-0">
                <Truck className="w-6 h-6 text-accent-foreground" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Receive Your Book</h3>
              <p className="text-sm text-muted-foreground">Get your professionally printed hardcover book delivered.</p>
            </div>
          </div>
        </div>
        
        {/* Desktop: Full grid layout */}
        <div className="hidden sm:grid grid-cols-3 gap-6 sm:gap-12 max-w-6xl mx-auto">
          {/* Step 1 */}
          <div className="text-center group">
            <div className="relative mb-4 sm:mb-8">
              <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-accent rounded-full flex items-center justify-center mx-auto shadow-glow group-hover:shadow-elegant transition-elegant">
                <MessageCircle className="w-8 h-8 sm:w-12 sm:h-12 text-accent-foreground" />
              </div>
              
            </div>
            <h3 className="text-lg sm:text-2xl font-semibold text-foreground mb-2 sm:mb-4">
              Share Your Story
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4 sm:mb-6">
              <span className="hidden sm:inline">Have natural conversations about your life experiences, memories, and the moments that matter most to you.</span>
              <span className="sm:hidden">Talk about your memories and experiences.</span>
            </p>
            <div className="rounded-lg overflow-hidden shadow-card hidden sm:block">
              <img src={conversationImage} alt="Family sharing stories around dinner table" className="w-full h-48 object-cover" />
            </div>
          </div>
          
          {/* Step 2 */}
          <div className="text-center group">
            <div className="relative mb-4 sm:mb-8">
              <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-accent rounded-full flex items-center justify-center mx-auto shadow-glow group-hover:shadow-elegant transition-elegant">
                <PenTool className="w-8 h-8 sm:w-12 sm:h-12 text-accent-foreground" />
              </div>
              
            </div>
            <h3 className="text-lg sm:text-2xl font-semibold text-foreground mb-2 sm:mb-4">
              We Write and Edit your Story
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4 sm:mb-6">
              <span className="hidden sm:inline">We transform your conversations into a beautifully written autobiography that captures your unique story.</span>
              <span className="sm:hidden">We transform your stories into a beautiful autobiography.</span>
            </p>
            <div className="bg-card rounded-lg p-4 sm:p-6 shadow-card border hidden sm:block">
              <div className="space-y-3">
                <div className="h-2 bg-muted rounded w-full"></div>
                <div className="h-2 bg-muted rounded w-4/5"></div>
                <div className="h-2 bg-gradient-accent rounded w-3/5"></div>
                <div className="h-2 bg-muted rounded w-5/6"></div>
              </div>
              <p className="text-sm text-muted-foreground mt-4 italic">
                "Chapter 3: My first day at school..."
              </p>
            </div>
          </div>
          
          {/* Step 3 */}
          <div className="text-center group">
            <div className="relative mb-4 sm:mb-8">
              <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-accent rounded-full flex items-center justify-center mx-auto shadow-glow group-hover:shadow-elegant transition-elegant">
                <Truck className="w-8 h-8 sm:w-12 sm:h-12 text-accent-foreground" />
              </div>
              
            </div>
            <h3 className="text-lg sm:text-2xl font-semibold text-foreground mb-2 sm:mb-4">
              Receive Your Book
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4 sm:mb-6">
              <span className="hidden sm:inline">Your autobiography is professionally printed and delivered to your door as a beautiful hardcover book.</span>
              <span className="sm:hidden">Get your professionally printed hardcover book delivered.</span>
            </p>
            <div className="rounded-lg overflow-hidden shadow-card hidden sm:block">
              <img src={deliveryImage} alt="Family enjoying their photo album together" className="w-full h-48 object-cover" />
            </div>
          </div>
        </div>
        
      </div>
    </section>;
};
export default HowItWorksSection;
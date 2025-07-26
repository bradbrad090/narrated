import { MessageCircle, PenTool, Truck } from "lucide-react";
import conversationImage from "@/assets/conversation-flow.jpg";
import deliveryImage from "@/assets/book-delivery.jpg";

const HowItWorksSection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From conversation to published autobiography in three simple steps
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto">
          {/* Step 1 */}
          <div className="text-center group">
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-accent rounded-full flex items-center justify-center mx-auto shadow-glow group-hover:shadow-elegant transition-elegant">
                <MessageCircle className="w-12 h-12 text-accent-foreground" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                1
              </div>
            </div>
            <h3 className="text-2xl font-semibold text-foreground mb-4">
              Share Your Story
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Have natural conversations with our AI about your life experiences, memories, and the moments that matter most to you.
            </p>
            <div className="rounded-lg overflow-hidden shadow-card">
              <img 
                src={conversationImage} 
                alt="AI conversation visualization" 
                className="w-full h-48 object-cover"
              />
            </div>
          </div>
          
          {/* Step 2 */}
          <div className="text-center group">
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-accent rounded-full flex items-center justify-center mx-auto shadow-glow group-hover:shadow-elegant transition-elegant">
                <PenTool className="w-12 h-12 text-accent-foreground" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                2
              </div>
            </div>
            <h3 className="text-2xl font-semibold text-foreground mb-4">
              AI Crafts Your Book
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Our advanced AI transforms your conversations into a beautifully written, coherent autobiography that captures your unique voice.
            </p>
            <div className="bg-card rounded-lg p-6 shadow-card border">
              <div className="space-y-3">
                <div className="h-2 bg-muted rounded w-full"></div>
                <div className="h-2 bg-muted rounded w-4/5"></div>
                <div className="h-2 bg-gradient-accent rounded w-3/5"></div>
                <div className="h-2 bg-muted rounded w-5/6"></div>
              </div>
              <p className="text-sm text-muted-foreground mt-4 italic">
                "Chapter 3: The summer I turned sixteen..."
              </p>
            </div>
          </div>
          
          {/* Step 3 */}
          <div className="text-center group">
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-accent rounded-full flex items-center justify-center mx-auto shadow-glow group-hover:shadow-elegant transition-elegant">
                <Truck className="w-12 h-12 text-accent-foreground" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                3
              </div>
            </div>
            <h3 className="text-2xl font-semibold text-foreground mb-4">
              Receive Your Book
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Your autobiography is professionally printed on premium paper and delivered to your door as a beautiful hardcover book.
            </p>
            <div className="rounded-lg overflow-hidden shadow-card">
              <img 
                src={deliveryImage} 
                alt="Premium book delivery" 
                className="w-full h-48 object-cover"
              />
            </div>
          </div>
        </div>
        
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-4 bg-card rounded-full px-8 py-4 shadow-card">
            <span className="text-sm text-muted-foreground">Typical timeline:</span>
            <span className="font-semibold text-foreground">2-3 weeks from start to delivery</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
import { Heart, Clock, Users, Award, Shield, Sparkles } from "lucide-react";

const BenefitsSection = () => {
  const benefits = [
    {
      icon: Heart,
      title: "Preserve Your Legacy",
      description: "Create a lasting treasure for your family and future generations to cherish forever."
    },
    {
      icon: Clock,
      title: "Save Time & Effort",
      description: "No more struggling with blank pages. Our AI guides you through the entire storytelling process."
    },
    {
      icon: Users,
      title: "Professional Quality",
      description: "Get the expertise of professional ghostwriters at a fraction of the cost and time."
    },
    {
      icon: Award,
      title: "Your Unique Voice",
      description: "Our AI learns your speaking style to ensure the final book truly sounds like you."
    },
    {
      icon: Shield,
      title: "Complete Privacy",
      description: "Your stories are handled with the utmost confidentiality and security throughout the process."
    },
    {
      icon: Sparkles,
      title: "Beautiful Presentation",
      description: "Premium hardcover binding with custom cover design makes your book a work of art."
    }
  ];

  return (
    <section className="py-24 bg-gradient-subtle">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Why Choose AI Autobiography?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Combining cutting-edge AI technology with the timeless art of storytelling 
            to create something truly meaningful
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div 
                key={index}
                className="bg-card rounded-xl p-8 shadow-card hover:shadow-elegant transition-elegant group"
              >
                <div className="mb-6">
                  <div className="w-16 h-16 bg-gradient-accent rounded-lg flex items-center justify-center group-hover:shadow-glow transition-elegant">
                    <Icon className="w-8 h-8 text-accent-foreground" />
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  {benefit.title}
                </h3>
                
                <p className="text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>
        
        <div className="mt-16 text-center">
          <div className="bg-card rounded-2xl p-8 shadow-elegant max-w-3xl mx-auto">
            <h3 className="text-2xl font-semibold text-foreground mb-4">
              Still have questions?
            </h3>
            <p className="text-muted-foreground mb-6">
              Our team is here to help you understand how we can bring your life story to life.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-gradient-accent text-accent-foreground px-6 py-3 rounded-lg font-semibold shadow-card hover:shadow-glow transition-elegant">
                Schedule a Call
              </button>
              <button className="border border-border text-foreground px-6 py-3 rounded-lg font-semibold hover:bg-muted transition-elegant">
                View FAQ
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
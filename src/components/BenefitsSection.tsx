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
      description: "No more struggling with blank pages. Our intelligent assistant guides you through the entire storytelling process."
    },
    {
      icon: Users,
      title: "Professional Quality",
      description: "Get the expertise of professional ghostwriters at a fraction of the cost and time."
    },
    {
      icon: Award,
      title: "Your Unique Voice",
      description: "Our intelligent system learns your speaking style to ensure the final book truly sounds like you."
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
    <section className="py-12 sm:py-24 bg-gradient-subtle">
      <div className="container mx-auto px-6">
        <div className="text-center mb-8 sm:mb-16">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-6">
            Why Choose Narrated?
          </h2>
          <p className="text-base sm:text-xl text-muted-foreground max-w-3xl mx-auto hidden sm:block">
            Combining cutting-edge intelligent technology with the timeless art of storytelling 
            to create something truly meaningful
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div 
                key={index}
                className="bg-card rounded-lg sm:rounded-xl p-4 sm:p-8 shadow-card hover:shadow-elegant transition-elegant group"
              >
                <div className="mb-3 sm:mb-6 text-center">
                  <div className="w-10 h-10 sm:w-16 sm:h-16 bg-gradient-accent rounded-lg flex items-center justify-center group-hover:shadow-glow transition-elegant mx-auto">
                    <Icon className="w-5 h-5 sm:w-8 sm:h-8 text-accent-foreground" />
                  </div>
                </div>
                
                 <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2 sm:mb-4 text-center">
                   {benefit.title}
                 </h3>
                
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>
        
      </div>
    </section>
  );
};

export default BenefitsSection;
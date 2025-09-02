import { CheckCircle } from "lucide-react";

const BenefitsSection = () => {
  const benefits = [
    {
      title: "Preserve Your Legacy",
      description: "Create a lasting treasure for your family and future generations to cherish forever."
    },
    {
      title: "Save Time & Effort", 
      description: "No more struggling with blank pages. Our intelligent assistant guides you through the entire storytelling process."
    },
    {
      title: "Professional Quality",
      description: "Get the expertise of professional ghostwriters at a fraction of the cost and time."
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
        
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="bg-card rounded-xl p-6 sm:p-8 shadow-card hover:shadow-elegant transition-elegant border border-border/50"
              >
                <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-3 sm:mb-4">
                  {benefit.title}
                </h3>
                
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
import { CheckCircle } from "lucide-react";

const BenefitsSection = () => {
  const benefits = [
    {
      title: "Preserve Your Legacy",
      description: "Create a lasting treasure for your family and future generations to cherish forever.",
      highlight: "Family Heritage"
    },
    {
      title: "Save Time & Effort", 
      description: "No more struggling with blank pages. Our intelligent assistant guides you through the entire storytelling process.",
      highlight: "Effortless Writing"
    },
    {
      title: "Professional Quality",
      description: "Get the expertise of professional ghostwriters at a fraction of the cost and time.",
      highlight: "Expert Craftsmanship"
    },
    {
      title: "Complete Privacy",
      description: "Your stories are handled with the utmost confidentiality and security throughout the process.",
      highlight: "Secure & Private"
    },
    {
      title: "Beautiful Presentation",
      description: "Premium hardcover binding with custom cover design makes your book a work of art.", 
      highlight: "Premium Quality"
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
        
        {/* Desktop: 2 items top row, 3 items bottom row for better symmetry */}
        <div className="max-w-6xl mx-auto">
          {/* First row - 2 items centered */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-4 sm:mb-8 max-w-4xl mx-auto">
            {benefits.slice(0, 2).map((benefit, index) => (
              <div 
                key={index}
                className="bg-card rounded-xl p-6 sm:p-8 shadow-card hover:shadow-elegant transition-elegant group border border-border/50"
              >
                <div className="mb-4 sm:mb-6">
                  <div className="inline-flex items-center gap-2 bg-gradient-accent/10 rounded-full px-4 py-2 mb-4">
                    <CheckCircle className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium text-accent">{benefit.highlight}</span>
                  </div>
                </div>
                
                <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-3 sm:mb-4">
                  {benefit.title}
                </h3>
                
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
          
          {/* Second row - 3 items */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
            {benefits.slice(2).map((benefit, index) => (
              <div 
                key={index + 2}
                className="bg-card rounded-xl p-6 sm:p-8 shadow-card hover:shadow-elegant transition-elegant group border border-border/50"
              >
                <div className="mb-4 sm:mb-6">
                  <div className="inline-flex items-center gap-2 bg-gradient-accent/10 rounded-full px-4 py-2 mb-4">
                    <CheckCircle className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium text-accent">{benefit.highlight}</span>
                  </div>
                </div>
                
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
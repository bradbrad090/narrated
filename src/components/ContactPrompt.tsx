import { Link } from "react-router-dom";

const ContactPrompt = () => {
  return (
    <section className="py-8 sm:py-12 bg-background">
      <div className="container mx-auto px-6 text-center">
        <p className="text-muted-foreground text-sm sm:text-base">
          Have more questions?{" "}
          <Link 
            to="/faq" 
            className="text-primary hover:text-primary/80 transition-colors underline"
          >
            Read our FAQ here
          </Link>
          {" "}or contact us at:{" "}
          <a 
            href="mailto:contact@narrated.com.au"
            className="text-primary hover:text-primary/80 transition-colors"
          >
            contact@narrated.com.au
          </a>
        </p>
      </div>
    </section>
  );
};

export default ContactPrompt;
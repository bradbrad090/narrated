import { BookOpen, Mail, Gift } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-8 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Brand */}
          <div className="text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start mb-4">
              <BookOpen className="w-6 h-6 text-accent" />
              <span className="text-lg font-bold">Narrated</span>
            </div>
            <p className="text-sm text-primary-foreground/70">
              Transform your memories into a beautiful autobiography with AI assistance.
            </p>
          </div>
          
          {/* Links */}
          <div className="text-center md:text-left">
            <h4 className="font-bold text-base mb-4 text-primary-foreground">Support</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li>
                <a href="/faq" className="hover:text-accent transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a href="/gift" className="hover:text-accent transition-colors flex items-center gap-2 justify-center md:justify-start">
                  <Gift className="w-4 h-4" />
                  Gift an Autobiography
                </a>
              </li>
              <li>
                <a href="/privacy-policy" className="hover:text-accent transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms-of-service" className="hover:text-accent transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
          
          {/* Contact */}
          <div className="text-center md:text-left">
            <h4 className="font-bold text-base mb-4 text-primary-foreground">Contact</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li>
                <a href="/contact" className="hover:text-accent transition-colors">
                  Send us a message
                </a>
              </li>
              <li className="flex items-center gap-2 justify-center md:justify-start">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <a href="mailto:contact@narrated.com.au" className="hover:text-accent transition-colors">
                  contact@narrated.com.au
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-primary-foreground/20 mt-6 sm:mt-8 pt-4 sm:pt-6 text-center">
          <p className="text-primary-foreground/60 text-xs sm:text-sm">
            © 2024 Narrated. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
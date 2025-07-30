import { BookOpen, Mail, Phone, MapPin } from "lucide-react";
const Footer = () => {
  return <footer className="bg-primary text-primary-foreground py-8">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-4">
          {/* Brand */}
          
          
          {/* Services */}
          <div>
            <h4 className="font-bold text-base mb-4 text-primary-foreground">Services</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li>
                <a href="#" className="hover:text-accent transition-colors">
                  Story Writing
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-accent transition-colors">
                  Custom Cover Design
                </a>
              </li>
            </ul>
          </div>
          
          {/* Support */}
          <div>
            <h4 className="font-bold text-base mb-4 text-primary-foreground">Support</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li>
                <a href="/faq" className="hover:text-accent transition-colors">
                  FAQ
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
          <div>
            <h4 className="font-bold text-base mb-4 text-primary-foreground">Contact</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/80">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>hello@aiautobiography.com</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Perth, Western Australia</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-primary-foreground/20 mt-6 pt-4 text-center">
          <p className="text-primary-foreground/60 text-sm">
            © 2024 Narrated. All rights reserved. Bringing your life story to life.
          </p>
        </div>
      </div>
    </footer>;
};
export default Footer;
import { BookOpen, Mail, Phone, MapPin } from "lucide-react";
const Footer = () => {
  return <footer className="bg-primary text-primary-foreground py-8 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-4">
          {/* Brand */}
          
          
          {/* Services */}
          <div className="text-center sm:text-left">
            <h4 className="font-bold text-base mb-4 text-primary-foreground">Services</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/80">
              <li>
                <a href="#" className="hover:text-accent transition-colors py-1 px-2 min-h-[32px] inline-block touch-manipulation">
                  Story Writing
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-accent transition-colors py-1 px-2 min-h-[32px] inline-block touch-manipulation">
                  Custom Cover Design
                </a>
              </li>
            </ul>
          </div>
          
          {/* Support */}
          <div className="text-center sm:text-left">
            <h4 className="font-bold text-base mb-4 text-primary-foreground">Support</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/80">
              <li>
                <a href="/faq" className="hover:text-accent transition-colors py-1 px-2 min-h-[32px] inline-block touch-manipulation">
                  FAQ
                </a>
              </li>
              <li>
                <a href="/privacy-policy" className="hover:text-accent transition-colors py-1 px-2 min-h-[32px] inline-block touch-manipulation">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms-of-service" className="hover:text-accent transition-colors py-1 px-2 min-h-[32px] inline-block touch-manipulation">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
          
          {/* Contact */}
          <div className="text-center sm:text-left sm:col-span-2 md:col-span-1">
            <h4 className="font-bold text-base mb-4 text-primary-foreground">Contact</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/80">
              <li className="flex items-center gap-2 justify-center sm:justify-start">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="break-words">hello@aiautobiography.com</span>
              </li>
              <li className="flex items-center gap-2 justify-center sm:justify-start">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>Perth, Western Australia</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-primary-foreground/20 mt-6 sm:mt-8 pt-4 sm:pt-6 text-center">
          <p className="text-primary-foreground/60 text-xs sm:text-sm leading-relaxed px-2">
            © 2024 Narrated. All rights reserved. Bringing your life story to life.
          </p>
        </div>
      </div>
    </footer>;
};
export default Footer;
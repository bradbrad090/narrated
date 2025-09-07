import { Helmet } from 'react-helmet-async';

interface SecurityHeadersProps {
  title?: string;
  description?: string;
  noIndex?: boolean;
}

export const SecurityHeaders = ({ 
  title = "Narrated - Your Life Story, Beautifully Written",
  description = "Create your autobiography with AI assistance. Guided conversations help you preserve your life story for future generations.",
  noIndex = false
}: SecurityHeadersProps) => {
  return (
    <Helmet>
      {/* Primary meta tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      
      {/* Security headers */}
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      <meta httpEquiv="X-Frame-Options" content="DENY" />
      <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
      <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
      <meta httpEquiv="Permissions-Policy" content="camera=(), microphone=(self), geolocation=(), interest-cohort=()" />
      
      {/* Content Security Policy */}
      <meta 
        httpEquiv="Content-Security-Policy" 
        content="default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com https://checkout.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https://keadkwromhlyvoyxvcmi.supabase.co https://keadkwromhlyvoyxvcmi.functions.supabase.co wss://keadkwromhlyvoyxvcmi.supabase.co https://api.openai.com https://api.stripe.com; frame-src https://js.stripe.com https://checkout.stripe.com; object-src 'none'; base-uri 'self';" 
      />
      
      {/* SEO and indexing */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={window.location.href} />
    </Helmet>
  );
};
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Img,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface PasswordResetEmailProps {
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
  user_email: string
}

export const PasswordResetEmail = ({
  token,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
  user_email,
}: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your Narrated account password</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header with branding */}
        <Section style={header}>
          <Heading style={brandName}>Narrated</Heading>
          <Text style={tagline}>Your Life Story, Written by You</Text>
        </Section>

        {/* Main content */}
        <Section style={content}>
          <Heading style={h1}>Reset Your Password</Heading>
          
          <Text style={text}>
            Hi there,
          </Text>
          
          <Text style={text}>
            We received a request to reset the password for your Narrated account ({user_email}). 
            Click the button below to create a new password:
          </Text>

          <Section style={buttonContainer}>
            <Link
              href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
              style={button}
            >
              Reset Password
            </Link>
          </Section>

          <Text style={text}>
            Or copy and paste this link into your browser:
          </Text>
          
          <Text style={linkText}>
            {`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
          </Text>

          <Text style={securityNote}>
            This password reset link will expire in 1 hour for security reasons.
          </Text>

          <Text style={text}>
            If you didn't request a password reset, you can safely ignore this email. 
            Your password will remain unchanged.
          </Text>
        </Section>

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            Best regards,<br />
            The Narrated Team
          </Text>
          
          <Text style={footerLink}>
            <Link href="https://narrated.com.au" style={link}>
              narrated.com.au
            </Link>
            {" | "}
            <Link href="https://narrated.com.au/contact" style={link}>
              Contact Support
            </Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default PasswordResetEmail

// Styles matching Narrated branding
const main = {
  backgroundColor: '#f9f8f6', // warm cream background
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
}

const header = {
  textAlign: 'center' as const,
  padding: '40px 0',
  backgroundColor: '#2d3748', // deep navy
  borderRadius: '8px 8px 0 0',
}

const brandName = {
  color: '#f9f8f6',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
  letterSpacing: '0.5px',
}

const tagline = {
  color: '#d4af37', // rich gold
  fontSize: '14px',
  margin: '8px 0 0 0',
  fontStyle: 'italic',
}

const content = {
  padding: '40px 40px 20px',
  backgroundColor: '#ffffff',
}

const h1 = {
  color: '#2d3748', // deep navy
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 24px 0',
  textAlign: 'center' as const,
}

const text = {
  color: '#4a5568',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#d4af37', // rich gold
  color: '#2d3748',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '16px 32px',
  borderRadius: '8px',
  display: 'inline-block',
  transition: 'all 0.3s ease',
}

const linkText = {
  color: '#4a5568',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 0',
  wordBreak: 'break-all' as const,
  backgroundColor: '#f7fafc',
  padding: '12px',
  borderRadius: '4px',
  border: '1px solid #e2e8f0',
}

const securityNote = {
  color: '#e53e3e',
  fontSize: '14px',
  margin: '24px 0 16px 0',
  fontWeight: '500',
}

const footer = {
  padding: '20px 40px',
  backgroundColor: '#f7fafc',
  borderRadius: '0 0 8px 8px',
  textAlign: 'center' as const,
}

const footerText = {
  color: '#4a5568',
  fontSize: '14px',
  margin: '0 0 16px 0',
}

const footerLink = {
  color: '#4a5568',
  fontSize: '12px',
  margin: '0',
}

const link = {
  color: '#2d3748',
  textDecoration: 'underline',
}
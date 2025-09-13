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
  Hr,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface ChapterSubmissionEmailProps {
  user_name: string
  chapter_title: string
  chapter_number: number
  is_first_submission: boolean
  submitted_at: string
  app_url: string
}

export const ChapterSubmissionEmail = ({
  user_name,
  chapter_title,
  chapter_number,
  is_first_submission,
  submitted_at,
  app_url,
}: ChapterSubmissionEmailProps) => {
  const formattedDate = new Date(submitted_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Html>
      <Head />
      <Preview>
        {is_first_submission 
          ? `🎉 Congratulations on submitting your first chapter!`
          : `✅ Chapter ${chapter_number} successfully submitted`
        }
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {is_first_submission ? (
            <>
              <Heading style={h1}>🎉 Welcome to Your Storytelling Journey!</Heading>
              <Text style={text}>
                Congratulations, {user_name}! You've just submitted your very first chapter - this is a huge milestone!
              </Text>
              <Section style={welcomeSection}>
                <Text style={welcomeText}>
                  <strong>Your first chapter "{chapter_title}" is now submitted and ready for processing.</strong>
                </Text>
                <Text style={welcomeText}>
                  Starting your autobiography is one of the most meaningful projects you can undertake. You're preserving your memories, experiences, and wisdom for future generations.
                </Text>
              </Section>
            </>
          ) : (
            <>
              <Heading style={h1}>✅ Chapter Successfully Submitted</Heading>
              <Text style={text}>
                Great work, {user_name}! Your chapter has been successfully submitted.
              </Text>
            </>
          )}

          <Section style={detailsSection}>
            <Text style={detailsTitle}>Submission Details:</Text>
            <Text style={detailsText}>
              <strong>Chapter:</strong> {chapter_number} - "{chapter_title}"<br />
              <strong>Submitted:</strong> {formattedDate}
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={nextStepsSection}>
            <Text style={nextStepsTitle}>What happens next?</Text>
            <Text style={nextStepsText}>
              • Your chapter will be processed and formatted<br />
              • You'll receive a PDF version once it's ready<br />
              • Continue writing your next chapter to build your complete story<br />
              • Track your progress in your dashboard
            </Text>
          </Section>

          <Section style={actionSection}>
            <Link
              href={`${app_url}/write`}
              style={button}
            >
              Continue Writing Your Story
            </Link>
          </Section>

          {is_first_submission && (
            <Section style={encouragementSection}>
              <Text style={encouragementText}>
                <em>"Every expert was once a beginner. Every pro was once an amateur."</em>
              </Text>
              <Text style={encouragementText}>
                You've taken the first step. Keep going - your story matters!
              </Text>
            </Section>
          )}

          <Text style={footer}>
            <Link
              href={`${app_url}`}
              target="_blank"
              style={{ ...link, color: '#898989' }}
            >
              Your Autobiography Platform
            </Link>
            <br />
            Preserving memories, one chapter at a time.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default ChapterSubmissionEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  lineHeight: '1.4',
}

const text = {
  color: '#333',
  fontSize: '16px',
  margin: '24px 0',
  lineHeight: '1.6',
}

const welcomeSection = {
  backgroundColor: '#f9f9f9',
  borderRadius: '8px',
  padding: '24px',
  margin: '32px 0',
}

const welcomeText = {
  color: '#333',
  fontSize: '16px',
  margin: '16px 0',
  lineHeight: '1.6',
}

const detailsSection = {
  backgroundColor: '#f0f7ff',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const detailsTitle = {
  color: '#2563eb',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
}

const detailsText = {
  color: '#333',
  fontSize: '14px',
  margin: '0',
  lineHeight: '1.5',
}

const nextStepsSection = {
  margin: '32px 0',
}

const nextStepsTitle = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
}

const nextStepsText = {
  color: '#555',
  fontSize: '14px',
  margin: '0',
  lineHeight: '1.8',
}

const actionSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
}

const encouragementSection = {
  backgroundColor: '#fff7ed',
  borderRadius: '8px',
  padding: '24px',
  margin: '32px 0',
  textAlign: 'center' as const,
}

const encouragementText = {
  color: '#ea580c',
  fontSize: '16px',
  margin: '12px 0',
  lineHeight: '1.6',
}

const hr = {
  borderColor: '#e6e6e6',
  margin: '32px 0',
}

const footer = {
  color: '#898989',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '48px 0 0 0',
}

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
}
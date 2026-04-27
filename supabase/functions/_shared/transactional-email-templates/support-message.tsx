import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'BudgetBuddy AI'

interface SupportMessageProps {
  userEmail?: string
  userId?: string
  emailVerified?: boolean
  subject?: string
  message?: string
  route?: string
  userAgent?: string
  messageId?: string
}

const SupportMessageEmail = ({
  userEmail,
  userId,
  emailVerified,
  subject,
  message,
  route,
  userAgent,
  messageId,
}: SupportMessageProps) => {
  const senderLabel = userEmail
    ? emailVerified
      ? userEmail
      : `${userEmail} (UNVERIFIED)`
    : 'Unknown sender'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>New support request from {userEmail ?? 'a user'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New support request</Heading>

          <Section style={metaSection}>
            <Text style={metaRow}>
              <span style={metaLabel}>From: </span>
              <span style={metaValue}>{senderLabel}</span>
            </Text>
            {userId ? (
              <Text style={metaRow}>
                <span style={metaLabel}>User ID: </span>
                <code style={code}>{userId}</code>
              </Text>
            ) : null}
            {route ? (
              <Text style={metaRow}>
                <span style={metaLabel}>Route: </span>
                <span style={metaValue}>{route}</span>
              </Text>
            ) : null}
            {userAgent ? (
              <Text style={metaRow}>
                <span style={metaLabel}>User-Agent: </span>
                <span style={metaSmall}>{userAgent}</span>
              </Text>
            ) : null}
            {messageId ? (
              <Text style={metaRow}>
                <span style={metaLabel}>Message ID: </span>
                <code style={code}>{messageId}</code>
              </Text>
            ) : null}
          </Section>

          <Hr style={hr} />

          {subject ? (
            <>
              <Heading as="h3" style={h3}>
                Subject
              </Heading>
              <Text style={text}>{subject}</Text>
            </>
          ) : null}

          {message ? (
            <>
              <Heading as="h3" style={h3}>
                Message
              </Heading>
              <Section style={messageBox}>
                {message.split('\n').map((line, i) => (
                  <Text key={i} style={messageLine}>
                    {line || '\u00A0'}
                  </Text>
                ))}
              </Section>
            </>
          ) : null}

          <Hr style={hr} />
          <Text style={footer}>
            Sent automatically by {SITE_NAME} support system.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SupportMessageEmail,
  subject: (data: Record<string, any>) => {
    const prefix = data.emailVerified ? '[Support]' : '[UNVERIFIED EMAIL] [Support]'
    const subj = (data.subject as string) || 'New message'
    return `${prefix} ${subj}`
  },
  displayName: 'Support message (internal)',
  previewData: {
    userEmail: 'jane@example.com',
    userId: '00000000-0000-0000-0000-000000000000',
    emailVerified: true,
    subject: 'I need help with my budget',
    message: 'Hi team,\n\nMy budget alerts are not coming through.\n\nThanks!',
    route: '/settings',
    userAgent: 'Mozilla/5.0',
    messageId: '11111111-1111-1111-1111-111111111111',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}

const container = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '24px',
}

const h1 = {
  fontSize: '22px',
  fontWeight: 'bold',
  color: '#0a1628',
  margin: '0 0 20px',
}

const h3 = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#0a1628',
  margin: '20px 0 8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}

const metaSection = {
  backgroundColor: '#f6f8fa',
  borderRadius: '8px',
  padding: '12px 16px',
  margin: '0 0 8px',
}

const metaRow = {
  fontSize: '13px',
  margin: '4px 0',
  lineHeight: '1.5',
}

const metaLabel = {
  color: '#5b6b7d',
  fontWeight: 500,
}

const metaValue = {
  color: '#0a1628',
}

const metaSmall = {
  color: '#5b6b7d',
  fontSize: '12px',
}

const code = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '12px',
  backgroundColor: '#eef1f4',
  padding: '2px 6px',
  borderRadius: '4px',
  color: '#0a1628',
}

const text = {
  fontSize: '15px',
  color: '#0a1628',
  lineHeight: '1.5',
  margin: '0 0 12px',
}

const messageBox = {
  backgroundColor: '#f6f8fa',
  borderRadius: '8px',
  padding: '16px',
  borderLeft: '4px solid #0080ff',
}

const messageLine = {
  fontSize: '14px',
  color: '#0a1628',
  lineHeight: '1.6',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
}

const hr = {
  border: 'none',
  borderTop: '1px solid #e6e9ed',
  margin: '24px 0',
}

const footer = {
  fontSize: '12px',
  color: '#8a96a3',
  margin: '0',
  textAlign: 'center' as const,
}

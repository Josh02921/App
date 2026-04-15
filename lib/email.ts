// ============================================================
// email.ts - Nodemailer email utility for Heaven Church Admin
// Configure via Railway environment variables:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
//   SMTP_SECURE (true/false, default: true for port 465)
// ============================================================

import nodemailer from 'nodemailer'

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string
  attachments?: Array<{ filename: string; content: string | Buffer; contentType?: string }>
}

// Check if SMTP is configured
export function isEmailConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  )
}

// Personalize email text - replace {{navn}}, {{fornavn}}, {{dato}} tokens
export function personalizeText(
  text: string,
  recipient: { name?: string; firstName?: string; lastName?: string }
): string {
  const today = new Date().toLocaleDateString('da-DK')
  const fullName = recipient.name || `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim()
  const firstName = recipient.firstName || recipient.name?.split(' ')[0] || ''
  return text
    .replace(/\{\{navn\}\}/gi, fullName)
    .replace(/\{\{fornavn\}\}/gi, firstName)
    .replace(/\{\{dato\}\}/gi, today)
}

// Create transporter - lazy-initialized
let _transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter

  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  // Auto-detect secure: port 465 = SSL, others = STARTTLS
  const secure = process.env.SMTP_SECURE === 'true' || port === 465

  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  })

  return _transporter
}

// Reset transporter (e.g. after config change)
export function resetTransporter() {
  _transporter = null
}

// Send a single email
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!isEmailConfigured()) {
    return { success: false, error: 'SMTP ikke konfigureret. Tilføj SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS til Railway miljøvariabler.' }
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || ''
  const churchName = process.env.CHURCH_NAME || 'Horsens Pinsekirke'
  const fromFormatted = `"${churchName}" <${from}>`

  try {
    const transporter = getTransporter()
    const info = await transporter.sendMail({
      from: fromFormatted,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
      bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
      replyTo: options.replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
      attachments: options.attachments,
    })

    console.log(`Email sendt: ${info.messageId} → ${options.to}`)
    return { success: true, messageId: info.messageId }
  } catch (error: any) {
    console.error('Email fejl:', error.message)
    // Reset transporter so next attempt creates a fresh connection
    _transporter = null
    return { success: false, error: error.message }
  }
}

// Verify SMTP connection (for testing config)
export async function verifyEmailConnection(): Promise<{ success: boolean; message: string }> {
  if (!isEmailConfigured()) {
    return { success: false, message: 'SMTP ikke konfigureret (mangler SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)' }
  }

  try {
    const transporter = getTransporter()
    await transporter.verify()
    return { success: true, message: 'SMTP forbindelse OK' }
  } catch (error: any) {
    _transporter = null
    return { success: false, message: `SMTP forbindelsesfejl: ${error.message}` }
  }
}

// Send a simple text email (convenience wrapper)
export async function sendSimpleEmail(to: string, subject: string, body: string) {
  return sendEmail({
    to,
    subject,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      ${body.replace(/\n/g, '<br>')}
      <br><br>
      <p style="color: #666; font-size: 12px;">Sendt fra ${process.env.CHURCH_NAME || 'Horsens Pinsekirke'} administrationssystem</p>
    </div>`
  })
}

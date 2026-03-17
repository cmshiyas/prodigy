'use client'
import Link from 'next/link'

export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <Link href="/" style={{ fontSize: '0.85rem', color: '#7A5C3F', textDecoration: 'none', fontWeight: 600 }}>← Back to Home</Link>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1A1A1A', marginTop: 20, marginBottom: 8 }}>Privacy Policy</h1>
          <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>Last updated: 18 March 2026</p>
        </div>

        <div style={{ fontSize: '0.95rem', lineHeight: 1.8, color: '#2D2D2D' }}>

          <Section title="1. About This Policy">
            <p>Self Paced Learning ("we", "us", "our") operates the website at <strong>selfpaced.com.au</strong> and related services (collectively, the "Service").</p>
            <p>This Privacy Policy explains how we collect, use, disclose, store and protect your personal information. It is prepared in accordance with the <strong>Privacy Act 1988 (Cth)</strong> and the <strong>Australian Privacy Principles (APPs)</strong>.</p>
            <p>By using the Service, you confirm that you have read and understood this policy. If you do not agree, please do not use the Service.</p>
          </Section>

          <Section title="2. Who We Collect Information From">
            <p>We collect personal information from:</p>
            <ul>
              <li><strong>Students</strong> (including children aged 9–13 preparing for Australian school exams)</li>
              <li><strong>Parents or guardians</strong> who create or oversee accounts on behalf of their child</li>
              <li><strong>Teachers and tutors</strong> who use the admin portal</li>
            </ul>
            <p><strong>Children's privacy:</strong> Because our platform is primarily used by children under 13, we require that a parent or guardian review and accept this policy on the child's behalf before the child uses the Service. We do not knowingly collect personal information from children without verifiable parental or guardian consent.</p>
          </Section>

          <Section title="3. What Information We Collect">
            <p><strong>Information you provide directly:</strong></p>
            <ul>
              <li>Google Account information (name, email address, profile photo) obtained when you sign in via Google OAuth</li>
              <li>Subscription and payment details (processed by Stripe — we do not store card numbers)</li>
            </ul>
            <p><strong>Information collected automatically:</strong></p>
            <ul>
              <li>Practice test results, answers, scores and progress data</li>
              <li>Session and usage data (pages visited, features used, timestamps)</li>
              <li>Device and browser information (type, operating system, IP address)</li>
              <li>Referral codes used at sign-up</li>
            </ul>
            <p><strong>Information we do not collect:</strong> We do not collect government identifiers, health information, financial account credentials, or sensitive information as defined by the Privacy Act.</p>
          </Section>

          <Section title="4. How We Use Your Information">
            <p>We use personal information to:</p>
            <ul>
              <li>Create and manage your account</li>
              <li>Deliver exam practice questions and track your progress</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send service-related emails (account approval, subscription updates)</li>
              <li>Improve our question bank and platform features</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p>We do not use your information for direct marketing without your consent, and we do not sell your personal information to third parties.</p>
          </Section>

          <Section title="5. Disclosure of Your Information">
            <p>We share personal information with the following third-party service providers solely to operate the Service:</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', marginTop: 8 }}>
              <thead>
                <tr style={{ background: '#F0EDE8' }}>
                  <th style={thStyle}>Service Provider</th>
                  <th style={thStyle}>Purpose</th>
                  <th style={thStyle}>Location</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Google (OAuth)', 'Authentication', 'USA'],
                  ['Supabase', 'Database & file storage', 'USA'],
                  ['Stripe', 'Payment processing', 'USA'],
                  ['Anthropic', 'AI question generation (admin only)', 'USA'],
                  ['Vercel', 'Web hosting & deployment', 'USA'],
                ].map(([provider, purpose, location]) => (
                  <tr key={provider} style={{ borderBottom: '1px solid #EEE' }}>
                    <td style={tdStyle}>{provider}</td>
                    <td style={tdStyle}>{purpose}</td>
                    <td style={tdStyle}>{location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: 12 }}>All providers are bound by their own privacy policies and applicable data protection laws. We have entered into data processing agreements with each provider where required. We take reasonable steps to ensure overseas recipients handle your information consistently with the APPs.</p>
            <p>We do not disclose personal information to government agencies or third parties except where required by Australian law.</p>
          </Section>

          <Section title="6. Cross-Border Data Transfers">
            <p>Some of our service providers are located in the United States of America. By using the Service, you acknowledge that your personal information may be transferred to, stored and processed in the USA. We take reasonable steps to ensure that overseas recipients protect your information in a manner consistent with the Australian Privacy Principles (APP 8).</p>
          </Section>

          <Section title="7. Data Storage and Security">
            <p>We store personal information in Supabase's cloud database, hosted in data centres operated by Amazon Web Services (AWS). We implement the following security measures:</p>
            <ul>
              <li>HTTPS/TLS encryption for all data in transit</li>
              <li>Row-level security (RLS) policies in the database</li>
              <li>Authentication via Google OAuth 2.0 (no passwords stored)</li>
              <li>Access controls limiting which staff can access personal data</li>
            </ul>
            <p>While we take reasonable precautions, no transmission over the internet is completely secure. Please notify us immediately if you suspect unauthorised access to your account.</p>
          </Section>

          <Section title="8. Data Retention">
            <p>We retain personal information for as long as your account is active or as needed to provide the Service. When you request account deletion:</p>
            <ul>
              <li>Your account and personal details will be deleted within <strong>30 days</strong></li>
              <li>Anonymised or aggregated usage data may be retained for service improvement</li>
              <li>We may retain records required by law (e.g. payment records for tax purposes) for up to 7 years</li>
            </ul>
          </Section>

          <Section title="9. Your Rights (APP 12 & 13)">
            <p>Under the Privacy Act, you have the right to:</p>
            <ul>
              <li><strong>Access</strong> the personal information we hold about you</li>
              <li><strong>Correct</strong> inaccurate, out-of-date or incomplete information</li>
              <li><strong>Request deletion</strong> of your account and personal data</li>
              <li><strong>Complain</strong> about how we have handled your information</li>
            </ul>
            <p>To exercise any of these rights, email us at <strong>hello@selfpaced.com.au</strong>. We will respond within 30 days. For account deletion requests, we will confirm deletion within 30 days of receiving your request.</p>
          </Section>

          <Section title="10. Cookies and Tracking">
            <p>We use the following technologies on our website:</p>
            <ul>
              <li><strong>localStorage</strong> — to store your session token and exam type preference on your device (no expiry set; cleared when you sign out)</li>
              <li><strong>Google OAuth cookies</strong> — set by Google during the sign-in process, governed by <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#7A5C3F' }}>Google's Privacy Policy</a></li>
              <li><strong>Stripe cookies</strong> — set during payment flows, governed by <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#7A5C3F' }}>Stripe's Privacy Policy</a></li>
            </ul>
            <p>We do not use tracking cookies for advertising or analytics purposes.</p>
          </Section>

          <Section title="11. Complaints">
            <p>If you believe we have breached the Australian Privacy Principles, you may:</p>
            <ol>
              <li>Contact us at <strong>hello@selfpaced.com.au</strong> — we will investigate and respond within 30 days</li>
              <li>If unsatisfied with our response, lodge a complaint with the <strong>Office of the Australian Information Commissioner (OAIC)</strong> at <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer" style={{ color: '#7A5C3F' }}>oaic.gov.au</a> or on 1300 363 992</li>
            </ol>
          </Section>

          <Section title="12. Changes to This Policy">
            <p>We may update this policy from time to time. Where the change is material, we will notify users by email or by prominently displaying a notice on the Service. The "Last updated" date at the top of this page reflects the most recent revision. Continued use of the Service after changes constitutes acceptance of the updated policy.</p>
          </Section>

          <Section title="13. Contact Us">
            <p>For privacy enquiries, requests or complaints:</p>
            <p>
              <strong>Self Paced Learning</strong><br />
              Email: <strong>hello@selfpaced.com.au</strong><br />
              Website: <a href="https://www.selfpaced.com.au" style={{ color: '#7A5C3F' }}>selfpaced.com.au</a>
            </p>
          </Section>

        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1A1A1A', borderBottom: '2px solid #E8D5C0', paddingBottom: 8, marginBottom: 14 }}>{title}</h2>
      {children}
    </div>
  )
}

const thStyle = { textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: '#5A3E2B' }
const tdStyle = { padding: '8px 12px', color: '#333', verticalAlign: 'top' }

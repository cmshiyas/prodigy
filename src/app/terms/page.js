'use client'
import Link from 'next/link'

export default function TermsOfService() {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <Link href="/" style={{ fontSize: '0.85rem', color: '#7A5C3F', textDecoration: 'none', fontWeight: 600 }}>← Back to Home</Link>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1A1A1A', marginTop: 20, marginBottom: 8 }}>Terms of Service</h1>
          <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>Last updated: 18 March 2026</p>
        </div>

        <div style={{ fontSize: '0.95rem', lineHeight: 1.8, color: '#2D2D2D' }}>

          <Section title="1. Agreement to Terms">
            <p>These Terms of Service ("Terms") govern your access to and use of the Self Paced Learning platform at <strong>selfpaced.com.au</strong> ("Service"), operated by Self Paced Learning ("we", "us", "our").</p>
            <p>By creating an account or using the Service, you agree to be bound by these Terms and our <Link href="/privacy" style={{ color: '#7A5C3F' }}>Privacy Policy</Link>. If you are a parent or guardian creating an account on behalf of a child, you agree on the child's behalf.</p>
            <p>If you do not agree to these Terms, please do not use the Service.</p>
          </Section>

          <Section title="2. Eligibility">
            <p>The Service is designed for students preparing for Australian school exams (including OC, Selective School and NAPLAN tests), typically aged 9–13. To use the Service:</p>
            <ul>
              <li>If you are under 18, a parent or guardian must review and accept these Terms on your behalf</li>
              <li>You must have a valid Google account to sign in</li>
              <li>Your account must be approved by our admin team before access is granted</li>
            </ul>
          </Section>

          <Section title="3. Accounts">
            <p>You are responsible for maintaining the confidentiality of your Google account credentials. You must notify us immediately at <strong>support@selfpaced.com.au</strong> if you suspect unauthorised access to your account.</p>
            <p>We reserve the right to refuse or revoke access at our discretion, including where we reasonably believe the Terms are being violated.</p>
          </Section>

          <Section title="4. Subscription Plans and Pricing">
            <p>We offer the following subscription tiers:</p>
            <ul>
              <li><strong>Silver (Free)</strong> — limited features, no charge</li>
              <li><strong>Gold — $5/month (GST inclusive)</strong></li>
              <li><strong>Platinum — $9/month (GST inclusive)</strong></li>
            </ul>
            <p>All prices are in Australian dollars (AUD) and include Goods and Services Tax (GST) at 10% as required by the <em>A New Tax System (Goods and Services Tax) Act 1999</em> (Cth).</p>
            <p>Paid subscriptions are billed monthly through Stripe. You authorise us to charge your nominated payment method on a recurring basis until you cancel. Payments are non-refundable except as required by law (see clause 7).</p>
            <p>We reserve the right to change pricing with at least <strong>30 days' written notice</strong> to your registered email address. Continued use after the effective date constitutes acceptance of the new price.</p>
          </Section>

          <Section title="5. Free Trial">
            <p>We may offer a free trial period for paid plans. At the end of the trial, your account will automatically revert to the Silver (Free) tier unless you choose to subscribe. We will notify you before any trial ends.</p>
          </Section>

          <Section title="6. Cancellation">
            <p>You may cancel your subscription at any time by contacting us at <strong>support@selfpaced.com.au</strong>. Cancellation takes effect at the end of your current billing cycle. You will retain access to paid features until that date.</p>
          </Section>

          <Section title="7. Australian Consumer Law">
            <p>Nothing in these Terms excludes, restricts or modifies any right or remedy, or any guarantee, warranty or other term or condition, implied or imposed by the <strong>Australian Consumer Law</strong> (Schedule 2 of the <em>Competition and Consumer Act 2010</em> (Cth)) that cannot lawfully be excluded or limited, including consumer guarantees that services will be provided with due care and skill, be fit for the stated purpose, and be provided within a reasonable time.</p>
            <p>Where you are entitled to a remedy under the Australian Consumer Law (including a refund for a major failure), we will provide that remedy. Our liability for a non-major failure is limited, at our option, to re-supplying the service or refunding the price paid.</p>
          </Section>

          <Section title="8. Acceptable Use">
            <p>You must not:</p>
            <ul>
              <li>Share your account credentials with others</li>
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to circumvent subscription limits or access controls</li>
              <li>Scrape, copy or republish question content without permission</li>
              <li>Upload or transmit malicious code, spam or harmful content</li>
              <li>Interfere with the integrity or performance of the Service</li>
            </ul>
          </Section>

          <Section title="9. Intellectual Property">
            <p>All content on the Service — including questions, explanations, UI design, logos and software — is owned by or licensed to Self Paced Learning. You may not reproduce, distribute or create derivative works from this content without our written permission.</p>
            <p>Questions derived from publicly available past papers remain subject to the intellectual property rights of the relevant education authority.</p>
          </Section>

          <Section title="10. Disclaimer of Warranties">
            <p>The Service is provided "as is" and "as available". To the extent permitted by Australian law, we make no warranties about accuracy, completeness or fitness for a particular purpose of the content. Past exam questions and AI-generated content are provided for practice purposes only and may not reflect the exact format of future exams.</p>
          </Section>

          <Section title="11. Limitation of Liability">
            <p>To the maximum extent permitted by law (and subject to clause 7 above), our total liability to you for any claim arising out of or in connection with the Service is limited to the amount you paid us in the 3 months preceding the claim.</p>
            <p>We are not liable for indirect, incidental or consequential loss (including lost marks, educational outcomes, or data loss) arising from use of the Service.</p>
          </Section>

          <Section title="12. Account Deletion">
            <p>You may request deletion of your account and personal data at any time by emailing <strong>privacy@selfpaced.com.au</strong>. We will delete your account and associated personal data within 30 days of your request, subject to data we are required to retain by law.</p>
          </Section>

          <Section title="13. Governing Law">
            <p>These Terms are governed by the laws of New South Wales, Australia. You agree to submit to the non-exclusive jurisdiction of the courts of New South Wales and the Federal Court of Australia for any disputes arising under these Terms.</p>
          </Section>

          <Section title="14. Changes to These Terms">
            <p>We may update these Terms from time to time. For material changes, we will provide at least <strong>14 days' notice</strong> via email or a prominent notice on the Service before the change takes effect. Continued use after the effective date constitutes acceptance.</p>
          </Section>

          <Section title="15. Contact">
            <p>
              <strong>Self Paced Learning</strong><br />
              Email: <strong>support@selfpaced.com.au</strong><br />
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

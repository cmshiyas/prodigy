import './globals.css'

export const metadata = {
  metadataBase: new URL('https://exambooster.com.au'),
  title: {
    default: 'RepHub — Master Any Exam, One Rep at a Time',
    template: '%s | RepHub',
  },
  description: 'Self-paced exam mastery for Australian students. Build confidence through deliberate repetition across NAPLAN, OC, and Selective school topics. Practice at your own pace — master through reps.',
  keywords: [
    'NAPLAN practice', 'OC exam prep', 'Selective school test', 'OC test preparation',
    'Selective school preparation', 'NAPLAN online practice', 'self-paced learning',
    'mastery learning', 'exam preparation Australia', 'Year 4 exam prep', 'Year 5 exam prep',
    'Year 6 exam prep', 'NSW selective school', 'opportunity class', 'practice questions',
    'maths reasoning', 'thinking skills', 'reading comprehension', 'exam reps', 'RepHub',
  ],
  authors: [{ name: 'RepHub' }],
  creator: 'RepHub',
  publisher: 'RepHub',
  openGraph: {
    type: 'website',
    url: 'https://exambooster.com.au',
    siteName: 'RepHub',
    title: 'RepHub — Master Any Exam, One Rep at a Time',
    description: 'Self-paced exam mastery for Australian students. Build confidence through deliberate repetition across NAPLAN, OC, and Selective school topics.',
    locale: 'en_AU',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RepHub — Master Any Exam, One Rep at a Time',
    description: 'Self-paced exam mastery for Australian students. Build confidence through deliberate repetition across NAPLAN, OC, and Selective school topics.',
    creator: '@rephub',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: 'https://exambooster.com.au',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en-AU">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Nunito+Sans:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Google Identity Services - loaded before page script */}
        <script src="https://accounts.google.com/gsi/client" async defer />
      </head>
      <body>{children}</body>
    </html>
  )
}

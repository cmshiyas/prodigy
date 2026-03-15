import './globals.css'
import { Analytics } from '@vercel/analytics/react'

export const metadata = {
  metadataBase: new URL('https://www.selfpaced.com.au'),
  title: {
    default: 'Self Paced Learning — Practice. Consistency. Feedback.',
    template: '%s | Self Paced Learning',
  },
  description: 'Self-paced exam mastery for Australian students. Build confidence through consistent practice and instant feedback across NAPLAN, OC, and Selective school topics. Master any exam — practice by practice.',
  keywords: [
    'NAPLAN practice', 'OC exam prep', 'Selective school test', 'OC test preparation',
    'Selective school preparation', 'NAPLAN online practice', 'self-paced learning',
    'mastery learning', 'exam preparation Australia', 'Year 4 exam prep', 'Year 5 exam prep',
    'Year 6 exam prep', 'NSW selective school', 'opportunity class', 'practice questions',
    'maths reasoning', 'thinking skills', 'reading comprehension', 'consistent practice',
    'exam feedback', 'Self Paced Learning',
  ],
  authors: [{ name: 'Self Paced Learning' }],
  creator: 'Self Paced Learning',
  publisher: 'Self Paced Learning',
  openGraph: {
    type: 'website',
    url: 'https://www.selfpaced.com.au',
    siteName: 'Self Paced Learning',
    title: 'Self Paced Learning — Practice. Consistency. Feedback.',
    description: 'Self-paced exam mastery for Australian students. Build confidence through consistent practice and instant feedback across NAPLAN, OC, and Selective school topics.',
    locale: 'en_AU',
    images: [
      {
        url: 'https://www.selfpaced.com.au/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Self Paced Learning — Exam mastery for Australian students',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Self Paced Learning — Practice. Consistency. Feedback.',
    description: 'Self-paced exam mastery for Australian students. Build confidence through consistent practice and instant feedback across NAPLAN, OC, and Selective school topics.',
    creator: '@selfpacedlearn',
    images: ['https://www.selfpaced.com.au/opengraph-image'],
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
    canonical: 'https://www.selfpaced.com.au',
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
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}

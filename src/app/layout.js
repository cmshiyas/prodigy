import './globals.css'

export const metadata = {
  title: 'Rephub',
  description: 'Practise for the NSW Opportunity Class Placement Test',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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

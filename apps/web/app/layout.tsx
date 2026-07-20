import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title: 'Health Dashboard',
  description:
    'Upload medical PDFs, get AI-powered health insights, and track progress over time.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#3b82f6',
          colorBackground: '#111827',
          borderRadius: '0.75rem',
        },
        elements: {
          card: 'bg-surface border border-border shadow-none',
          headerTitle: 'text-text',
          headerSubtitle: 'text-muted',
          socialButtonsBlockButton:
            'bg-surface2 border border-border text-text hover:bg-surface cursor-pointer',
          formButtonPrimary:
            'bg-accent hover:bg-accent-glow text-white shadow-none cursor-pointer',
          footerActionLink: 'text-accent-glow hover:text-accent cursor-pointer',
          formFieldInput: 'bg-surface2 text-text border-border',
          identityPreviewEditButton: 'cursor-pointer',
        },
      }}
    >
      <html lang="en" className="dark">
        <body
          className={`${inter.variable} ${jetbrains.variable} min-h-screen bg-background text-text antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

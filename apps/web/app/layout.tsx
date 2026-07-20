import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
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

const themeInitScript = `
(function(){
  try {
    var stored = localStorage.getItem('health-dashboard-theme');
    var theme = stored === 'light' ? 'light' : 'dark';
    var root = document.documentElement;
    root.classList.remove('light','dark');
    root.classList.add(theme);
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

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
          borderRadius: '0.75rem',
        },
        elements: {
          rootBox: 'text-text',
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
      <html lang="en" className="dark" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        </head>
        <body
          className={`${inter.variable} ${jetbrains.variable} min-h-screen bg-background text-text antialiased`}
        >
          <ThemeProvider>{children}</ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

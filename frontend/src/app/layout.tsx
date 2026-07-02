import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "I & E — Income and Expenses Tracker",
  description: "Track your monthly expenses across categories with insights and analytics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{__html: `
          (function() {
            var theme = localStorage.getItem('theme') || 'dark';
            document.documentElement.setAttribute('data-theme', theme);
          })();
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}

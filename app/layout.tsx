import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import StatusBanner from '@/components/StatusBanner';

export const metadata: Metadata = {
  title: 'WordLearner | English → Hindi Vocabulary Builder',
  description:
    'Look up English words, get instant Hindi translations and Hindi meanings, and automatically sync them to your Firebase Firestore database.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased flex flex-col transition-colors">
        <Navbar />
        <StatusBanner />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {children}
        </main>
        <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>WordLearner • English → Hindi Vocabulary Builder</span>
            <span>Automatically saves lookups to Firebase Firestore</span>
          </div>
        </footer>
      </body>
    </html>
  );
}

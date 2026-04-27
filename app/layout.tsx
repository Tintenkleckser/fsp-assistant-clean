import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FSP-Assistent',
  description: 'Vorbereitung auf die Fachsprachenprüfung für internationale Ärztinnen und Ärzte'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}

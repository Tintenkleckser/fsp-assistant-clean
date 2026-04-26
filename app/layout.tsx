import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FSP-Assistent',
  description: 'Vorbereitung auf die Fachsprachenprüfung fuer internationale Aerztinnen und Aerzte'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}

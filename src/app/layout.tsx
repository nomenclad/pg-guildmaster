import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "PG Guildmaster",
  description: "Guild character spreadsheet for Project Gorgon",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-6">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

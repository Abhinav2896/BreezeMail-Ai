import type { Metadata } from "next";
import "../src/styles/index.css";

export const metadata: Metadata = {
  title: "BreezeMail AI",
  description:
    "BreezeMail AI — an AI-powered email generator with soft mint glassmorphism dashboard for crafting professional emails effortlessly.",
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>{children}</body>
    </html>
  );
}

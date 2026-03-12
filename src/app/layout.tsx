import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jeanity",
  description: "Connect beyond boundaries with Jeanity.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

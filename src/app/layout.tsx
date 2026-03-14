import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth/AuthProvider";
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
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

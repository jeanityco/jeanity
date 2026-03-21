import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { FeedsPostsProvider } from "@/features/feeds/FeedsPostsContext";
import { PostComposerProvider } from "@/features/feeds/PostComposerModal";
import { StoryViewerProvider } from "@/features/feeds/StoryViewer";
import { WalletExtensionNoiseFilter } from "@/components/WalletExtensionNoiseFilter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jeanity",
  description: "Connect beyond boundaries with Jeanity.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full overflow-x-hidden">
      <body className="min-h-dvh min-h-[100svh] overflow-x-hidden antialiased">
        <WalletExtensionNoiseFilter />
        <AuthProvider>
          <FeedsPostsProvider>
            <PostComposerProvider>
              <StoryViewerProvider>{children}</StoryViewerProvider>
            </PostComposerProvider>
          </FeedsPostsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

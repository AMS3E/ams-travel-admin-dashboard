import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/app/fonts";
import { THEME_SCRIPT } from "@/features/theme/theme";
import { StoreProvider } from "@/store/store-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001",
  ),
  title: {
    default: "AMS Travel Admin",
    template: "%s · AMS Travel Admin",
  },
  description:
    "Manage the AMS Travel catalogue: destinations, regions, corridors, and the taxonomies behind them.",
  /* An internal tool has no business in a search index. */
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#080b14" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    /* The theme script sets data-theme on <html> before hydration, hence the warning left unsaid. */
    <html className={`${fontVariables} antialiased`} lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the saved theme before the first paint, so no page flashes in the wrong one. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}

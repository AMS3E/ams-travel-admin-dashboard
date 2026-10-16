import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { fontVariables } from "@/app/fonts";
import { THEME_SCRIPT } from "@/features/theme/theme";
import { StoreProvider } from "@/store/store-provider";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("shell.meta");
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001",
    ),
    title: {
      default: "AMS Travel Admin",
      template: "%s · AMS Travel Admin",
    },
    description: t("description"),
    /* An internal tool has no business in a search index. */
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#080b14" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    /* The theme script sets data-theme on <html> before hydration, hence the warning left unsaid. */
    <html className={`${fontVariables} antialiased`} lang={locale} suppressHydrationWarning>
      <head>
        {/* Applies the saved theme before the first paint, so no page flashes in the wrong one. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        {/* Every client component reads its texts from here, in the language the cookie chose. */}
        <NextIntlClientProvider>
          <StoreProvider>{children}</StoreProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

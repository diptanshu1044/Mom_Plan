import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";
import { inter, plusJakartaSans } from "@/lib/fonts";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://momplan.ai"),
  title: {
    default: "MomPlan — AI-Powered Government Benefits Platform",
    template: "%s | MomPlan",
  },
  description:
    "MomPlan scans 200+ federal and state programs to match your family with hidden benefits. From childcare subsidies to nutrition assistance, get personalized guidance fast.",
  keywords: "government benefits, family assistance, SNAP, WIC, Medicaid, childcare subsidies, eligibility scan",
  openGraph: {
    title: "MomPlan — AI-Powered Government Benefits Platform",
    description: "Discover all the benefits your family qualifies for in minutes.",
    type: "website",
    locale: "en_US",
    url: "https://momplan.ai",
    siteName: "MomPlan",
  },
  twitter: {
    card: "summary_large_image",
    title: "MomPlan — AI-Powered Government Benefits Platform",
    description: "Discover all the benefits your family qualifies for in minutes.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plusJakartaSans.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-surface text-on-surface antialiased font-sans" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

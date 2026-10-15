import type { Metadata } from "next";
import { Cinzel, Cinzel_Decorative, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import HomeLogo from "./components/HomeLogo";
import SiteFooter from "./components/SiteFooter";
import JsonLd from "./components/JsonLd";
import { LogoChromeProvider } from "./components/logo-chrome";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const cinzelDecorative = Cinzel_Decorative({
  variable: "--font-cinzel-decorative",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/elune/elune.png",
        width: 512,
        height: 256,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/elune/elune.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} ${cinzelDecorative.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-950 text-white">
        <JsonLd />
        <LogoChromeProvider>
          <HomeLogo />
          <Navbar />
          <div id="site-main" className="relative z-10 flex-1 pt-12 flex flex-col">
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
        </LogoChromeProvider>
      </body>
    </html>
  );
}

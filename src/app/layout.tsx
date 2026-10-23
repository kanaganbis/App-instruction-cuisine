import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { TimerAlarm } from "@/components/timers/timer-alarm";

import "./globals.css";

// Fonts ship with the app (no Google request), so it works fully offline.
const figtree = localFont({
  src: "../../node_modules/@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2",
  variable: "--font-figtree",
  weight: "300 900",
  display: "swap",
});

const bricolage = localFont({
  src: "../../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2",
  variable: "--font-bricolage",
  weight: "200 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Cuisine pas à pas", template: "%s · Cuisine pas à pas" },
  description:
    "Vos recettes, avec les ingrédients, les quantités et les étapes au même endroit.",
  applicationName: "Cuisine pas à pas",
  appleWebApp: { capable: true, title: "Cuisine", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1411" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${figtree.variable} ${bricolage.variable} h-full`}
    >
      <body className="min-h-full">
        {children}
        <TimerAlarm />
      </body>
    </html>
  );
}

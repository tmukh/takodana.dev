import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

// Fonts are downloaded at build time and served from this site, so visitors never contact Google.
const archivo = Archivo({ variable: "--font-display", subsets: ["latin"], axes: ["wdth"] });
const plexSans = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
const plexMono = IBM_Plex_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://takodana.dev"),
  title: { default: "Tarik Abu Mukh · takodana.dev", template: "%s · takodana.dev" },
  description:
    "Platform, SRE and AI engineering in Berlin. A Kubernetes homelab run through GitOps, and a retrieval system for astrophysics papers that is evaluated, backed up and watched with SLOs.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}

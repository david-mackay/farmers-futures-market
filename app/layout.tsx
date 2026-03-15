import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { AppKitProvider } from "@/contexts/appkit-provider";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-logo",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FFM — Future's Farmer's Market",
  description: "A Farmers' Futures Trading Post — plan your harvest by viewing buy/sell orders for crop delivery dates.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const cookieStore = headersList.get("cookie");

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('ffm:theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);})();`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${bebasNeue.variable} antialiased`}>
        <AppKitProvider cookies={cookieStore}>
          <Providers>
            {children}
          </Providers>
        </AppKitProvider>
      </body>
    </html>
  );
}

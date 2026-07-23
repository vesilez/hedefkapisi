import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { siteConfig } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var t=localStorage.getItem("hedef-kapisi-theme");var d=t==="dark"||t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches;var v=d?"dark":"light";document.documentElement.dataset.theme=v;document.documentElement.style.colorScheme=v}catch(e){}})()',
          }}
        />
      </head>
      <body>
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}

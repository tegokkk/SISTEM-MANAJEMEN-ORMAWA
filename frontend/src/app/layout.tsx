import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: {
    default: "SIM ORMAWA | Polinela",
    template: "%s | SIM ORMAWA Polinela",
  },
  description:
    "Sistem Informasi Manajemen Organisasi Mahasiswa Politeknik Negeri Lampung — platform terpadu untuk pengelolaan ORMAWA, HMJ, dan HIMA.",
  metadataBase: new URL("http://localhost:3000"),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

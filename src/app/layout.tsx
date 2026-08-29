import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "./LayoutWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ნინიკა • საოჯახო სამზარეულო",
  description: "ნახევარფაბრიკატების საოჯახო საწარმო — ოჯახური სითბო და ხარისხი შენს თეფშზე",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ka"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" href="https://res.cloudinary.com/dmcabui00/image/upload/v1787822458/uiqlsgnw3cvx5sixgp1v.jpg" sizes="any" />
        <link rel="apple-touch-icon" href="https://res.cloudinary.com/dmcabui00/image/upload/v1787822458/uiqlsgnw3cvx5sixgp1v.jpg" />
      </head>
      <body className="min-h-full flex flex-col relative pb-12 bg-[#121619] text-[#e2e8f0]">
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}

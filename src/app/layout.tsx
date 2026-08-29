import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
  icons: {
    icon: "https://res.cloudinary.com/dmcabui00/image/upload/v1787822458/uiqlsgnw3cvx5sixgp1v.jpg",
    shortcut: "https://res.cloudinary.com/dmcabui00/image/upload/v1787822458/uiqlsgnw3cvx5sixgp1v.jpg",
    apple: "https://res.cloudinary.com/dmcabui00/image/upload/v1787822458/uiqlsgnw3cvx5sixgp1v.jpg",
  },
};

import LayoutWrapper from "./LayoutWrapper";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ka"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative pb-12 bg-[#121619] text-[#e2e8f0]">
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}

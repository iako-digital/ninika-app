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
    icon: "https://res.cloudinary.com/dmcabui00/image/upload/v1787649626/ggef5dtdlwjuigdgmfnv.jpg",
    shortcut: "https://res.cloudinary.com/dmcabui00/image/upload/v1787649626/ggef5dtdlwjuigdgmfnv.jpg",
    apple: "https://res.cloudinary.com/dmcabui00/image/upload/v1787649626/ggef5dtdlwjuigdgmfnv.jpg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ka"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative">
        {children}

        {/* Facebook Messenger Floating Button — აწეულია bottom-24-ზე კალათის თავზე */}
        <a
          href="https://m.me/1302047889659335"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on Messenger"
          className="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#0084FF] text-white shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl"
        >
          <svg className="h-7 w-7 fill-current" viewBox="0 0 24 24">
            <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.304 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26 6.559-6.96 3.125 3.26 5.893-3.26-6.559 6.96z" />
          </svg>
        </a>
      </body>
    </html>
  );
}

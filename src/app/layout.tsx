"use client";

import { useState } from "react";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    { role: "assistant", text: "გამარჯობა! მე ვარ იაკო. რით შემიძლია დაგეხმაროთ? 😊" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.reply || "ბოდიში, პასუხის მიღება ვერ მოხერხდა." },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "შეცდომაა კავშირში. გთხოვთ სცადოთ მოგვიანებით." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <html
      lang="ka"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>

      </head>
      <body className="min-h-full flex flex-col relative pb-12 bg-[#1b2e23] text-white">
        <main className="flex-1">{children}</main>

        {/* Global Footer - Powered by CDC Studio */}
        <footer className="w-full py-4 text-center border-t border-white/10 bg-[#16251c]/60 backdrop-blur-sm">
          <p className="text-xs text-[#C6A265]/80 font-medium tracking-wide">
            Powered by{" "}
            <a
              href="https://www.cdc.org.ge/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#C6A265] underline hover:text-white transition-colors duration-200 font-semibold"
            >
              CDC Studio
            </a>
          </p>
        </footer>

        {/* 🤖 AI ასისტენტი "იაკო" — Floating Button (Messenger-ის ზემოთ) */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-40 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#C6A265] text-[#1b2e23] shadow-2xl transition-all duration-300 hover:scale-110 border-2 border-white/20 font-bold text-2xl"
          title="AI ასისტენტი იაკო"
        >
          ✨
        </button>

        {/* 💬 იაკოს ჩატის ფანჯარა (Chat Modal) */}
        {isOpen && (
          <div className="fixed bottom-56 right-6 z-50 w-80 sm:w-96 rounded-2xl bg-[#16251c] border border-[#C6A265]/40 shadow-2xl overflow-hidden flex flex-col h-[450px]">
            {/* Header */}
            <div className="bg-[#C6A265] text-[#1b2e23] p-4 flex justify-between items-center font-bold">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <span>იაკო - ნინიკას AI ასისტენტი</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-lg hover:opacity-70 transition-opacity font-extrabold"
              >
                ✕
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-sm">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                      msg.role === "user"
                        ? "bg-[#C6A265] text-[#1b2e23] font-medium"
                        : "bg-white/10 text-white border border-white/10"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 text-white/70 rounded-2xl px-3.5 py-2 text-xs italic">
                    იაკო ფიქრობს...
                  </div>
                </div>
              )}
            </div>

            {/* Input & CDC Footer in Chat */}
            <div className="p-3 border-t border-white/10 bg-[#121f17]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2 mb-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="ჰკითხე იაკოს..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#C6A265]"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#C6A265] text-[#1b2e23] px-4 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  ➤
                </button>
              </form>

              <p className="text-[10px] text-center text-[#C6A265]/60">
                Powered by{" "}
                <a
                  href="https://www.cdc.org.ge/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-[#C6A265]"
                >
                  CDC Studio
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Facebook Messenger Floating Button */}
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
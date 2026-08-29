"use client";

import { useState, useEffect } from "react";
import { Bot, X, ChevronUp } from "lucide-react";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    { role: "assistant", text: "გამარჯობა! მე ვარ იაკო, თქვენი AI ასისტენტი. რით შემიძლია დაგეხმაროთ? 😊" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    
    // Create the updated messages array to send to API
    const updatedMessages = [...messages, { role: "user" as const, text: userMsg }];
    
    // Update local state immediately
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send messages mapped to expected format
        body: JSON.stringify({ messages: updatedMessages.map(m => ({ role: m.role, content: m.text })) }),
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
    <>
      <main className="flex-1">{children}</main>

      {/* Global Footer */}
      <footer className="w-full py-6 text-center border-t border-white/10 bg-[#1e242b]/60 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-[#d4af37]/80 font-medium tracking-wide">
            Powered by{" "}
            <a
              href="https://www.cdc.org.ge/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#d4af37] underline hover:text-white transition-colors duration-200 font-semibold"
            >
              CDC Studio
            </a>
          </p>
          <button
            onClick={() => setIsTermsOpen(true)}
            className="text-xs text-[#d4af37]/60 hover:text-[#d4af37] underline transition-colors"
          >
            წესები და პირობები
          </button>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 left-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#d4af37] text-[#121619] shadow-xl transition-all duration-300 hover:scale-110"
          title="ზემოთ ასვლა"
        >
          <ChevronUp size={24} />
        </button>
      )}

      {/* Iako AI Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-[140px] right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#C6A265] text-[#1b2e23] shadow-2xl transition-all duration-300 hover:scale-110 border-2 border-white/20"
        title="AI ასისტენტი იაკო"
      >
        <Bot size={28} />
      </button>


      {/* Iako Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-[210px] right-6 z-50 w-80 sm:w-96 rounded-2xl bg-[#1e242b] border border-[#d4af37]/40 shadow-2xl overflow-hidden flex flex-col h-[450px]">
          <div className="bg-[#d4af37] text-[#121619] p-4 flex justify-between items-center font-bold">
            <div className="flex items-center gap-2">
              <Bot size={20} />
              <span>იაკო - ნინიკას AI ასისტენტი</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:opacity-70">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-sm">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${msg.role === "user" ? "bg-[#d4af37] text-[#121619] font-medium" : "bg-white/10 text-white border border-white/10"}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && <div className="text-xs italic text-white/50">იაკო ფიქრობს...</div>}
          </div>
          <div className="p-3 border-t border-white/10 bg-[#121619]">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="ჰკითხე იაკოს..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
              />
              <button type="submit" className="bg-[#d4af37] text-[#121619] px-4 py-2 rounded-xl font-bold text-sm">➤</button>
            </form>
          </div>
        </div>
      )}

      {/* Terms Modal */}
      {isTermsOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e242b] border border-[#d4af37]/40 p-6 rounded-3xl w-full max-w-lg shadow-2xl relative">
            <button onClick={() => setIsTermsOpen(false)} className="absolute top-4 right-4 text-[#d4af37]"><X /></button>
            <h2 className="text-xl font-bold text-[#d4af37] mb-4">📜 წესები და პირობები</h2>
            <div className="space-y-3 text-sm text-[#e2e8f0]/80">
              <p>• <b>საკონტაქტო ინფორმაცია:</b> მომხმარებელი ვალდებულია მიუთითოს ზუსტი ტელეფონის ნომერი. არასწორი ნომრის ან უპასუხო ზარის შემთხვევაში, კომპანია არ იღებს პასუხისმგებლობას შეკვეთის მიწოდებაზე.</p>
              <p>• <b>შეკვეთის გაუქმება:</b> შეკვეთის გაუქმება შესაძლებელია გაფორმებიდან 15 წუთის განმავლობაში.</p>
              <p>• <b>პროდუქციის შენახვა:</b> გაყინული პროდუქციის მიღებისთანავე მომხმარებელი ვალდებულია განათავსოს ის საყინულეში.</p>
              <p>• <b>მიწოდება და ანგარიშსწორება:</b> ანგარიშსწორება ხდება კურიერთან ან გადარიცხვით. ფორსმაჟორულ სიტუაციებში მიწოდების დრო შესაძლოა შეიცვალოს.</p>
            </div>
          </div>
        </div>
      )}

      {/* Messenger */}
      <a href="https://m.me/1302047889659335" target="_blank" rel="noopener noreferrer" className="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#0084FF] text-white shadow-xl transition-all hover:scale-110">
        <svg className="h-7 w-7 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.304 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26 6.559-6.96 3.125 3.26 5.893-3.26-6.559 6.96z" /></svg>
      </a>
    </>
  );
}

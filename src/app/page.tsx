"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toEmbedUrl } from "@/lib/video";
import { ShoppingBag, Plus, Minus, X, MessageCircle, Sun, Moon, Utensils, Heart, Phone, Play } from "lucide-react";

const LOGO_URL = "https://res.cloudinary.com/dmcabui00/image/upload/v1787649626/ggef5dtdlwjuigdgmfnv.jpg";

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<{ id: number; quantity: number }[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<"menu" | "about" | "contact">("menu");
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("ადგილიდან გატანა (ოზურგეთი, ს. მგელაძის 3)");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase.from("products").select("*").order("id", { ascending: true });
    if (error) console.error("Error fetching products:", error);
    else setProducts(data || []);
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === id);
      if (existing) {
        const newQuantity = existing.quantity + delta;
        if (newQuantity <= 0) return prev.filter((item) => item.id !== id);
        return prev.map((item) => (item.id === id ? { ...item, quantity: newQuantity } : item));
      }
      if (delta > 0) return [...prev, { id, quantity: delta }];
      return prev;
    });
  };

  const getQuantity = (id: number) => cart.find((item) => item.id === id)?.quantity || 0;
  
  const cartTotal = cart.reduce((total, item) => {
    const product = products.find((p) => p.id === item.id);
    return total + (product?.price || 0) * item.quantity;
  }, 0);

  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  const handleSendOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) {
      alert("გთხოვთ შეავსოთ სახელი და ტელეფონის ნომერი!");
      return;
    }

    setIsSubmitting(true);
    const cartItems = cart.map((item) => {
      const product = products.find((p) => p.id === item.id);
      return {
        name: product?.name,
        price: product?.price,
        quantity: item.quantity,
      };
    });

    try {
      const res = await fetch("/api/send-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customerName,
          phone: customerPhone,
          delivery: deliveryMethod,
          items: cartItems,
          total: cartTotal,
        }),
      });

      if (res.ok) {
        alert("🎉 შეკვეთა წარმატებით გაიგზავნა! მალე დაგიკავშირდებით.");
        setCart([]);
        setCustomerName("");
        setCustomerPhone("");
        setIsCheckoutOpen(false);
      } else {
        alert("შეცდომა შეკვეთის გაგზავნისას.");
      }
    } catch (err) {
      console.error(err);
      alert("დაფიქსირდა შეცდომა.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const bgClass = darkMode ? "bg-[#1b2e23] text-[#F9F6F0]" : "bg-[#F9F6F0] text-[#1A1A1A]";
  const cardBgClass = darkMode ? "bg-[#253e2f] text-[#F9F6F0] border-[#345440]" : "bg-white text-[#1A1A1A] border-gray-200 shadow-md";
  const headerBgClass = darkMode ? "bg-[#14231a]" : "bg-[#2A4533]";
  const textMutedClass = darkMode ? "text-gray-300" : "text-gray-600";

  return (
    <div className={`min-h-screen ${bgClass} pb-24 font-sans transition-colors duration-300 relative`}>
      <nav className={`${headerBgClass} sticky top-0 z-40 px-6 py-3 shadow-md flex justify-between items-center border-b border-gold/20`}>
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("menu")}>
          <img src={LOGO_URL} alt="ნინიკა ლოგო" className="h-10 w-10 rounded-full object-cover border border-[#C6A265]" />
          <span className="text-xl font-bold tracking-widest text-[#C6A265]">ნინიკა</span>
        </div>
        
        <div className="hidden sm:flex gap-6 text-sm font-semibold">
          <button onClick={() => setActiveTab("menu")} className={`transition ${activeTab === "menu" ? "text-[#C6A265] border-b-2 border-[#C6A265]" : "hover:text-[#C6A265]"}`}>მენიუ</button>
          <button onClick={() => setActiveTab("about")} className={`transition ${activeTab === "about" ? "text-[#C6A265] border-b-2 border-[#C6A265]" : "hover:text-[#C6A265]"}`}>ჩვენს შესახებ</button>
          <button onClick={() => setActiveTab("contact")} className={`transition ${activeTab === "contact" ? "text-[#C6A265] border-b-2 border-[#C6A265]" : "hover:text-[#C6A265]"}`}>კონტაქტი</button>
        </div>

        <button 
          onClick={() => setDarkMode(!darkMode)} 
          className="p-2.5 rounded-full bg-gold/20 hover:bg-gold/30 text-[#C6A265] transition"
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </nav>

      <header className={`${headerBgClass} text-center py-10 px-6 shadow-inner border-b border-gold/10 flex flex-col items-center`}>
        <img 
          src={LOGO_URL} 
          alt="ნინიკა - საოჯახო სამზარეულო" 
          className="w-36 h-36 md:w-44 md:h-44 rounded-full object-cover shadow-2xl border-4 border-[#C6A265] mb-4 hover:scale-105 transition-transform" 
        />
        <p className="text-[#C6A265] text-lg md:text-xl italic max-w-xl">მეტი, ვიდრე უბრალოდ კულინარია — 50 წლიანი ოჯახური ტრადიცია 🌿</p>
        
        <div className="flex sm:hidden justify-center gap-4 mt-6 text-sm font-medium">
          <button onClick={() => setActiveTab("menu")} className={`px-4 py-2 rounded-full ${activeTab === "menu" ? "bg-[#C6A265] text-[#1A1A1A] font-bold" : "bg-white/10"}`}>მენიუ</button>
          <button onClick={() => setActiveTab("about")} className={`px-4 py-2 rounded-full ${activeTab === "about" ? "bg-[#C6A265] text-[#1A1A1A] font-bold" : "bg-white/10"}`}>ჩვენს შესახებ</button>
          <button onClick={() => setActiveTab("contact")} className={`px-4 py-2 rounded-full ${activeTab === "contact" ? "bg-[#C6A265] text-[#1A1A1A] font-bold" : "bg-white/10"}`}>კონტაქტი</button>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto">
        {activeTab === "menu" && (
          <section>
            <h2 className="text-3xl font-bold mb-8 text-[#C6A265] border-b border-gold/20 pb-3 flex items-center gap-2">
              <Utensils size={28} /> ჩვენი მენიუ
            </h2>

            {products.length === 0 ? (
              <p className="text-center text-lg py-12 opacity-70">პროდუქტები იტვირთება ან ჯერ არ არის დამატებული...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.map((product) => (
                  <div key={product.id} className={`${cardBgClass} rounded-2xl border overflow-hidden flex flex-col hover:scale-[1.02] transition-transform duration-200`}>
                    <img src={product.image} alt={product.name} className="w-full h-48 object-cover" />
                    
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-xl font-bold">{product.name}</h3>
                          <p className="text-[#C6A265] font-extrabold text-lg whitespace-nowrap ml-2">
                            {Number(product.price).toFixed(2)} ₾ <span className="text-xs font-normal opacity-70">/ {product.unit}</span>
                          </p>
                        </div>
                        <p className={`text-sm ${textMutedClass} mb-4 leading-relaxed`}>
                          {product.description}
                        </p>

                        {product.video_url && (
                          <button
                            onClick={() => setSelectedVideo(toEmbedUrl(product.video_url))}
                            className="mb-4 flex items-center gap-2 text-xs font-bold text-[#C6A265] bg-gold/10 hover:bg-gold/20 px-3 py-2 rounded-xl border border-gold/30 transition w-full justify-center"
                          >
                            <Play size={14} fill="currentColor" /> მომზადების წესი (ვიდეო)
                          </button>
                        )}
                      </div>
                      
                      <div className="mt-auto flex items-center justify-between bg-black/10 rounded-full p-1.5 border border-gold/30">
                        <button onClick={() => updateQuantity(product.id, -1)} className="w-9 h-9 flex items-center justify-center rounded-full bg-white text-black font-bold shadow hover:bg-[#C6A265] hover:text-white transition">
                          <Minus size={16} />
                        </button>
                        <span className="font-bold text-lg w-8 text-center">{getQuantity(product.id)}</span>
                        <button onClick={() => updateQuantity(product.id, 1)} className="w-9 h-9 flex items-center justify-center rounded-full bg-[#C6A265] text-black font-bold shadow hover:bg-gold transition">
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "about" && (
          <section className={`${cardBgClass} p-8 rounded-3xl border shadow-xl leading-relaxed space-y-6`}>
            <h2 className="text-3xl font-bold text-[#C6A265] mb-4 border-b border-gold/20 pb-3 flex items-center gap-2">
              <Heart size={28} /> "ნინიკა" — რატომ და როგორ
            </h2>
            <p className="text-lg">
              ხშირად მეკითხებიან, რატომ გადავწყვიტე ნახევარფაბრიკატების წარმოება და რატომ მაინცდამაინც ახლა. მით უმეტეს, ჩემს საყვარელ პროფესიას — მასწავლებლობას ვემსახურები, მაქვს ჩემი საქმე და ვარ შემდგარი ადამიანი.
            </p>
            <p className="text-lg">
              სიმართლე ის არის, რომ ეს იდეა ახლა არ გაჩენილა. ეს ყველაფერი ბევრად ადრე დაიწყო — ჩემს ოჯახში, ჩემს ბავშვობაში, იმ სამზარეულოში, სადაც კულინარია უბრალოდ საქმე კი არა, ცხოვრების ნაწილი იყო. ჩვენს ოჯახს კულინარიაში ნახევარსაუკუნოვანი პროფესიული გამოცდილება მაინც აქვს (ბევრს ალბათ ტკბილად ახსენდება კიდეც ქალაქში ცნობილი სასაუზმე „ცისნამი“).
            </p>
            <div className="bg-gold/10 border-l-4 border-[#C6A265] p-5 rounded-r-2xl italic my-4">
              "ჩვენ ყოველთვის გვინდოდა, ნინის ჰქონოდა ის, რაც ყველა ადამიანს სჭირდება — თავდაჯერებულობა, საკუთარი შესაძლებლობების რწმენა, დამოუკიდებლობის განცდა და საკუთარი შრომით მიღწეული ფინანსური სტაბილურობა."
            </div>
            <p className="text-lg">
              „ნინიკა“ მხოლოდ ნახევარფაბრიკატების საწარმო არ არის: ეს არის დედისგან მიღებული კულინარიული ტრადიციის გაგრძელება, ჩემი და ნინის ერთად გავლილი გზა და ჩვენი მცდელობა, რომ ნინის ჰქონდეს თავისი საქმე, თავისი ადგილი და საკუთარი მომავლის შექმნის შესაძლებლობა.
            </p>
          </section>
        )}

        {activeTab === "contact" && (
          <section className={`${cardBgClass} p-8 rounded-3xl border shadow-xl space-y-6`}>
            <h2 className="text-3xl font-bold text-[#C6A265] mb-4 border-b border-gold/20 pb-3 flex items-center gap-2">
              <Phone size={28} /> დაგვიკავშირდით
            </h2>
            <div className="space-y-4 text-lg">
              <p>📍 <strong>მისამართი:</strong> ქ. ოზურგეთი, სოფო მგელაძის ქუჩა, №3</p>
              <p>📞 <strong>ტელეფონი:</strong> +995 551 50 06 06</p>
              <p>✉️ <strong>ელ-ფოსტა:</strong> ninika.kitchen@gmail.com</p>
              <p>⏰ <strong>სამუშაო საათები:</strong> ყოველდღე 09:00 - 19:00</p>
            </div>
          </section>
        )}
      </main>

      {selectedVideo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#253e2f] border border-gold/30 p-4 rounded-3xl w-full max-w-2xl relative shadow-2xl">
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute -top-3 -right-3 bg-[#C6A265] text-black p-2 rounded-full hover:bg-gold shadow-lg z-10"
            >
              <X size={20} />
            </button>
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black">
              <iframe
                src={selectedVideo}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {cartItemCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-6 flex justify-center z-30">
          <button 
            onClick={() => setIsCheckoutOpen(true)}
            className="bg-[#C6A265] text-black font-extrabold px-6 py-4 rounded-full shadow-2xl flex items-center gap-4 hover:bg-gold w-full max-w-md transition-transform transform hover:scale-105"
          >
            <div className="relative">
              <ShoppingBag />
              <span className="absolute -top-2 -right-2 bg-black text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                {cartItemCount}
              </span>
            </div>
            <span className="font-bold flex-1 text-left">კალათის ნახვა</span>
            <span className="font-extrabold">{cartTotal.toFixed(2)} ₾</span>
          </button>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className={`${cardBgClass} w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto relative border border-gold/30`}>
            <button onClick={() => setIsCheckoutOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-black/20 rounded-full">
              <X size={20} />
            </button>
            <h2 className="text-2xl font-bold mb-6 text-[#C6A265]">შეკვეთის გაფორმება</h2>
            
            <form onSubmit={handleSendOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">სახელი</label>
                <input 
                  type="text" 
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gold/30 bg-black/20 focus:outline-none focus:border-gold text-white" 
                  placeholder="თქვენი სახელი" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">ტელეფონი</label>
                <input 
                  type="tel" 
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gold/30 bg-black/20 focus:outline-none focus:border-gold text-white" 
                  placeholder="5XX XX XX XX" 
                />
              </div>
              <div className="pt-2">
                <label className="block text-sm font-semibold mb-2">მიტანის მეთოდი</label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border border-gold/20 rounded-xl bg-black/10 cursor-pointer hover:border-gold">
                    <input 
                      type="radio" 
                      name="delivery" 
                      className="mr-3 accent-gold" 
                      checked={deliveryMethod.includes("ადგილიდან")}
                      onChange={() => setDeliveryMethod("ადგილიდან გატანა (ოზურგეთი, ს. მგელაძის 3)")}
                    />
                    <span className="text-sm">ადგილიდან გატანა (ოზურგეთი, ს. მგელაძის 3)</span>
                  </label>
                  <label className="flex items-center p-3 border border-gold/20 rounded-xl bg-black/10 cursor-pointer hover:border-gold">
                    <input 
                      type="radio" 
                      name="delivery" 
                      className="mr-3 accent-gold"
                      checked={deliveryMethod.includes("კურიერი")}
                      onChange={() => setDeliveryMethod("კურიერის მომსახურება")}
                    />
                    <span className="text-sm">კურიერის მომსახურება</span>
                  </label>
                </div>
              </div>

              <div className="border-t border-gold/20 pt-4 mt-6">
                <div className="flex justify-between font-bold text-lg mb-4">
                  <span>ჯამი სულ:</span>
                  <span className="text-[#C6A265]">{cartTotal.toFixed(2)} ₾</span>
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-[#C6A265] text-black font-extrabold py-4 rounded-xl shadow-lg hover:bg-gold transition text-lg disabled:opacity-50"
                >
                  {isSubmitting ? "იგზავნება..." : "შეკვეთის გაგზავნა"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="bg-black/20 py-10 mt-16 text-center border-t border-gold/10">
        <h3 className="text-[#C6A265] font-bold mb-6 text-lg">შემოგვიერთდით სოციალურ ქსელებში</h3>
        <div className="flex justify-center gap-6">
          <a href="https://www.facebook.com/profile.php?id=61593903144748" target="_blank" rel="noopener noreferrer" className="hover:text-[#C6A265] transition-transform transform hover:scale-110">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
          </a>
          <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" className="hover:text-[#C6A265] transition-transform transform hover:scale-110">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          </a>
          <a href="https://www.youtube.com/@Ninika-ge" target="_blank" rel="noopener noreferrer" className="hover:text-[#C6A265] transition-transform transform hover:scale-110">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>
          </a>
          <a href="https://www.tiktok.com/@ninika.kitchen" target="_blank" rel="noopener noreferrer" className="hover:text-[#C6A265] transition-transform transform hover:scale-110">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /></svg>
          </a>
        </div>
        <p className="text-sm opacity-50 mt-8">© 2026 ნინიკა. ყველა უფლება დაცულია.</p>
      </footer>

      <a
        href="https://m.me/1302047889659335"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-28 right-6 md:bottom-6 bg-[#C6A265] text-black p-4 rounded-full shadow-2xl hover:bg-gold transition-transform transform hover:scale-110 z-40 flex items-center justify-center animate-bounce"
      >
        <MessageCircle size={28} />
      </a>
    </div>
  );
}
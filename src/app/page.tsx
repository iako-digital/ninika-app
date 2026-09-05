"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toEmbedUrl } from "@/lib/video";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary";
import { ShoppingBag, Plus, Minus, X, Sun, Moon, Utensils, Play, Phone, MapPin, Heart, CreditCard, Upload, Mail, MessageCircle, Send, Loader2 } from "lucide-react";

const LOGO_URL = "https://res.cloudinary.com/dmcabui00/image/upload/v1787649626/ggef5dtdlwjuigdgmfnv.jpg";
const ABOUT_IMAGE_URL = "https://res.cloudinary.com/dmcabui00/image/upload/v1787778078/kjjj9csmntqx76go6kha.jpg";

const ACCOUNT_HOLDER = "ნინო რამიშვილი (Nino Ramishvili)";
const BANK_ACCOUNTS = [
  { bank: "საქართველოს ბანკი (Bank of Georgia)", iban: "GE83BG0000000533988390" },
  { bank: "თიბისი ბანკი (TBC Bank)", iban: "GE04TB7443345064300113" },
];

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<{ id: number; quantity: number }[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<"menu" | "about" | "contact">("menu");
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>("ყველა");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("ადგილიდან გატანა (ოზურგეთი, ს. მგელაძის 3)");
  const [paymentMethod, setPaymentMethod] = useState("ადგილზე გადახდა (ნაღდი/ბარათი)");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedIban, setCopiedIban] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();

    const channel = supabase
      .channel("products_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const handleCopyIban = (iban: string) => {
    navigator.clipboard.writeText(iban);
    setCopiedIban(iban);
    setTimeout(() => setCopiedIban((prev) => (prev === iban ? null : prev)), 2000);
  };
  
  const cartTotal = cart.reduce((total, item) => {
    const product = products.find((p) => p.id === item.id);
    return total + (product?.price || 0) * item.quantity;
  }, 0);

  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  const isReceiptMissing = paymentMethod.includes("ანგარიშის") && !receiptFile;

  // 🛠️ გასწორებული ფილტრაციის ლოგიკა
  const filteredProducts = products.filter((p) => {
    if (selectedCategory === "ყველა") return true;
    if (selectedCategory === "ხინკალი") return p.name.includes("ხინკალი") || (p.categories || []).includes("ხინკალი");
    if (selectedCategory === "პელმენი") return p.name.includes("პელმენი") || (p.categories || []).includes("პელმენი");
    if (selectedCategory === "ვარენიკი") return p.name.includes("ვარენიკი") || (p.categories || []).includes("ვარენიკი");
    if (selectedCategory === "კოტლეტი") return p.name.includes("კოტლეტი") || p.name.includes("გუფთა") || (p.categories || []).includes("კოტლეტი");
    if (selectedCategory === "ქაბაბი") return p.name.includes("ქაბაბი") || (p.categories || []).includes("ქაბაბი");
    if (selectedCategory === "სამარხვო") return p.name.includes("სამარხვო") || p.name.includes("სოკოს") || (p.categories || []).includes("სამარხვო");
    
    // მხოლოდ ცოცხალი / გაუყინავი (გამორიცხავს გაყინულებს)
    if (selectedCategory === "ცოცხალი / გაუყინავი") {
      return p.state_type === "fresh" || p.name.includes("ცოცხალი") || p.name.includes("გაუყინავი");
    }
    
    // მხოლოდ გაყინული
    if (selectedCategory === "❄️ გაყინული") {
      return p.state_type === "frozen" || (!p.state_type && !p.name.includes("ცოცხალი") && !p.name.includes("გაუყინავი"));
    }
    
    return true;
  });

  const handleSendOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) {
      alert("გთხოვთ შეავსოთ სახელი და ტელეფონის ნომერი!");
      return;
    }

    if (isReceiptMissing) {
      alert("გთხოვთ ატვირთოთ გადარიცხვის ქვითარი!");
      return;
    }

    setIsSubmitting(true);

    try {
      let receiptBase64 = "";
      let receiptName = "";

      if (paymentMethod.includes("ანგარიშის") && receiptFile) {
        receiptName = receiptFile.name;
        receiptBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(receiptFile);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
        });
      }

      const cartItems = cart.map((item) => {
        const product = products.find((p) => p.id === item.id);
        return {
          name: product?.name,
          price: product?.price,
          quantity: item.quantity,
        };
      });

      const res = await fetch("/api/send-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customerName,
          phone: customerPhone,
          delivery: deliveryMethod,
          payment: paymentMethod,
          items: cartItems,
          total: cartTotal,
          receiptBase64: receiptBase64,
          receiptName: receiptName,
        }),
      });

      if (res.ok) {
        alert("🎉 შეკვეთა წარმატებით გაიგზავნა! მალე დაგიკავშირდებით.");
        setCart([]);
        setCustomerName("");
        setCustomerPhone("");
        setReceiptFile(null);
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
      <nav className={`${headerBgClass} sticky top-0 z-40 px-4 md:px-6 py-3 shadow-md flex items-center justify-between border-b border-[#C6A265]/20`}>
        <div className="flex items-center cursor-pointer shrink-0" onClick={() => setActiveTab("menu")}>
          <img src={optimizeCloudinaryUrl(LOGO_URL)} alt="ნინიკა ლოგო" className="h-10 w-10 md:h-11 md:w-11 rounded-full object-cover border border-[#C6A265]" />
        </div>
        
        <div className="flex items-center gap-4 sm:gap-6 md:gap-8 text-sm sm:text-base font-semibold">
          <button onClick={() => setActiveTab("menu")} className={`py-1 transition whitespace-nowrap ${activeTab === "menu" ? "text-[#C6A265] border-b-2 border-[#C6A265]" : "hover:text-[#C6A265]"}`}>მენიუ</button>
          <button onClick={() => setActiveTab("about")} className={`py-1 transition whitespace-nowrap ${activeTab === "about" ? "text-[#C6A265] border-b-2 border-[#C6A265]" : "hover:text-[#C6A265]"}`}>ჩვენს შესახებ</button>
          <button onClick={() => setActiveTab("contact")} className={`py-1 transition whitespace-nowrap ${activeTab === "contact" ? "text-[#C6A265] border-b-2 border-[#C6A265]" : "hover:text-[#C6A265]"}`}>კონტაქტი</button>
        </div>

        <button 
          onClick={() => setDarkMode(!darkMode)} 
          className="p-2 rounded-full bg-[#C6A265]/20 hover:bg-[#C6A265]/30 text-[#C6A265] transition shrink-0 ml-1"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </nav>

      <header className={`${headerBgClass} text-center py-8 px-4 shadow-inner border-b border-[#C6A265]/10 flex flex-col items-center`}>
        <img 
          src={optimizeCloudinaryUrl(LOGO_URL)} 
          alt="ნინიკა - საოჯახო სამზარეულო" 
          className="w-28 h-28 md:w-36 md:h-36 rounded-full object-cover shadow-2xl border-4 border-[#C6A265] mb-3 hover:scale-105 transition-transform" 
        />
        <p className="text-[#C6A265] text-base md:text-xl italic max-w-xl">მეტი, ვიდრე უბრალოდ კულინარია!</p>
      </header>

      <main className="p-4 md:p-6 max-w-5xl mx-auto">
        {activeTab === "menu" && (
          <section>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2 border-b border-[#C6A265]/20 pb-3">
              <h2 className="text-2xl md:text-3xl font-bold text-[#C6A265] flex items-center gap-2">
                <Utensils size={28} /> ჩვენი მენიუ
              </h2>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                {["ყველა", "ხინკალი", "პელმენი", "ვარენიკი", "კოტლეტი", "ქაბაბი", "სამარხვო", "ცოცხალი / გაუყინავი", "❄️ გაყინული"].map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition border ${
                      selectedCategory === category
                        ? "bg-[#C6A265] text-black border-[#C6A265]"
                        : "bg-black/20 text-[#C6A265] border-[#C6A265]/20 hover:border-[#C6A265]/50"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <p className="text-center text-lg py-12 opacity-70">პროდუქტები არ მოიძებნა...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.is_available === false;
                  return (
                  <div key={product.id} className={`${cardBgClass} rounded-2xl border overflow-hidden flex flex-col hover:scale-[1.01] transition-transform duration-200 ${isOutOfStock ? "opacity-60" : ""}`}>
                    <div className="relative">
                      <img src={optimizeCloudinaryUrl(product.image)} alt={product.name} className={`w-full h-48 object-cover ${isOutOfStock ? "grayscale" : ""}`} />
                      {isOutOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <span className="bg-black/80 text-[#C6A265] text-sm font-bold px-4 py-2 rounded-full border border-[#C6A265]/50 whitespace-nowrap">
                            დროებით ამოიწურა ⏳
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-col">
                            <h3 className="text-xl font-bold">{product.name}</h3>
                            <div className="mt-1">
                               {product.state_type === 'fresh' || product.name.includes('ცოცხალი') || product.name.includes('გაუყინავი') ? (
                                 <span className="text-[10px] font-bold bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">ცოცხალი / გაუყინავი</span>
                               ) : (
                                 <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">❄️ გაყინული</span>
                               )}
                            </div>
                          </div>
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
                            className="mb-4 flex items-center gap-2 text-xs font-bold text-[#C6A265] bg-[#C6A265]/10 hover:bg-[#C6A265]/20 px-3 py-2 rounded-xl border border-[#C6A265]/30 transition w-full justify-center"
                          >
                            <Play size={14} fill="currentColor" /> მომზადების წესი (ვიდეო)
                          </button>
                        )}
                      </div>
                      
                      <div className="mt-auto flex items-center justify-between bg-black/10 rounded-full p-1.5 border border-[#C6A265]/30">
                        <button
                          onClick={() => updateQuantity(product.id, -1)}
                          disabled={isOutOfStock}
                          className={`w-9 h-9 flex items-center justify-center rounded-full font-bold shadow transition ${
                            isOutOfStock ? "bg-white/40 text-black/40 cursor-not-allowed" : "bg-white text-black hover:bg-[#C6A265] hover:text-white"
                          }`}
                        >
                          <Minus size={16} />
                        </button>
                        <span className="font-bold text-lg w-8 text-center">{getQuantity(product.id)}</span>
                        <button
                          onClick={() => updateQuantity(product.id, 1)}
                          disabled={isOutOfStock}
                          className={`w-9 h-9 flex items-center justify-center rounded-full font-bold shadow transition ${
                            isOutOfStock ? "bg-[#C6A265]/40 text-black/40 cursor-not-allowed" : "bg-[#C6A265] text-black hover:bg-gold"
                          }`}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === "about" && (
          <section className={`${cardBgClass} p-6 md:p-10 rounded-3xl border border-[#C6A265]/30 space-y-6 max-w-3xl mx-auto shadow-2xl`}>
            <div className="w-full overflow-hidden rounded-2xl border border-[#C6A265]/30 shadow-lg mb-6">
              <img src={optimizeCloudinaryUrl(ABOUT_IMAGE_URL)} alt="ნინიკა - ჩვენს შესახებ" className="w-full h-auto object-cover max-h-[450px]" />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#C6A265]/20 pb-3">
              <h2 className="text-3xl font-bold text-[#C6A265] flex items-center gap-2">
                <Heart size={28} /> მეტი, ვიდრე კულინარია
              </h2>
              <div className="flex items-center gap-3">
                <a href="https://www.facebook.com/ninika.ge" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-[#C6A265]/70 hover:text-[#C6A265] transition-transform transform hover:scale-110">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </a>
                <a href="https://www.instagram.com/ninika.ge/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-[#C6A265]/70 hover:text-[#C6A265] transition-transform transform hover:scale-110">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </a>
                <a href="https://www.tiktok.com/@ninika.kitchen" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="text-[#C6A265]/70 hover:text-[#C6A265] transition-transform transform hover:scale-110">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
                </a>
                <a href="https://www.youtube.com/@Ninika-ge" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="text-[#C6A265]/70 hover:text-[#C6A265] transition-transform transform hover:scale-110">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>
                </a>
              </div>
            </div>

            <div className="space-y-4 text-base md:text-lg leading-relaxed opacity-90">
              <p>
                ხშირად მეკითხებიან, რატომ გადავწყვიტე ნახევარფაბრიკატების წარმოება და რატომ მაინცდამაინც ახლა. მით უმეტეს, ჩემს საყვარელ პროფესიას — მასწავლებლობას ვემსახურები, მაქვს ჩემი საქმე და ვარ შემდგარი ადამიანი.
              </p>
              <p>
                სიმართლე ის არის, რომ ეს იდეა ახლა არ გაჩენილა. ეს ყველაფერი ბევრად ადრე დაიწყო — ჩემს ოჯახში, ჩემს ბავშვობაში, იმ სამზარეულოში, სადაც კულინარია უბრალოდ საქმე კი არა, ცხოვრების ნაწილი იყო. ჩვენს ოჯახს კულინარიაში ნახევარსაუკუნოვანი პროფესიული გამოცდილება მაინც აქვს და აი, ამ ტრადიციას თავისდაუნებურად, იქნებ არც თუ შემთხვევით, გადაეჯაჭვა ჩემი გოგონას, ნინის ინტერესი.
              </p>
              <p>
                ბევრი თქვენგანი იცნობს ნინის, როგორც განსაკუთრებულ გოგონას. იცით, რომ ნინის ცხოვრებაში ბევრი რამ ცოტა მეტი ყურადღებით, მოთმინებითა და მხარდაჭერით მოდის.
              </p>

              <div className="bg-black/20 p-5 rounded-2xl border border-[#C6A265]/20 space-y-2">
                <p className="font-semibold text-[#C6A265]">ჩვენ ყოველთვის გვინდოდა, მას ჰქონოდა ის, რაც ყველა ადამიანს სჭირდება:</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>თავდაჯერებულობა</li>
                  <li>საკუთარი შესაძლებლობების რწმენა</li>
                  <li>დამოუკიდებლობის განცდა</li>
                  <li>საკუთარი შრომით მიღწეული ფინანსური სტაბილურობა</li>
                </ul>
              </div>

              <p>
                არ გვინდოდა, მისი ცხოვრება მხოლოდ სხვების დახმარებაზე ყოფილიყო დამოკიდებული. გვინდოდა, მისთვის შეგვექმნა საქმე, რომელშიც ის იქნებოდა მნიშვნელოვანი და წარმატებული.
              </p>
              <p>
                ვთვლი, რომ ამ მიმართულებით სერიოზული ნაბიჯი გადავდგი და დავეუფლე კულინარიის ხელოვნებას პროფესიულ დონეზე. კარგად ვიცით — კულინარიაში მხოლოდ სურვილი არ არის საკმარისი. საჭიროა გამოცდილება, ცოდნა, პროფესიონალიზმი, ხარისხი და პასუხისმგებლობა. განსაკუთრებით ჩვენს ქალაქში, სადაც მომხმარებელი ძალიან გემოვნებიანი და მომთხოვნია. აქ ზერელედ მომზადებულ პროდუქტს ვერ შესთავაზებ ადამიანს და ვერ დაელოდები, რომ მხოლოდ სახელით ან ლამაზი შეფუთვით გამოგიცხადებს ნდობას. ნდობა უნდა დაიმსახურო!
              </p>
              <p>
                ამიტომ „ნინიკა“ სპონტანური გადაწყვეტილება არ ყოფილა. ეს არის დიდი ფიქრის, მომზადების, სწავლისა და იმ სურვილის შედეგი, რომ ნინის ჰქონდეს საკუთარი ადგილი, საკუთარი საქმე და საკუთარი შესაძლებლობების დამტკიცების სივრცე.
              </p>
              <p>
                ჯერ კიდევ ბევრი რამ გვაქვს გასაკეთებელი, ბევრი დეტალია დასაორგანიზებელი და დასახვეწი, რომ ჩვენს საწარმოს ის სრულყოფილი სახე მივცეთ, როგორსაც წარმოვიდგენთ. მაგრამ უკვე შეგვიძლია, თავდაჯერებულად წარვდგეთ თქვენ წინაშე.
              </p>

              <div className="bg-[#C6A265]/10 p-5 rounded-2xl border border-[#C6A265]/30 space-y-2">
                <p className="font-bold text-lg text-[#C6A265]">„ნინიკა“ მხოლოდ ნახევარფაბრიკატების საწარმო არ არის:</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>ეს არის ჩემი ოჯახისგან მიღებული კულინარიული ტრადიციის გაგრძელება;</li>
                  <li>არის ჩემი და ნინის ერთად გავლილი გზა;</li>
                  <li>არის ჩვენი შრომა და, რაც მთავარია, ჩვენი მცდელობა, რომ ნინის ჰქონდეს თავისი საქმე, თავისი ადგილი და საკუთარი მომავლის შექმნის შესაძლებლობა.</li>
                </ul>
              </div>

              <p>
                ამიტომაც ჰქვია ჩვენს საწარმოს „ნინიკა“. ეს არის ჩემი გოგონას სახელი, მისი შესაძლებლობების რწმენა და ჩვენი დიდი ოცნება — ვაქციოთ ეს საქმე მის დამოუკიდებელ და ღირსეულ მომავალად.
              </p>
              <p className="font-semibold text-[#C6A265] italic border-l-4 border-[#C6A265] pl-4 py-1">
                და როცა ერთ დღეს „ნინიკას“ პროდუქტს თქვენს ოჯახებში შეიტანთ, მინდა იცოდეთ, რომ თქვენ უბრალოდ ნახევარფაბრიკატს არ ყიდულობთ. თქვენ მხარს უჭერთ ერთ სიყვარულით სავსე გოგონას, რომელსაც სურს, შეძლოს დამოუკიდებლობა... და ჩვენ გვჯერა, რომ შეძლებს.
              </p>

              <div className="pt-4 text-[#C6A265] font-bold flex flex-wrap gap-2 text-sm">
                #ნინიკა #სიყვარულითმომზადებული #ნახევარფაბრიკატები #ოჯახურიტრადიცია #ქართულიკულინარია #დამოუკიდებელიმომავალი #გურულიგემო #ოზურგეთი
              </div>

              <p className="text-right italic text-[#C6A265]/80 text-sm pt-2">
                — „ნინიკას“ დამფუძნებელი, ლელა საჯაია
              </p>
            </div>
          </section>
        )}

        {activeTab === "contact" && (
          <section className={`${cardBgClass} p-8 rounded-3xl border border-[#C6A265]/30 space-y-6 max-w-xl mx-auto shadow-2xl`}>
            <h2 className="text-3xl font-bold text-[#C6A265] border-b border-[#C6A265]/20 pb-3 flex items-center gap-2">
              <Phone size={28} /> საკონტაქტო ინფორმაცია
            </h2>

            <div className="space-y-4 text-lg">
              <div className="flex items-center gap-4 bg-black/20 p-4 rounded-2xl border border-[#C6A265]/20">
                <MapPin className="text-[#C6A265]" size={24} />
                <div>
                  <p className="text-xs opacity-70">მისამართი</p>
                  <p className="font-bold">ოზურგეთი, ს. მგელაძის 3</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-black/20 p-4 rounded-2xl border border-[#C6A265]/20">
                <Phone className="text-[#C6A265]" size={24} />
                <div>
                  <p className="text-xs opacity-70">ტელეფონი</p>
                  <a href="tel:551500606" className="font-bold text-[#C6A265] hover:underline">551 50 06 06</a>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-black/20 p-4 rounded-2xl border border-[#C6A265]/20">
                <Mail className="text-[#C6A265]" size={24} />
                <div>
                  <p className="text-xs opacity-70">ელ.ფოსტა</p>
                  <a href="mailto:info@ninika.ge" className="font-bold text-[#C6A265] hover:underline">info@ninika.ge</a>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {selectedVideo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#253e2f] border border-[#C6A265]/30 p-4 rounded-3xl w-full max-w-2xl relative shadow-2xl">
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#253e2f] text-white border border-[#C6A265]/30 p-6 md:p-8 rounded-3xl w-full max-w-lg relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-[#C6A265] mb-6 flex items-center gap-2">
              <ShoppingBag size={24} /> თქვენი შეკვეთა
            </h2>

            <div className="space-y-3 mb-6 border-b border-[#C6A265]/20 pb-4">
              {cart.map((item) => {
                const product = products.find((p) => p.id === item.id);
                if (!product) return null;
                return (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-bold">{product.name}</span>
                      <span className="text-gray-400 text-xs ml-2">({item.quantity} x {product.price.toFixed(2)} ₾)</span>
                    </div>
                    <span className="font-bold text-[#C6A265]">{(product.price * item.quantity).toFixed(2)} ₾</span>
                  </div>
                );
              })}
              <div className="flex justify-between items-center text-lg font-bold text-[#C6A265] pt-2">
                <span>სულ ჯამი:</span>
                <span>{cartTotal.toFixed(2)} ₾</span>
              </div>
            </div>

            <form onSubmit={handleSendOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">სახელი და გვარი</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="მაგ: გიორგი გიორგაძე"
                  className="w-full p-3 rounded-xl bg-black/20 border border-[#C6A265]/30 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">ტელეფონის ნომერი</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="595 00 00 00"
                  className="w-full p-3 rounded-xl bg-black/20 border border-[#C6A265]/30 text-white focus:outline-none"
                />
                <p className="text-xs text-amber-300 mt-1">
                  ⚠️ გთხოვთ, ყურადღებით შეამოწმოთ ნომერი — შეკვეთის დასადასტურებლად დაგიკავშირდებით.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">მიღების მეთოდი</label>
                <select
                  value={deliveryMethod}
                  onChange={(e) => setDeliveryMethod(e.target.value)}
                  className="w-full p-3 rounded-xl bg-black/20 border border-[#C6A265]/30 text-white focus:outline-none"
                >
                  <option value="ადგილიდან გატანა (ოზურგეთი, ს. მგელაძის 3)">ადგილიდან გატანა (ოზურგეთი, ს. მგელაძის 3)</option>
                  <option value="მიტანის სერვისი (ოზურგეთი)">მიტანის სერვისი (ოზურგეთი)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">გადახდის მეთოდი</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-3 rounded-xl bg-black/20 border border-[#C6A265]/30 text-white focus:outline-none font-semibold text-[#C6A265]"
                >
                  <option value="ადგილზე გადახდა (ნაღდი/ბარათი)">💵 ადგილზე გადახდა (ნაღდი / ბარათი)</option>
                  <option value="ანგარიშის ნომერზე გადარიცხვა">💳 ანგარიშის ნომერზე გადარიცხვა</option>
                </select>
              </div>

              {paymentMethod.includes("ანგარიშის") && (
                <div className="space-y-4 pt-2 border-t border-[#C6A265]/20">
                  <div className="bg-black/30 p-4 rounded-2xl border border-[#C6A265]/30 space-y-3 text-sm">
                    <p className="font-bold text-[#C6A265] flex items-center gap-2">
                      <CreditCard size={18} /> გადახდის რეკვიზიტები
                    </p>
                    <p className="text-xs opacity-80">
                      ანგარიშის მფლობელი: <span className="font-semibold text-white">{ACCOUNT_HOLDER}</span>
                    </p>
                    {BANK_ACCOUNTS.map((acc) => (
                      <div key={acc.iban} className="space-y-1">
                        <p className="text-xs opacity-80">{acc.bank}</p>
                        <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-xl border border-[#C6A265]/20 gap-2">
                          <span className="font-mono text-xs font-bold tracking-wider break-all">{acc.iban}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyIban(acc.iban)}
                            className={`shrink-0 text-xs font-bold whitespace-nowrap transition ${
                              copiedIban === acc.iban ? "text-green-400" : "text-[#C6A265] hover:underline"
                            }`}
                          >
                            {copiedIban === acc.iban ? "დაკოპირდა! ✓" : "დაკოპირება"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      გადარიცხვის ქვითარი <span className="text-[#C6A265] font-bold">(აუცილებელია)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        id="receipt-upload"
                        onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <label
                        htmlFor="receipt-upload"
                        className={`w-full p-3 rounded-xl border border-dashed text-white flex items-center justify-center gap-2 cursor-pointer transition text-sm ${
                          !receiptFile 
                            ? "bg-red-500/10 border-red-400 hover:border-red-300" 
                            : "bg-black/20 border-[#C6A265]/50 hover:border-[#C6A265]"
                        }`}
                      >
                        <Upload size={18} className="text-[#C6A265]" />
                        {receiptFile ? receiptFile.name : "ატვირთეთ ქვითრის ფოტო"}
                      </label>
                    </div>
                    {isReceiptMissing && (
                      <p className="text-xs text-red-400 mt-1 font-medium">
                        * ქვითრის აუტვირთავად შეკვეთას ვერ გააგზავნით.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || isReceiptMissing}
                className={`w-full font-extrabold py-4 rounded-xl transition text-lg mt-4 shadow-lg ${
                  isSubmitting || isReceiptMissing
                    ? "bg-gray-500/50 text-gray-300 cursor-not-allowed opacity-60"
                    : "bg-[#C6A265] hover:bg-gold text-black cursor-pointer hover:scale-[1.01]"
                }`}
              >
                {isSubmitting 
                  ? "იგზავნება..." 
                  : isReceiptMissing 
                    ? "ატვირთეთ ქვითარი" 
                    : "შეკვეთის დადასტურება (გაგზავნა)"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
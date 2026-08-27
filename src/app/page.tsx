"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toEmbedUrl } from "@/lib/video";
import { ShoppingBag, Plus, Minus, X, Sun, Moon, Utensils, Play, Phone, MapPin, Heart, CreditCard, Upload } from "lucide-react";

const LOGO_URL = "https://res.cloudinary.com/dmcabui00/image/upload/v1787649626/ggef5dtdlwjuigdgmfnv.jpg";
const ABOUT_IMAGE_URL = "https://res.cloudinary.com/dmcabui00/image/upload/v1787778078/kjjj9csmntqx76go6kha.jpg";

const BANK_ACCOUNT = "GE00TB0000000000000000"; 
const BANK_NAME = "თიბისი ბანკი (შპს ნინიკა / ლელა საჯაია)";

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<{ id: number; quantity: number }[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<"menu" | "about" | "contact">("menu");
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  // კატეგორიის ფილტრი
  const [selectedCategory, setSelectedCategory] = useState<string>("ყველა");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("ადგილიდან გატანა (ოზურგეთი, ს. მგელაძის 3)");
  const [paymentMethod, setPaymentMethod] = useState("ადგილზე გადახდა (ნაღდი/ბარათი)");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();

    // Supabase Realtime - ადმინიდან გაკეთებული ცვლილებების მყისიერი ასახვა
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
  
  const cartTotal = cart.reduce((total, item) => {
    const product = products.find((p) => p.id === item.id);
    return total + (product?.price || 0) * item.quantity;
  }, 0);

  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  const isReceiptMissing = paymentMethod.includes("ანგარიშის") && !receiptFile;

  // კატეგორიით გაფილტვრის ლოგიკა
  const filteredProducts = products.filter((p) => {
    if (selectedCategory === "ყველა") return true;
    if (selectedCategory === "ხინკალი") return p.name.includes("ხინკალი");
    if (selectedCategory === "პელმენი / ვარენიკი") return p.name.includes("პელმენი") || p.name.includes("ვარენიკი");
    if (selectedCategory === "კოტლეტი / ქაბაბი") return p.name.includes("კოტლეტი") || p.name.includes("ქაბაბი") || p.name.includes("გუფთა");
    if (selectedCategory === "სამარხვო") return p.name.includes("სამარხვო") || p.name.includes("სოკოს");
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
      {/* გასწორებული ნავიგაცია — ტექსტი "ნინიკა" ამოღებულია, მხოლოდ ლოგოა */}
      <nav className={`${headerBgClass} sticky top-0 z-40 px-4 md:px-6 py-3 shadow-md flex items-center justify-between border-b border-[#C6A265]/20`}>
        <div className="flex items-center cursor-pointer shrink-0" onClick={() => setActiveTab("menu")}>
          <img src={LOGO_URL} alt="ნინიკა ლოგო" className="h-10 w-10 md:h-11 md:w-11 rounded-full object-cover border border-[#C6A265]" />
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
          src={LOGO_URL} 
          alt="ნინიკა - საოჯახო სამზარეულო" 
          className="w-28 h-28 md:w-36 md:h-36 rounded-full object-cover shadow-2xl border-4 border-[#C6A265] mb-3 hover:scale-105 transition-transform" 
        />
        <p className="text-[#C6A265] text-base md:text-xl italic max-w-xl">მეტი, ვიდრე უბრალოდ კულინარია!</p>
      </header>

      <main className="p-4 md:p-6 max-w-5xl mx-auto">
        {activeTab === "menu" && (
          <section>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-[#C6A265]/20 pb-4">
              <h2 className="text-2xl md:text-3xl font-bold text-[#C6A265] flex items-center gap-2">
                <Utensils size={28} /> ჩვენი მენიუ
              </h2>

              {/* კატეგორიებით დახარისხება/ფილტრი */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                {["ყველა", "ხინკალი", "პელმენი / ვარენიკი", "კოტლეტი / ქაბაბი", "სამარხვო"].map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3.5 py-1.5 rounded-full text-xs md:text-sm font-semibold whitespace-nowrap transition border ${
                      selectedCategory === category
                        ? "bg-[#C6A265] text-black border-[#C6A265]"
                        : "bg-black/20 text-white/80 border-white/10 hover:border-[#C6A265]/50"
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
                {filteredProducts.map((product) => (
                  <div key={product.id} className={`${cardBgClass} rounded-2xl border overflow-hidden flex flex-col hover:scale-[1.01] transition-transform duration-200`}>
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
                            className="mb-4 flex items-center gap-2 text-xs font-bold text-[#C6A265] bg-[#C6A265]/10 hover:bg-[#C6A265]/20 px-3 py-2 rounded-xl border border-[#C6A265]/30 transition w-full justify-center"
                          >
                            <Play size={14} fill="currentColor" /> მომზადების წესი (ვიდეო)
                          </button>
                        )}
                      </div>
                      
                      <div className="mt-auto flex items-center justify-between bg-black/10 rounded-full p-1.5 border border-[#C6A265]/30">
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
          <section className={`${cardBgClass} p-6 md:p-10 rounded-3xl border border-[#C6A265]/30 space-y-6 max-w-3xl mx-auto shadow-2xl`}>
            <div className="w-full overflow-hidden rounded-2xl border border-[#C6A265]/30 shadow-lg mb-6">
              <img src={ABOUT_IMAGE_URL} alt="ნინიკა - ჩვენს შესახებ" className="w-full h-auto object-cover max-h-[450px]" />
            </div>

            <h2 className="text-3xl font-bold text-[#C6A265] border-b border-[#C6A265]/20 pb-3 flex items-center gap-2">
              <Heart size={28} /> მეტი, ვიდრე კულინარია
            </h2>

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
                  <a href="tel:595085695" className="font-bold text-[#C6A265] hover:underline">595 08 56 95</a>
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
                  <div className="bg-black/30 p-4 rounded-2xl border border-[#C6A265]/30 space-y-2 text-sm">
                    <p className="font-bold text-[#C6A265] flex items-center gap-2">
                      <CreditCard size={18} /> გადახდის რეკვიზიტები
                    </p>
                    <p className="text-xs opacity-80">{BANK_NAME}</p>
                    <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-xl border border-[#C6A265]/20">
                      <span className="font-mono text-xs font-bold tracking-wider">{BANK_ACCOUNT}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(BANK_ACCOUNT);
                          alert("ანგარიშის ნომერი დაკოპირდა!");
                        }}
                        className="text-xs text-[#C6A265] hover:underline font-bold"
                      >
                        კოპირება
                      </button>
                    </div>
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
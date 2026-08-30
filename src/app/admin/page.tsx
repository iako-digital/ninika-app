"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toEmbedUrl } from "@/lib/video";
import { Edit, Trash2, Eye, EyeOff, Bot } from "lucide-react";

const TABLE_SETUP_SQL: Record<string, string> = {
  products: `create table if not exists products (
  id bigint generated always as identity primary key,
  name text not null,
  price numeric not null,
  unit text not null default 'ცალი',
  state_type text default 'frozen',
  categories text[] default '{}',
  description text,
  image text,
  video_url text,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);
alter table products enable row level security;
create policy "public access" on products for all using (true) with check (true);`,
  ai_knowledge: `create table if not exists ai_knowledge (
  id bigint generated always as identity primary key,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);
alter table ai_knowledge enable row level security;
create policy "public access" on ai_knowledge for all using (true) with check (true);`,
};

function isMissingTableError(error: any) {
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    /schema cache|does not exist/i.test(error?.message || "")
  );
}

function reportSupabaseError(error: any, table: keyof typeof TABLE_SETUP_SQL, action: string) {
  if (isMissingTableError(error)) {
    console.error(
      `"${table}" ცხრილი არ არსებობს. გაუშვით ეს SQL Supabase-ის SQL Editor-ში და სცადეთ თავიდან:\n\n${TABLE_SETUP_SQL[table]}`
    );
    alert(
      `ცხრილი "${table}" ჯერ არ არსებობს თქვენს Supabase ბაზაში.\n\n` +
      `საჭირო SQL ბრძანება დაბეჭდილია ბრაუზერის კონსოლში (F12) — დააკოპირეთ და გაუშვით Supabase → SQL Editor-ში, შემდეგ სცადეთ თავიდან.`
    );
  } else {
    alert(`შეცდომა ${action}: ${error.message}`);
  }
}

const AVAILABLE_CATEGORIES = [
  "ხინკალი",
  "პელმენი",
  "ვარენიკი",
  "კოტლეტი",
  "ქაბაბი",
  "სამარხვო",
  "🌿 ცოცხალი (ახალი)",
  "❄️ გაყინული",
];

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("ცალი");
  const [stateType, setStateType] = useState("frozen");
  const [categories, setCategories] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  // Knowledge Base State
  const [knowledgeList, setKnowledgeList] = useState<any[]>([]);
  const [knowledgeTitle, setKnowledgeTitle] = useState("");
  const [knowledgeContent, setKnowledgeContent] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "ninika2026") {
      setIsAuthenticated(true);
      fetchProducts();
      fetchKnowledge();
    } else {
      alert("არასწორი პაროლი!");
    }
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase.from("products").select("*").order("id", { ascending: true });
    if (error) reportSupabaseError(error, "products", "მენიუს ჩატვირთვისას");
    else setProducts(data || []);
  };

  const fetchKnowledge = async () => {
    const { data, error } = await supabase.from("ai_knowledge").select("*").order("id", { ascending: true });
    if (error) reportSupabaseError(error, "ai_knowledge", "ცოდნის ბაზის ჩატვირთვისას");
    else setKnowledgeList(data || []);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts();
      fetchKnowledge();
    }
  }, [isAuthenticated]);

  const handleCategoryToggle = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_PRESET || "ninika_preset");

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dmcabui00"}/image/upload`,
        { method: "POST", body: formData }
      );
      const data = await res.json();
      setImageUrl(data.secure_url);
      alert("ფოტო წარმატებით აიტვირთა!");
    } catch (err) {
      console.error(err);
      alert("ფოტოს ატვირთვა ვერ მოხერხდა.");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) {
      alert("გთხოვთ შეავსოთ სახელი და ფასი!");
      return;
    }

    const productData = {
      name,
      price: parseFloat(price),
      unit,
      state_type: stateType,
      categories,
      description,
      image: imageUrl || "https://images.unsplash.com/photo-1556761223-4c4282c73f77?q=80&w=600",
      video_url: videoUrl ? toEmbedUrl(videoUrl) : null,
    };

    if (editingId) {
      const { error } = await supabase.from("products").update(productData).eq("id", editingId);
      if (error) reportSupabaseError(error, "products", "რედაქტირებისას");
      else alert("პროდუქტი წარმატებით განახლდა!");
    } else {
      const { error } = await supabase.from("products").insert([productData]);
      if (error) reportSupabaseError(error, "products", "დამატებისას");
      else alert("ახალი პროდუქტი წარმატებით დაემატა!");
    }

    resetForm();
    fetchProducts();
  };

  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!knowledgeTitle || !knowledgeContent) return;

    const { error } = await supabase.from("ai_knowledge").insert([{ title: knowledgeTitle, content: knowledgeContent }]);
    if (error) reportSupabaseError(error, "ai_knowledge", "დამატებისას");
    else {
      alert("ცოდნა წარმატებით დაემატა!");
      setKnowledgeTitle("");
      setKnowledgeContent("");
      fetchKnowledge();
    }
  };

  const handleDeleteKnowledge = async (id: number) => {
    if (confirm("ნამდვილად გსურთ ამ დოკუმენტის წაშლა?")) {
      const { error } = await supabase.from("ai_knowledge").delete().eq("id", id);
      if (error) reportSupabaseError(error, "ai_knowledge", "წაშლისას");
      else fetchKnowledge();
    }
  };

  const handleEdit = (product: any) => {
    setEditingId(product.id);
    setName(product.name);
    setPrice(product.price.toString());
    setUnit(product.unit);
    setStateType(product.state_type || "frozen");
    setCategories(Array.isArray(product.categories) ? product.categories : []);
    setDescription(product.description || "");
    setImageUrl(product.image || "");
    setVideoUrl(product.video_url || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (confirm("ნამდვილად გსურთ ამ პროდუქტის წაშლა?")) {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) reportSupabaseError(error, "products", "წაშლისას");
      else fetchProducts();
    }
  };

  const handleToggleAvailability = async (product: any) => {
    const newValue = !(product.is_available ?? true);
    const { error } = await supabase.from("products").update({ is_available: newValue }).eq("id", product.id);
    if (error) reportSupabaseError(error, "products", "სტატუსის განახლებისას");
    else setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, is_available: newValue } : p)));
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setPrice("");
    setUnit("ცალი");
    setStateType("frozen");
    setCategories([]);
    setDescription("");
    setImageUrl("");
    setVideoUrl("");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#121619] text-white flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="bg-[#1e242b] p-8 rounded-3xl border border-[#d4af37]/30 w-full max-w-sm space-y-4">
          <h2 className="text-2xl font-bold text-[#d4af37] text-center">ადმინ პანელი</h2>
          
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="შეიყვანეთ პაროლი" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 pr-10 rounded-xl bg-black/20 border border-[#d4af37]/30 text-white focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#d4af37] hover:text-white transition"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button type="submit" className="w-full bg-[#d4af37] text-[#121619] font-bold py-3 rounded-xl hover:bg-[#c59b27]">
            შესვლა
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121619] text-[#e2e8f0] p-6 max-w-4xl mx-auto space-y-12">
      <div className="flex justify-between items-center border-b border-[#d4af37]/20 pb-4">
        <h1 className="text-3xl font-bold text-[#d4af37]">ადმინ პანელი</h1>
        {editingId && (
          <button onClick={resetForm} className="text-sm bg-[#1e242b] px-4 py-2 rounded-full hover:bg-white/10">
            + ახლის დამატებაზე გადასვლა
          </button>
        )}
      </div>

      <form onSubmit={handleSaveProduct} className="bg-[#1e242b] p-8 rounded-3xl border border-[#d4af37]/30 space-y-5">
        <h2 className="text-xl font-bold text-[#d4af37]">
          {editingId ? "✏️ პროდუქტის რედაქტირება" : "➕ ახალი პროდუქტის დამატება"}
        </h2>

        <div>
          <label className="block text-sm font-semibold mb-1">პროდუქტის დასახელება</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 rounded-xl bg-black/20 border border-[#d4af37]/30 text-white" placeholder="მაგ: ხინკალი" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">ფასი (₾)</label>
            <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-3 rounded-xl bg-black/20 border border-[#d4af37]/30 text-white" placeholder="1.20" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">ერთეული</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full p-3 rounded-xl bg-black/20 border border-[#d4af37]/30 text-white">
              <option value="ცალი">ცალი</option>
              <option value="კგ">კგ</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">პროდუქტის ტიპი</label>
          <select value={stateType} onChange={(e) => setStateType(e.target.value)} className="w-full p-3 rounded-xl bg-black/20 border border-[#d4af37]/30 text-white">
            <option value="frozen">❄️ გაყინული</option>
            <option value="fresh">🌿 ცოცხალი / გაუყინავი</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">კატეგორიები (შეგიძლიათ აირჩიოთ რამდენიმე):</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {AVAILABLE_CATEGORIES.map((cat) => {
              const isSelected = categories.includes(cat);
              return (
                <button
                  type="button"
                  key={cat}
                  onClick={() => handleCategoryToggle(cat)}
                  className={`p-2.5 rounded-xl text-xs font-bold border text-center transition ${
                    isSelected
                      ? "bg-[#d4af37] text-[#121619] border-[#d4af37]"
                      : "bg-black/20 text-white/70 border-white/10 hover:border-[#d4af37]/40"
                  }`}
                >
                  {isSelected ? "✓ " : ""}{cat}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">აღწერა</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 rounded-xl bg-black/20 border border-[#d4af37]/30 text-white h-24" placeholder="მოკლე აღწერა..." />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">ფოტოს ატვირთვა (Cloudinary)</label>
          <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full p-2 bg-black/20 rounded-xl border border-[#d4af37]/30 text-sm" />
          {uploading && <p className="text-xs text-[#d4af37] mt-1">ფოტო იტვირთება Cloudinary-ში...</p>}
          {imageUrl && (
            <div className="mt-3">
              <img src={imageUrl} alt="Uploaded" className="h-32 rounded-xl object-cover border border-[#d4af37]/30" />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">მომზადების ვიდეო (არასავალდებულო)</label>
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="w-full p-3 rounded-xl bg-black/20 border border-[#d4af37]/30 text-white"
            placeholder="YouTube ბმული, მაგ: https://www.youtube.com/watch?v=..."
          />
        </div>

        <button type="submit" className="w-full bg-[#d4af37] text-[#121619] font-extrabold py-4 rounded-xl hover:bg-[#c59b27] transition text-lg">
          {editingId ? "ცვლილებების შენახვა" : "პროდუქტის დამატება"}
        </button>
      </form>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-[#d4af37]">არსებული მენიუ ({products.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map((p) => {
            const isAvailable = p.is_available !== false;
            return (
              <div key={p.id} className="bg-[#1e242b] p-4 rounded-2xl border border-[#d4af37]/20 flex items-center justify-between gap-4">
                <img src={p.image} alt={p.name} className="w-16 h-16 rounded-xl object-cover" />
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{p.name}</h3>
                  <p className="text-[#d4af37] text-sm">{p.price.toFixed(2)} ₾ / {p.unit}</p>
                  {Array.isArray(p.categories) && p.categories.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">🏷️ {p.categories.join(", ")}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggleAvailability(p)}
                    className="mt-2 flex items-center gap-2"
                    title={isAvailable ? "მარაგშია — დააჭირეთ სტოპისთვის" : "სტოპი — დააჭირეთ მარაგში დასაბრუნებლად"}
                  >
                    <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${isAvailable ? "bg-green-500/70" : "bg-red-500/60"}`}>
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${isAvailable ? "translate-x-4.5" : "translate-x-1"}`} />
                    </span>
                    <span className={`text-xs font-bold ${isAvailable ? "text-green-400" : "text-red-400"}`}>
                      {isAvailable ? "მარაგშია" : "სტოპი"}
                    </span>
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(p)} className="p-2 bg-[#d4af37]/20 hover:bg-[#d4af37]/40 text-[#d4af37] rounded-lg">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* AI Knowledge Base Management */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-[#d4af37] flex items-center gap-2">
          <Bot /> 🧠 AI ასისტენტ ნინიკას ცოდნის ბაზა / დოკუმენტები
        </h2>
        
        <form onSubmit={handleAddKnowledge} className="bg-[#1e242b] p-6 rounded-2xl border border-[#d4af37]/30 space-y-4">
          <input type="text" value={knowledgeTitle} onChange={(e) => setKnowledgeTitle(e.target.value)} placeholder="დოკუმენტის სათაური (მაგ: მიწოდების პირობები)" className="w-full p-3 rounded-xl bg-black/20 border border-[#d4af37]/30 text-white" />
          <textarea value={knowledgeContent} onChange={(e) => setKnowledgeContent(e.target.value)} placeholder="ჩასვით ვრცელი ინსტრუქცია ან წესები..." className="w-full p-3 rounded-xl bg-black/20 border border-[#d4af37]/30 text-white h-32" />
          <button type="submit" className="w-full bg-[#d4af37] text-[#121619] font-bold py-3 rounded-xl hover:bg-[#c59b27]">➕ ცოდნის ბაზაში დამატება</button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {knowledgeList.map((doc) => (
            <div key={doc.id} className="bg-[#1e242b] p-5 rounded-2xl border border-[#d4af37]/20 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg text-[#d4af37] mb-2">{doc.title}</h3>
                <p className="text-sm text-[#e2e8f0]/70 line-clamp-3">{doc.content}</p>
              </div>
              <button onClick={() => handleDeleteKnowledge(doc.id)} className="mt-4 flex items-center gap-2 text-red-400 hover:text-red-300 transition">
                <Trash2 size={16} /> 🗑️ წაშლა
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
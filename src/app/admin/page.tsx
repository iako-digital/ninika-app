"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Edit, Trash2 } from "lucide-react";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("ცალი");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "ninika2026") {
      setIsAuthenticated(true);
      fetchProducts();
    } else {
      alert("არასწორი პაროლი!");
    }
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase.from("products").select("*").order("id", { ascending: true });
    if (error) console.error(error);
    else setProducts(data || []);
  };

  useEffect(() => {
    if (isAuthenticated) fetchProducts();
  }, [isAuthenticated]);

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
      description,
      image: imageUrl || "https://images.unsplash.com/photo-1556761223-4c4282c73f77?q=80&w=600",
    };

    if (editingId) {
      const { error } = await supabase.from("products").update(productData).eq("id", editingId);
      if (error) alert("შეცდომა რედაქტირებისას: " + error.message);
      else alert("პროდუქტი წარმატებით განახლდა!");
    } else {
      const { error } = await supabase.from("products").insert([productData]);
      if (error) alert("შეცდომა დამატებისას: " + error.message);
      else alert("ახალი პროდუქტი წარმატებით დაემატა!");
    }

    resetForm();
    fetchProducts();
  };

  const handleEdit = (product: any) => {
    setEditingId(product.id);
    setName(product.name);
    setPrice(product.price.toString());
    setUnit(product.unit);
    setDescription(product.description || "");
    setImageUrl(product.image || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (confirm("ნამდვილად გსურთ ამ პროდუქტის წაშლა?")) {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) alert("შეცდომა წაშლისას.");
      else fetchProducts();
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setPrice("");
    setUnit("ცალი");
    setDescription("");
    setImageUrl("");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#1b2e23] text-white flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="bg-[#253e2f] p-8 rounded-3xl border border-gold/30 w-full max-w-sm space-y-4">
          <h2 className="text-2xl font-bold text-[#C6A265] text-center">ადმინ პანელი</h2>
          <input 
            type="password" 
            placeholder="შეიყვანეთ პაროლი" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-xl bg-black/20 border border-gold/30 text-white focus:outline-none"
          />
          <button type="submit" className="w-full bg-[#C6A265] text-black font-bold py-3 rounded-xl hover:bg-gold">
            შესვლა
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1b2e23] text-white p-6 max-w-4xl mx-auto space-y-12">
      <div className="flex justify-between items-center border-b border-gold/20 pb-4">
        <h1 className="text-3xl font-bold text-[#C6A265]">ადმინ პანელი</h1>
        {editingId && (
          <button onClick={resetForm} className="text-sm bg-white/10 px-4 py-2 rounded-full hover:bg-white/20">
            + ახლის დამატებაზე გადასვლა
          </button>
        )}
      </div>

      <form onSubmit={handleSaveProduct} className="bg-[#253e2f] p-8 rounded-3xl border border-gold/30 space-y-5">
        <h2 className="text-xl font-bold text-[#C6A265]">
          {editingId ? "✏️ პროდუქტის რედაქტირება" : "➕ ახალი პროდუქტის დამატება"}
        </h2>

        <div>
          <label className="block text-sm font-semibold mb-1">პროდუქტის დასახელება</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 rounded-xl bg-black/20 border border-gold/30 text-white" placeholder="მაგ: ხინკალი" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">ფასი (₾)</label>
            <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-3 rounded-xl bg-black/20 border border-gold/30 text-white" placeholder="1.20" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">ერთეული</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full p-3 rounded-xl bg-black/20 border border-gold/30 text-white">
              <option value="ცალი">ცალი</option>
              <option value="კგ">კგ</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">აღწერა</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 rounded-xl bg-black/20 border border-gold/30 text-white h-24" placeholder="მოკლე აღწერა..." />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">ფოტოს ატვირთვა (Cloudinary)</label>
          <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full p-2 bg-black/20 rounded-xl border border-gold/30 text-sm" />
          {uploading && <p className="text-xs text-gold mt-1">ფოტო იტვირთება Cloudinary-ში...</p>}
          {imageUrl && (
            <div className="mt-3">
              <img src={imageUrl} alt="Uploaded" className="h-32 rounded-xl object-cover border border-gold/30" />
            </div>
          )}
        </div>

        <button type="submit" className="w-full bg-[#C6A265] text-black font-extrabold py-4 rounded-xl hover:bg-gold transition text-lg">
          {editingId ? "ცვლილებების შენახვა" : "პროდუქტის დამატება"}
        </button>
      </form>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-[#C6A265]">არსებული მენიუ ({products.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map((p) => (
            <div key={p.id} className="bg-[#253e2f] p-4 rounded-2xl border border-gold/20 flex items-center justify-between gap-4">
              <img src={p.image} alt={p.name} className="w-16 h-16 rounded-xl object-cover" />
              <div className="flex-1">
                <h3 className="font-bold text-lg">{p.name}</h3>
                <p className="text-[#C6A265] text-sm">{p.price.toFixed(2)} ₾ / {p.unit}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(p)} className="p-2 bg-gold/20 hover:bg-gold/40 text-[#C6A265] rounded-lg">
                  <Edit size={18} />
                </button>
                <button onClick={() => handleDelete(p.id)} className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
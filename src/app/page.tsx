"use client";

import { useState } from "react";

export default function Home() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [delivery, setDelivery] = useState("ადგილიდან გატანა (ოზურგეთი, ს. მგელაძის 3)");
  const [payment, setPayment] = useState("ადგილზე გადახდა (ნაღდი / ბარათი)");
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [receiptName, setReceiptName] = useState<string | null>(null);

  // ამოწმებს, არჩეულია თუ არა ანგარიშზე გადარიცხვა
  const isBankTransfer = payment.includes("ანგარიშის");

  // შეკვეთის გაგზავნის დაბლოკვის ლოგიკა:
  // 1. სახელი ცარიელია OR
  // 2. ტელეფონი ცარიელია OR
  // 3. არჩეულია ანგარიშზე გადარიცხვა და ქვითარი ჯერ არ არის ატვირთული
  const isSubmitDisabled = !name.trim() || !phone.trim() || (isBankTransfer && !receiptBase64);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1A1A1A] p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-[#2A4533] text-white p-6 rounded-2xl shadow-2xl space-y-4">
        <h2 className="text-xl font-bold text-center text-[#C6A265]">
          შეკვეთის გაფორმება
        </h2>

        {/* სახელი და გვარი */}
        <div>
          <label className="block text-sm font-medium mb-1">სახელი და გვარი</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="მაგ: იაკო თოPoint"
            className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C6A265]"
          />
        </div>

        {/* ტელეფონის ნომერი + გაფრთხილება */}
        <div>
          <label className="block text-sm font-medium mb-1">ტელეფონის ნომერი</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="5XX XX XX XX"
            className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C6A265]"
          />
          <p className="text-xs text-amber-300 mt-1">
            ⚠️ გთხოვთ, ყურადღებით შეამოწმოთ ნომერი — შეკვეთის დასადასტურებლად დაგიკავშირდებით.
          </p>
        </div>

        {/* მიღების მეთოდი */}
        <div>
          <label className="block text-sm font-medium mb-1">მიღების მეთოდი</label>
          <select
            value={delivery}
            onChange={(e) => setDelivery(e.target.value)}
            className="w-full p-3 rounded-lg bg-[#1E3225] border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#C6A265]"
          >
            <option value="ადგილიდან გატანა (ოზურგეთი, ს. მგელაძის 3)">
              ადგილიდან გატანა (ოზურგეთი, ს. მგელაძის 3)
            </option>
            <option value="კურიერის მომსახურება (ოზურგეთი)">
              კურიერის მომსახურება (ოზურგეთი)
            </option>
          </select>
        </div>

        {/* გადახდის მეთოდი */}
        <div>
          <label className="block text-sm font-medium mb-1">გადახდის მეთოდი</label>
          <select
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
            className="w-full p-3 rounded-lg bg-[#1E3225] border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#C6A265]"
          >
            <option value="ადგილზე გადახდა (ნაღდი / ბარათი)">
              💵 ადგილზე გადახდა (ნაღდი / ბარათი)
            </option>
            <option value="ანგარიშის ნომერზე გადარიცხვა">
              🏦 ანგარიშის ნომერზე გადარიცხვა
            </option>
          </select>
        </div>

        {/* ქვითრის ატვირთვის სექცია — ჩნდება მხოლოდ ანგარიშის ნომერზე გადარიცხვისას */}
        {isBankTransfer && (
          <div className="p-4 rounded-xl bg-white/5 border border-[#C6A265]/40 space-y-2">
            <p className="text-sm font-semibold text-[#C6A265]">
              📌 აუცილებელია გადახდის ქვითრის ატვირთვა:
            </p>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#C6A265] file:text-white hover:file:bg-[#b08e54] cursor-pointer"
            />
            {receiptName && (
              <p className="text-xs text-green-400">
                ✅ ატვირთულია: {receiptName}
              </p>
            )}
            {!receiptBase64 && (
              <p className="text-xs text-red-400 font-medium">
                * ქვითრის გარეშე შეკვეთა ვერ გაიგზავნება.
              </p>
            )}
          </div>
        )}

        {/* შეკვეთის დადასტურების ღილაკი */}
        <button
          type="button"
          disabled={isSubmitDisabled}
          className={`w-full py-3 rounded-xl font-bold transition-all shadow-lg ${
            isSubmitDisabled
              ? "bg-gray-500/50 text-gray-300 cursor-not-allowed opacity-60"
              : "bg-[#C6A265] hover:bg-[#b08e54] text-white cursor-pointer hover:scale-[1.02]"
          }`}
        >
          {isBankTransfer && !receiptBase64
            ? "ატვირთეთ ქვითარი გაგზავნისთვის"
            : "შეკვეთის დადასტურება (გაგზავნა)"}
        </button>
      </div>
    </div>
  );
}
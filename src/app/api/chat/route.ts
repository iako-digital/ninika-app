import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ reply: "API Key არ არის მითითებული Vercel-ში." }, { status: 500 });
    }

    // 1. პროდუქტების წამოღება Supabase ბაზიდან
    const { data: products } = await supabase
      .from("products")
      .select("name, price, unit, description, state_type");

    // 2. ცოდნის ბაზის წამოღება Supabase-იდან
    const { data: knowledge } = await supabase
      .from("ai_knowledge")
      .select("title, content");

    const productsContext = products?.length 
      ? products.map(p => `- ${p.name}: ${p.price} ₾ (${p.unit}), ტიპი: ${p.state_type === 'fresh' ? 'ცოცხალი/გაუყინავი' : 'გაყინული'}`).join("\n")
      : "ხინკალი (შერეული ხორცით): 1.40 ₾, პელმენი: 28.00 ₾ / კგ, პელმენი (საქონლის ხორცით): 12.00 ₾ / კგ";

    const knowledgeContext = knowledge?.length
      ? knowledge.map(k => `--- ${k.title} ---\n${k.content}`).join("\n\n")
      : "";

    const systemPrompt = `შენ ხარ "იაკო" — საოჯახო სამზარეულო "ნინიკას" (ninika.ge) AI ასისტენტი.

ოფიციალური საკონტაქტო ინფო:
- ტელეფონი: +995 551 50 06 06
- ელ-ფოსტა: ninika.kitchen@gmail.com
- მისამართი: ოზურგეთი, ს. მგელაძის 3

აქტუალური პროდუქტები და ზუსტი ფასები:
${productsContext}

${knowledgeContext}

მნიშვნელოვანი წესები:
1. უპასუხე მხოლოდ ქართულად!
2. არასოდეს გამოიყენო მისალმება პასუხის დასაწყისში! მომხმარებელი უკვე მოგესალმა.
3. თუ კითხვა ეხება ფასს (მაგ: "რა ღირს ხინკალი?" ან "რა ღირს კოტლეტი?"), ეგრევე უპასუხე ზუსტი ფასი ზემოთ მოყვანილი სიიდან!
4. იყავი მოკლე, კონკრეტული და მეგობრული.`;

    // ისტორიის ფორმატირება
    const formattedHistory = Array.isArray(history)
      ? history
          .filter((msg: any) => msg && msg.text)
          .map((msg: any) => ({
            role: msg.sender === "user" || msg.role === "user" ? "user" : "model",
            parts: [{ text: String(msg.text) }]
          }))
      : [];

    const contents = [
      ...formattedHistory,
      {
        role: "user",
        parts: [{ text: String(message) }]
      }
    ];

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini Error:", data);
      return NextResponse.json({ reply: `API შეცდომა: ${data.error?.message || "უცნობი ხარვეზი"}` });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "ბოდიში, პასუხის გენერირება ვერ მოხერხდა.";

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Chat Server Error:", error);
    return NextResponse.json({ reply: "სერვერული ხარვეზია." }, { status: 500 });
  }
}
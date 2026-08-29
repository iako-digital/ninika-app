import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ reply: "API Key არ არის მითითებული Vercel-ში." }, { status: 500 });
    }

    // 1. პროდუქტების წამოღება ბაზიდან
    const { data: products } = await supabase.from("products").select("name, price, unit, description, state_type");
    
    // 2. ცოდნის ბაზის წამოღება
    const { data: knowledge } = await supabase.from("ai_knowledge").select("title, content");

    const productsContext = products?.map(p => 
      `- ${p.name}: ${p.price} ₾ (${p.unit}), ტიპი: ${p.state_type === 'fresh' ? 'ცოცხალი/გაუყინავი' : 'გაყინული'}. აღწერა: ${p.description || 'არ აქვს'}`
    ).join("\n") || "პროდუქტები არ არის";

    const knowledgeContext = knowledge?.map(k => 
      `--- ${k.title} ---\n${k.content}`
    ).join("\n\n") || "დამატებითი დოკუმენტები არ არის";

    const systemPrompt = `შენ ხარ "იაკო" — საოჯახო სამზარეულო "ნინიკას" (ninika.ge) ენერგიული, თბილი და დამხმარე AI ასისტენტი.

პროდუქტების აქტუალური სია:
${productsContext}

დამატებითი ცოდნის ბაზა და დოკუმენტები:
${knowledgeContext}

მნიშვნელოვანი ინსტრუქციები:
1. უპასუხე მხოლოდ ქართულად, მეგობრული და ბუნებრივი ტონით.
2. გამოიყენე ზუსტი ინფო და ფასები ზემოთ მოყვანილი სიიდან.
3. არ დაიწყო პასუხი ხელახალი მისალმებით (მაგ: "გამარჯობა! მე ვარ იაკო..."), თუ მომხმარებელს უკვე მიესალმე! უპასუხე პირდაპირ დასმულ კითხვას.
4. იყავი მოკლე, კონკრეტული და დამხმარე.`;

    // ისტორიის ფორმატირება Gemini-სთვის
    const formattedHistory = Array.isArray(history) 
      ? history.map((msg: any) => ({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text }]
        }))
      : [];

    const contents = [
      {
        role: "user",
        parts: [{ text: `[SYSTEM INSTRUCTION]:\n${systemPrompt}` }]
      },
      ...formattedHistory,
      {
        role: "user",
        parts: [{ text: message }]
      }
    ];

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error details:", data);
      return NextResponse.json({ reply: `API შეცდომა: ${data.error?.message || "უცნობი ხარვეზი"}` });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "ბოდიში, პასუხის გენერირება ვერ მოხერხდა.";

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ reply: "სერვერული ხარვეზია. გთხოვთ სცადოთ მოგვიანებით." }, { status: 500 });
  }
}
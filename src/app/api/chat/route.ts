import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    // 1. პროდუქტების წამოღება (ავტომატური განახლებისთვის)
    const { data: products } = await supabase.from("products").select("name, price, unit, description, state_type");
    
    // 2. ცოდნის ბაზის წამოღება (ადმინიდან ატვირთული დოკუმენტები)
    const { data: knowledge } = await supabase.from("ai_knowledge").select("title, content");

    const productsContext = products?.map(p => 
      `- ${p.name}: ${p.price} ₾ (${p.unit}), ტიპი: ${p.state_type === 'fresh' ? 'ცოცხალი/გაუყინავი' : 'გაყინული'}. აღწერა: ${p.description || 'არ აქვს'}`
    ).join("\n") || "პროდუქტები არ არის";

    const knowledgeContext = knowledge?.map(k => 
      `--- ${k.title} ---\n${k.content}`
    ).join("\n\n") || "დამატებითი დოკუმენტები არ არის";

    const systemPrompt = `შენ ხარ "იაკო" — საოჯახო სამზარეულო "ნინიკას" (ninika.ge) ენერგიული, თბილი, ზრდილობიანი და დამხმარე AI ასისტენტი.
შენი მიზანია უპასუხო მომხმარებლის კითხვებს "ნინიკას" პროდუქციაზე, ფასებზე, მიწოდებასა და კომპანიის შესახებ.

პროდუქტების აქტუალური სია:
${productsContext}

დამატებითი ცოდნის ბაზა და დოკუმენტები:
${knowledgeContext}

ინსტრუქცია:
1. უპასუხე მხოლოდ ქართულ ენაზე, მეგობრული ტონით.
2. გამოიყენე ზუსტი ფასები და ინფორმაცია ზემოთ მოყვანილი სიიდან.
3. თუ კითხვა ეხება პროდუქტს, რომელიც სიაში არ არის, თქვი რომ ამჟამად არ გაქვთ, მაგრამ შეგიძლიათ მიაწოდოთ ინფორმაცია არსებულზე.
4. იყავი მოკლე, სუფთა და კონკრეტული.`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\nმომხმარებლის კითხვა: ${message}` }] }
        ]
      })
    });

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "ბოდიში, პასუხის გენერირება ვერ მოხერხდა.";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
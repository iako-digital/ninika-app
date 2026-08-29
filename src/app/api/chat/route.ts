import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ reply: "API Key არ არის მითითებული (.env.local-ში ან Vercel-ში)." }, { status: 500 });
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

ინსტრუქცია:
1. უპასუხე მხოლოს ქართულად, მეგობრული ტონით.
2. გამოიყენე ზუსტი ინფო და ფასები ზემოთ მოყვანილი სიიდან.
3. იყავი მოკლე და კონკრეტული.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(`${systemPrompt}\n\nმომხმარებლის კითხვა: ${message}`);
    const response = await result.response;
    const reply = response.text();

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ reply: "ბოდიში, ხარვეზია კავშირში. სცადეთ მოგვიანებით." }, { status: 500 });
  }
}
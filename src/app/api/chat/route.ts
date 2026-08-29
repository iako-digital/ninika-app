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
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("name, price, unit, description, state_type");
    if (productsError) console.error("Chat: failed to fetch products:", productsError);

    // 2. ცოდნის ბაზის წამოღება Supabase-იდან
    const { data: knowledge, error: knowledgeError } = await supabase
      .from("ai_knowledge")
      .select("title, content");
    if (knowledgeError) console.error("Chat: failed to fetch ai_knowledge:", knowledgeError);

    const productsContext = products?.length 
      ? products.map(p => `- ${p.name}: ${p.price} ₾ (${p.unit}), ტიპი: ${p.state_type === 'fresh' ? 'ცოცხალი/გაუყინავი' : 'გაყინული'}`).join("\n")
      : "ხინკალი (შერეული ხორცით): 1.40 ₾ / ცალი\nპელმენი: 28.00 ₾ / კგ\nპელმენი (საქონლის ხორცით): 12.00 ₾ / კგ";

    const knowledgeContext = knowledge?.length
      ? knowledge.map(k => `--- ${k.title} ---\n${k.content}`).join("\n\n")
      : "";

    const systemPromptText = `შენ ხარ "იაკო" — საოჯახო სამზარეულო "ნინიკას" (ninika.ge) AI ასისტენტი.

ოფიციალური საკონტაქტო ინფო:
- ტელეფონი: 551 50 06 06 (+995 551 50 06 06)
- ელ-ფოსტა: ninika.kitchen@gmail.com
- მისამართი: ოზურგეთი, ს. მგელაძის 3

ჩვენი აქტუალური პროდუქტები და ფასები:
${productsContext}

დამატებითი ცოდნის ბაზა:
${knowledgeContext}

უპირველესი და მკაცრი წესები:
1. უპასუხე მხოლოდ ქართულად!
2. არასოდეს გამოიყენო ზოგადი მისალმებები ("გამარჯობა!", "რით შემიძლია დაგეხმაროთ?", "შეგიძლიათ იკითხოთ...")! მომხმარებელს უკვე მიესალმე. უპასუხე პირდაპირ დასმულ კითხვას.
3. თუ კითხვა ეხება პროდუქტის ფასს (მაგ: "რა ღირს ხინკალი?" ან "რა ღირს კოტლეტი?"), ეგრევე დაუწერე ზუსტი ფასი პროდუქტების სიიდან!
4. თუ მომხმარებელი იკითხავს ისეთ პროდუქტზე, კერძზე ან ინფორმაციაზე, რომელიც ზემოთ მოყვანილ სიაში ან ცოდნის ბაზაში არ არის: პირდაპირ უთხარი, რომ სამწუხაროდ ამ პროდუქტზე/საკითხზე ინფორმაცია არ გაქვს, და შესთავაზე დარეკონ ნომერზე 551 50 06 06 ან ისარგებლონ ვებგვერდზე არსებული Messenger-ის ღილაკით.
5. თუ მომხმარებელი იკითხავს, როგორ გააკეთოს შეკვეთა: აუხსენი მოკლედ ნაბიჯებით — 1) ვებგვერდზე ninika.ge აირჩიოს სასურველი პროდუქტი და "+" ღილაკით დაამატოს კალათაში, 2) დააჭიროს ეკრანის ბოლოში გამოჩენილ "კალათის ნახვა" ღილაკს, 3) შეავსოს სახელი და ტელეფონის ნომერი და დაადასტუროს შეკვეთა. ალტერნატივის სახით შესთავაზე დარეკვა ნომერზე 551 50 06 06.
6. იყავი მოკლე, კონკრეტული და თბილი.`;

    // ისტორიის სწორი ფორმატირება
    const formattedHistory = Array.isArray(history)
      ? history
          .filter((msg: any) => msg && (msg.text || msg.content))
          .map((msg: any) => ({
            role: msg.sender === "user" || msg.role === "user" ? "user" : "model",
            parts: [{ text: String(msg.text || msg.content) }]
          }))
      : [];

    const contents = [
      ...formattedHistory,
      {
        role: "user",
        parts: [{ text: String(message) }]
      }
    ];

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPromptText }]
        },
        contents
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`Gemini API Error (status ${response.status}):`, JSON.stringify(data, null, 2));
      return NextResponse.json({ reply: `API შეცდომა: ${data.error?.message || "უცნობი ხარვეზი"}` });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "ბოდიში, პასუხის გენერირება ვერ მოხერხდა.";

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Chat Server Error:", error);
    return NextResponse.json({ reply: "სერვერული ხარვეზია. გთხოვთ სცადოთ მოგვიანებით." }, { status: 500 });
  }
}
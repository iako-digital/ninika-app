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
      .select("name, price, unit, description, state_type, is_available");
    if (productsError) console.error("Chat: failed to fetch products:", productsError);

    // 2. ცოდნის ბაზის წამოღება Supabase-იდან
    const { data: knowledge, error: knowledgeError } = await supabase
      .from("ai_knowledge")
      .select("title, content");
    if (knowledgeError) console.error("Chat: failed to fetch ai_knowledge:", knowledgeError);

    const productsContext = products?.length
      ? products.map(p => `- ${p.name}: ${p.price} ₾ (${p.unit}), ტიპი: ${p.state_type === 'fresh' ? 'ცოცხალი/გაუყინავი' : 'გაყინული'}${p.is_available === false ? ', სტატუსი: დროებით ამოწურულია' : ''}`).join("\n")
      : "ხინკალი (შერეული ხორცით): 1.40 ₾ / ცალი\nპელმენი: 28.00 ₾ / კგ\nპელმენი (საქონლის ხორცით): 12.00 ₾ / კგ";

    const knowledgeContext = knowledge?.length
      ? knowledge.map(k => `--- ${k.title} ---\n${k.content}`).join("\n\n")
      : "";

    const FALLBACK_MESSAGE = "სამწუხაროდ, ამ საკითხზე ზუსტი ინფორმაცია არ მაქვს. შეგიძლიათ დაუკავშირდეთ ჩვენს მხარდაჭერის გუნდს ნომერზე 511 50 06 06, მოგვწეროთ ელ.ფოსტაზე info@ninika.ge, ან ისარგებლოთ საიტზე არსებული მესენჯერის ღილაკით.";

    const systemPromptText = `შენ ხარ "ნინიკა" — საოჯახო სამზარეულო "ნინიკას" (ninika.ge) მკაცრად შეზღუდული AI ასისტენტი.

ოფიციალური საკონტაქტო ინფო:
- ტელეფონი: 511 50 06 06 (+995 511 50 06 06)
- ელ-ფოსტა: info@ninika.ge
- მისამართი: ოზურგეთი, ს. მგელაძის 3

ჩვენი აქტუალური პროდუქტები და ფასები (ერთადერთი წყარო პროდუქტების შესახებ):
${productsContext}

დამატებითი ცოდნის ბაზა (ერთადერთი წყარო სხვა ინფორმაციისთვის — მიწოდება, გადახდა, წესები და ა.შ.):
${knowledgeContext}

უპირველესი და მკაცრი წესები:
1. უპასუხე მხოლოდ ქართულად!
2. მკაცრი შეზღუდვა: გიპასუხია მხოლოდ და მხოლოდ ზემოთ მოცემული პროდუქტების სიისა და ცოდნის ბაზის საფუძველზე. აკრძალულია საკუთარი ცოდნის, ვარაუდის ან ინტერნეტიდან/ტრენინგიდან მიღებული ინფორმაციის გამოყენება. არასოდეს უპასუხო ზოგად/off-topic კითხვებს (მაგ: ამინდი, ვიქტორინები, პოლიტიკა, სხვა კომპანიები, ზოგადი კულინარიული რჩევები რომლებიც ცოდნის ბაზაში არ არის) — ეს ყველაფერი მკაცრად აკრძალულია.
3. თუ კითხვაზე პასუხი ზემოთ მოცემულ კონტექსტში (პროდუქტები + ცოდნის ბაზა) ზუსტად არ მოიძებნება, ან კითხვა თემასთან შეუსაბამოა (off-topic), აუცილებლად უპასუხე ზუსტად ამ ტექსტით და არაფერი დაამატო თავიდან შენ მხრიდან: "${FALLBACK_MESSAGE}"
4. არასოდეს გამოიყენო ზოგადი მისალმებები ("გამარჯობა!", "რით შემიძლია დაგეხმაროთ?", "შეგიძლიათ იკითხოთ...")! მომხმარებელს უკვე მიესალმე. უპასუხე პირდაპირ დასმულ კითხვას.
5. თუ კითხვა ეხება პროდუქტის ფასს ან მარაგში ყოფნას (მაგ: "რა ღირს ხინკალი?" ან "არის მარაგში კოტლეტი?"), ეგრევე დაუწერე ზუსტი ფასი/სტატუსი პროდუქტების სიიდან, ყოველგვარი დამატებითი შესავლის გარეშე!
6. თუ მომხმარებელი კითხულობს პროდუქტზე, რომელსაც სიაში მითითებული აქვს "სტატუსი: დროებით ამოწურულია": თბილად აუხსენი, რომ "ეს პროდუქტი დღეისთვის ამოიწურა და ახალი პარტია მზადდება", და შესთავაზე დარეკვა ნომერზე 511 50 06 06 განახლებული ინფორმაციისთვის.
7. თუ მომხმარებელი იკითხავს, როგორ გააკეთოს შეკვეთა: აუხსენი მოკლედ ნაბიჯებით — 1) ვებგვერდზე ninika.ge აირჩიოს სასურველი პროდუქტი და "+" ღილაკით დაამატოს კალათაში, 2) დააჭიროს ეკრანის ბოლოში გამოჩენილ "კალათის ნახვა" ღილაკს, 3) შეავსოს სახელი და ტელეფონის ნომერი და დაადასტუროს შეკვეთა. ალტერნატივის სახით შესთავაზე დარეკვა ნომერზე 511 50 06 06.
8. იყავი მოკლე, კონკრეტული და თბილი.`;

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

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
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
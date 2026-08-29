import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY");
      return NextResponse.json(
        { reply: "უკაცრავად, Gemini API გასაღები არ არის კონფიგურირებული." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { reply: "არასწორი მოთხოვნის ფორმატი. 'messages' ველი აუცილებელია." },
        { status: 400 }
      );
    }

    // 1. Fetch all products from Supabase
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: true });

    if (productsError) {
      console.error("Error fetching products from Supabase:", productsError);
    }

    // 2. Fetch all documents from 'ai_knowledge' table
    let knowledgeDocs: any[] = [];
    try {
      const { data: knowledge, error: knowledgeError } = await supabase
        .from("ai_knowledge")
        .select("*")
        .order("id", { ascending: true });

      if (knowledgeError) {
        console.error("Error fetching ai_knowledge from Supabase:", knowledgeError);
      } else {
        knowledgeDocs = knowledge || [];
      }
    } catch (e) {
      console.warn("Table 'ai_knowledge' might not exist yet or error querying it:", e);
    }

    // 3. Format context for system prompt
    const productsText = products && products.length > 0
      ? products.map((p: any) => {
          const categoriesText = Array.isArray(p.categories) ? p.categories.join(", ") : "";
          const stateTypeText = p.state_type === "fresh" ? "🌿 ცოცხალი / გაუყინავი" : "❄️ გაყინული";
          return `- **${p.name}**: ${p.price} ₾ / ${p.unit} (${stateTypeText}). კატეგორიები: [${categoriesText}]. აღწერა: ${p.description || "აღწერა არ არის"}. ${p.video_url ? `მომზადების ვიდეო ბმული: ${p.video_url}` : ""}`;
        }).join("\n")
      : "მენიუში პროდუქტები ჯერ არ არის.";

    const knowledgeText = knowledgeDocs.length > 0
      ? knowledgeDocs.map((doc: any) => {
          return `### სათაური: ${doc.title}\nტექსტი: ${doc.content}`;
        }).join("\n\n")
      : "დამატებითი დოკუმენტები არ არის.";

    // 4. Construct System Prompt
    const systemPrompt = `შენ ხარ "იაკო" — "ნინიკას" (საოჯახო სამზარეულოს) თბილი, გულთბილი და დამხმარე AI ასისტენტი.
შენი მიზანია დაეხმარო მომხმარებლებს შეკვეთის გაკეთებაში, მიაწოდო ინფორმაცია ჩვენს პროდუქტებზე, ფასებზე, ინგრედიენტებზე, მომზადების წესებზე და ოჯახურ ისტორიაზე.
იყავი ძალიან თბილი, მეგობრული, თავაზიანი და გამოიყენე სმაილები (😊, ✨, 🥟, ❄️, 🌿). ისაუბრე მხოლოდ ქართულ ენაზე.

კონტექსტი და ცოდნა:
1. ჩვენს შესახებ:
- "ნინიკა" არის ოჯახური სამზარეულო ოზურგეთში (მისამართი: ოზურგეთი, ს. მგელაძის 3, ტელეფონი: 595 08 56 95).
- საწარმო შეიქმნა განსაკუთრებული გოგონას, ნინის მხარდასაჭერად, რათა მას ჰქონდეს თავისი საქმე, დამოუკიდებლობა და რეალიზების საშუალება. როცა მომხმარებელი ყიდულობს ჩვენს პროდუქტს, ის მხარს უჭერს ნინის დამოუკიდებელ მომავალს.
- გვაქვს ნახევარსაუკუნოვანი კულინარიული ტრადიცია.

2. მიღების და გადახდის წესები:
- მიღება: ადგილიდან გატანა (ოზურგეთი, ს. მგელაძის 3) ან მიტანის სერვისი ოზურგეთში.
- გადახდა: ადგილზე (ნაღდი/ბარათი) ან ანგარიშზე გადარიცხვა (ბანკის რეკვიზიტები: თიბისი ბანკი (შპს ნინიკა / ლელა საჯაია), ანგარიშის ნომერი: GE00TB0000000000000000). ანგარიშზე გადარიცხვისას საჭიროა გადარიცხვის ქვითრის ატვირთვა ვებგვერდზე.

3. პროდუქტების მენიუ (დინამიური მონაცემები):
${productsText}

4. დამატებითი ცოდნის ბაზა / დოკუმენტები (დინამიური მონაცემები 'ai_knowledge'-დან):
${knowledgeText}

მნიშვნელოვანი წესები:
- თუ მომხმარებელი გკითხავს მომზადების წესებზე, მიუთითე შესაბამისი პროდუქტის ვიდეო ბმული (თუ არსებობს).
- პასუხები ჩამოაყალიბე ლამაზად, გასაგებად, აბზაცებად და სიით.
- თუ ინფორმაცია არ გაქვს, იყავი თავაზიანი და ურჩიე დაგვიკავშირდნენ ტელეფონზე: 595 08 56 95.`;

    // 5. Format conversation history for Gemini API
    const contents: any[] = [];
    messages.forEach((m: any) => {
      const role = m.role === "assistant" || m.role === "model" ? "model" : "user";
      const text = m.content || "";

      if (!text) return;

      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts[0].text += "\n" + text;
      } else {
        contents.push({
          role,
          parts: [{ text }]
        });
      }
    });

    if (contents.length === 0) {
      contents.push({
        role: "user",
        parts: [{ text: "გამარჯობა" }]
      });
    }

    // Gemini requires the conversation to end with a user turn
    if (contents[contents.length - 1].role !== "user") {
      // If the last message is model, we pop it or add a dummy user message, but in a chat context, the last message should always be user
      contents.push({
        role: "user",
        parts: [{ text: "გთხოვთ მიპასუხოთ" }]
      });
    }

    // 6. Make request to Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return NextResponse.json(
        { reply: "უკაცრავად, Gemini-სთან კავშირი ვერ დამყარდა. გთხოვთ სცადოთ მოგვიანებით." },
        { status: response.status }
      );
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "უკაცრავად, პასუხის მომზადებისას დაფიქსირდა შეცდომა.";

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Error in chat API route:", error);
    return NextResponse.json(
      { reply: "დაფიქსირდა შიდა შეცდომა." },
      { status: 500 }
    );
  }
}
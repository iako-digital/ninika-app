import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type Product = {
  name: string;
  price: number;
  unit: string;
  description?: string | null;
  state_type?: string | null;
  is_available?: boolean | null;
};

type KnowledgeEntry = {
  title: string;
  content: string;
};

const CONTACT = {
  phone: "511 50 06 06",
  phoneFull: "+995 511 50 06 06",
  email: "info@ninika.ge",
  address: "ქ. ოზურგეთი, ს. მგელაძის ქუჩა, №3",
  facebook: "facebook.com/ninika.ge",
};

// მოთხოვნისამებრ თავაზიანი პასუხი, როცა ცოდნის ბაზაში ინფორმაცია ვერ მოიძებნა.
const FALLBACK_MESSAGE = `სამწუხაროდ, ამ კითხვაზე ზუსტი პასუხი არ მაქვს. 🌸

დეტალების დაზუსტებისთვის შეგიძლიათ დაგვიკავშირდეთ:

📞 ტელეფონზე: ${CONTACT.phone}

💬 ან მოგვწეროთ მესენჯერში: ${CONTACT.facebook}`;

// ------------------------------------------------------------------
// ტექსტის დამუშავების დამხმარე ფუნქციები (ქართული სიტყვების მარტივი "stemming")
// ------------------------------------------------------------------

function normalize(text: string): string {
  return String(text || "").toLowerCase().trim();
}

// ჭრის ბოლოში ხშირ ქართულ ბრუნვის დაბოლოებებს, რომ "ხინკალი"/"ხინკალს"/"ხინკალზე" ერთმანეთს დაემთხვას.
const CASE_SUFFIXES = ["ებით", "ებმა", "ებზე", "ებში", "ების", "ებს", "ები", "ით", "ზე", "ში", "მა", "ის", "მდე", "ად", "ს", "ი"];

function georgianStem(word: string): string {
  for (const suf of CASE_SUFFIXES) {
    if (word.length - suf.length >= 3 && word.endsWith(suf)) {
      return word.slice(0, word.length - suf.length);
    }
  }
  return word;
}

function messageContainsWord(normalizedMessage: string, word: string): boolean {
  if (word.length < 3) return false;
  if (normalizedMessage.includes(word)) return true;
  const stem = georgianStem(word);
  return stem.length >= 3 && normalizedMessage.includes(stem);
}

function matchesAny(normalizedMessage: string, keywords: string[]): boolean {
  return keywords.some((kw) => normalizedMessage.includes(kw));
}

// ------------------------------------------------------------------
// პროდუქტების ამოცნობა შეტყობინებაში
// ------------------------------------------------------------------

function extractProductWords(name: string): string[] {
  const base = name.replace(/\(.*?\)/g, " ").toLowerCase();
  return base.split(/[^a-zა-ჰ]+/i).filter((w) => w.length >= 3);
}

function findMatchedProducts(normalizedMessage: string, products: Product[]): Product[] {
  const matched: Product[] = [];
  for (const p of products) {
    const words = extractProductWords(p.name);
    if (words.some((w) => messageContainsWord(normalizedMessage, w))) {
      matched.push(p);
    }
  }
  return matched;
}

function formatProductReply(p: Product): string {
  if (p.is_available === false) {
    return `${p.name}: ეს პროდუქტი დღეისთვის ამოწურულია და ახალი პარტია მზადდება. განახლებული ინფორმაციისთვის დაგვირეკეთ ნომერზე ${CONTACT.phone}.`;
  }
  const typeLabel = p.state_type === "fresh" ? "ცოცხალი/გაუყინავი" : "გაყინული";
  const price = Number(p.price);
  const priceLabel = Number.isFinite(price) ? price.toFixed(2) : String(p.price);
  return `${p.name}: ${priceLabel} ₾ / ${p.unit} (${typeLabel})`;
}

function formatMenuList(products: Product[]): string {
  const lines = products.map((p) => `- ${formatProductReply(p)}`);
  return `ჩვენი აქტუალური მენიუ:\n${lines.join("\n")}\n\nკონკრეტული პროდუქტის ფასის დასაზუსტებლად უბრალოდ დაწერეთ მისი სახელი.`;
}

// ------------------------------------------------------------------
// ცოდნის ბაზის კატეგორიები (Rule-Based Matching)
// ------------------------------------------------------------------

const KEYWORDS = {
  menu: ["მენიუ", "პროდუქტ", "რა გაქვთ", "რას ყიდით", "ასორტიმენტ", "საკვებ"],
  address: ["მისამართ", "სად ხართ", "სად მდებარეობთ", "ლოკაცი", "მდებარეობ", "სად იმყოფებით", "სად არის", "საიდან"],
  contact: ["ტელეფონ", "ნომერ", "დაგირეკ", "დარეკ", "კონტაქტ", "დაკავშირდ", "ელფოსტ", "მეილ"],
  delivery: ["მიწოდებ", "შეკვეთ", "მოტანა", "კურიერ", "გზავნ", "ონლაინ"],
  hygiene: ["ჰიგიენ", "სისუფთავ", "სტანდარტ", "უსაფრთხო", "სანიტარ"],
};

const HYGIENE_DEFAULT = `ჩვენთვის უმთავრესია სისუფთავე და ხარისხი — ყველა პროდუქტი მზადდება მკაცრი სანიტარული ნორმების დაცვით, სუფთა და კონტროლირებად სამზარეულოში, შემოწმებული და ხარისხიანი ნედლეულით.`;

const DELIVERY_DEFAULT = `ონლაინ შეკვეთის გასაკეთებლად:
1️⃣ საიტზე ninika.ge აირჩიეთ სასურველი პროდუქტი და დააჭირეთ „+" ღილაკს კალათაში დასამატებლად.
2️⃣ დააჭირეთ ეკრანის ბოლოში გამოჩენილ „კალათის ნახვა" ღილაკს.
3️⃣ შეავსეთ სახელი და ტელეფონის ნომერი და დაადასტურეთ შეკვეთა.

შეკვეთის გასაკეთებლად ასევე შეგიძლიათ დაგვირეკოთ ნომერზე ${CONTACT.phone}.`;

function findKnowledgeByKeywords(knowledge: KnowledgeEntry[], keywords: string[]): KnowledgeEntry | undefined {
  return knowledge.find((k) => matchesAny(normalize(k.title), keywords));
}

// ზოგადი, admin-ის მიერ დამატებული FAQ ჩანაწერების დამთხვევა სათაურის სიტყვებზე დაყრდნობით.
function findGenericKnowledgeMatch(normalizedMessage: string, knowledge: KnowledgeEntry[]): KnowledgeEntry | undefined {
  return knowledge.find((k) => {
    const words = normalize(k.title).split(/[^a-zა-ჰ]+/i).filter((w) => w.length >= 3);
    return words.some((w) => messageContainsWord(normalizedMessage, w));
  });
}

function matchLocalKnowledge(message: string, products: Product[], knowledge: KnowledgeEntry[]): string | null {
  const normalizedMessage = normalize(message);
  if (!normalizedMessage) return null;

  // 1. კონკრეტული პროდუქტი/ფასი — უმაღლესი პრიორიტეტი
  const matchedProducts = findMatchedProducts(normalizedMessage, products);
  if (matchedProducts.length > 0) {
    return matchedProducts.map(formatProductReply).join("\n");
  }

  // 2. ზოგადი მენიუს კითხვა (კონკრეტული პროდუქტის გარეშე)
  if (matchesAny(normalizedMessage, KEYWORDS.menu) && products.length > 0) {
    return formatMenuList(products);
  }

  // 3. მისამართი / ლოკაცია
  if (matchesAny(normalizedMessage, KEYWORDS.address)) {
    const kb = findKnowledgeByKeywords(knowledge, KEYWORDS.address);
    return kb?.content ?? `ჩვენ ვმდებარეობთ: ${CONTACT.address}. 📍`;
  }

  // 4. კონტაქტი / ტელეფონი
  if (matchesAny(normalizedMessage, KEYWORDS.contact)) {
    const kb = findKnowledgeByKeywords(knowledge, KEYWORDS.contact);
    return kb?.content ?? `დაგვიკავშირდით შემდეგნაირად:\n📞 ტელეფონი: ${CONTACT.phone} (${CONTACT.phoneFull})\n✉️ ელ-ფოსტა: ${CONTACT.email}`;
  }

  // 5. მიწოდება / შეკვეთა
  if (matchesAny(normalizedMessage, KEYWORDS.delivery)) {
    const kb = findKnowledgeByKeywords(knowledge, KEYWORDS.delivery);
    return kb?.content ?? DELIVERY_DEFAULT;
  }

  // 6. სისუფთავე / სტანდარტები
  if (matchesAny(normalizedMessage, KEYWORDS.hygiene)) {
    const kb = findKnowledgeByKeywords(knowledge, KEYWORDS.hygiene);
    return kb?.content ?? HYGIENE_DEFAULT;
  }

  // 7. ზოგადი, admin-ის მიერ დამატებული ცოდნის ბაზის ჩანაწერები
  const generic = findGenericKnowledgeMatch(normalizedMessage, knowledge);
  if (generic) return generic.content;

  return null;
}

// ------------------------------------------------------------------
// AI fallback (არასავალდებულო, მხოლოდ მაშინ როცა ლოკალურ ბაზაში პასუხი ვერ მოიძებნა)
// ------------------------------------------------------------------

async function tryAiFallback(
  message: string,
  history: any,
  products: Product[],
  knowledge: KnowledgeEntry[]
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const productsContext = products.length
    ? products.map((p) => `- ${formatProductReply(p)}`).join("\n")
    : "";
  const knowledgeContext = knowledge.length
    ? knowledge.map((k) => `--- ${k.title} ---\n${k.content}`).join("\n\n")
    : "";

  const systemPromptText = `შენ ხარ "ნინიკა" — საოჯახო სამზარეულო "ნინიკას" (ninika.ge) მკაცრად შეზღუდული AI ასისტენტი.

ოფიციალური საკონტაქტო ინფო:
- ტელეფონი: ${CONTACT.phone} (${CONTACT.phoneFull})
- ელ-ფოსტა: ${CONTACT.email}
- მისამართი: ${CONTACT.address}

ჩვენი აქტუალური პროდუქტები და ფასები (ერთადერთი წყარო პროდუქტების შესახებ):
${productsContext}

დამატებითი ცოდნის ბაზა (ერთადერთი წყარო სხვა ინფორმაციისთვის — მიწოდება, გადახდა, წესები და ა.შ.):
${knowledgeContext}

უპირველესი და მკაცრი წესები:
1. უპასუხე მხოლოდ ქართულად!
2. მკაცრი შეზღუდვა: გიპასუხია მხოლოდ და მხოლოდ ზემოთ მოცემული პროდუქტების სიისა და ცოდნის ბაზის საფუძველზე. აკრძალულია საკუთარი ცოდნის, ვარაუდის ან ინტერნეტიდან/ტრენინგიდან მიღებული ინფორმაციის გამოყენება. არასოდეს უპასუხო ზოგად/off-topic კითხვებს.
3. თუ კითხვაზე პასუხი ზემოთ მოცემულ კონტექსტში ზუსტად არ მოიძებნება, ან კითხვა თემასთან შეუსაბამოა, აუცილებლად უპასუხე ზუსტად ამ ტექსტით და არაფერი დაამატო თავიდან შენ მხრიდან: "${FALLBACK_MESSAGE}"
4. არასოდეს გამოიყენო ზოგადი მისალმებები! მომხმარებელს უკვე მიესალმე. უპასუხე პირდაპირ დასმულ კითხვას.
5. იყავი მოკლე, კონკრეტული და თბილი.`;

  const formattedHistory = Array.isArray(history)
    ? history
        .filter((msg: any) => msg && (msg.text || msg.content))
        .map((msg: any) => ({
          role: msg.sender === "user" || msg.role === "user" ? "user" : "model",
          parts: [{ text: String(msg.text || msg.content) }],
        }))
    : [];

  const contents = [
    ...formattedHistory,
    {
      role: "user",
      parts: [{ text: String(message) }],
    },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPromptText }] },
          contents,
        }),
        signal: controller.signal,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(`Gemini API Error (status ${response.status}):`, JSON.stringify(data, null, 2));
      return null;
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof reply === "string" && reply.trim() ? reply : null;
  } catch (error) {
    console.error("Gemini API call failed:", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ------------------------------------------------------------------
// Route Handler
// ------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("name, price, unit, description, state_type, is_available");
    if (productsError) console.error("Chat: failed to fetch products:", productsError);

    const { data: knowledge, error: knowledgeError } = await supabase
      .from("ai_knowledge")
      .select("title, content");
    if (knowledgeError) console.error("Chat: failed to fetch ai_knowledge:", knowledgeError);

    const productList = products ?? [];
    const knowledgeList = knowledge ?? [];

    // 1. ჯერ ვცდილობთ ლოკალურ ცოდნის ბაზაში პასუხის მოძებნას — სწრაფი და API-სგან დამოუკიდებელი.
    const localReply = matchLocalKnowledge(String(message || ""), productList, knowledgeList);
    if (localReply) {
      return NextResponse.json({ reply: localReply });
    }

    // 2. თუ ლოკალურად ვერ მოიძებნა, ვცდილობთ AI მოდელს (არასავალდებულო გაფართოება).
    const aiReply = await tryAiFallback(String(message || ""), history, productList, knowledgeList);
    if (aiReply) {
      return NextResponse.json({ reply: aiReply });
    }

    // 3. ორივე შემთხვევაში (ცოდნის ბაზაში არ მოიძებნა ან AI-მ ვერ უპასუხა) — თავაზიანი fallback, ტექნიკური დეტალების გარეშე.
    return NextResponse.json({ reply: FALLBACK_MESSAGE });
  } catch (error: any) {
    console.error("Chat Server Error:", error);
    return NextResponse.json({ reply: FALLBACK_MESSAGE });
  }
}

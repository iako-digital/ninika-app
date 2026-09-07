import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";

const STEP_TIMEOUT_MS = 6000;

function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function saveOrderToSupabase(order: {
  name: string;
  phone: string;
  delivery: string | null;
  payment: string | null;
  items: any[];
  total: number;
  receiptName: string | null;
}) {
  try {
    const { error } = await withTimeout(
      supabase.from("orders").insert([
        {
          customer_name: order.name,
          phone: order.phone,
          delivery_method: order.delivery,
          payment_method: order.payment,
          items: order.items,
          total_price: order.total,
          receipt_name: order.receiptName,
          status: "new",
        },
      ]),
      STEP_TIMEOUT_MS,
      "Supabase insert"
    );
    if (error) {
      console.error("Supabase error:", error);
    }
  } catch (error) {
    console.error("Supabase error:", error);
  }
}

async function sendOrderEmail(order: {
  name: string;
  phone: string;
  delivery: string | null;
  payment: string | null;
  items: any[];
  total: number;
  receiptBase64: string;
  receiptName: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error("Resend error: RESEND_API_KEY არ არის მითითებული გარემოს ცვლადებში.");
    return;
  }

  try {
    const resend = new Resend(resendApiKey);

    const orderItemsHtml = order.items
      .map(
        (item: any) =>
          `<li><strong>${item.name}</strong> — ${item.quantity} ც/კგ (${(Number(item.price) * Number(item.quantity)).toFixed(2)} ₾)</li>`
      )
      .join("");

    const attachments =
      order.receiptBase64 && order.receiptName
        ? [
            {
              filename: order.receiptName,
              content: order.receiptBase64.split(",")[1] || order.receiptBase64,
            },
          ]
        : [];

    const receiptHtml = order.receiptBase64
      ? `<p style="color: #2A4533; font-weight: bold;">📎 ქვითარი თან დაერთვის ამ წერილს (ფაილის სახით).</p>`
      : `<p style="color: #888;">ქვითარი არ ყოფილა ატვირთული.</p>`;

    const { error: sendError } = await withTimeout(
      resend.emails.send({
        from: "ნინიკა <orders@ninika.ge>",
        to: ["info@ninika.ge"],
        subject: `ახალი შეკვეთა: ${order.name}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #1A1A1A;">
            <h2 style="color: #2A4533;">ახალი შეკვეთა "ნინიკას" ვებგვერდიდან!</h2>
            <hr style="border: 1px solid #C6A265;" />
            <p><strong>მომხმარებელი:</strong> ${order.name}</p>
            <p><strong>ტელეფონი:</strong> ${order.phone}</p>
            <p><strong>მიტანის მეთოდი:</strong> ${order.delivery}</p>
            <p><strong>გადახდის მეთოდი:</strong> ${order.payment || "ადგილზე გადახდა"}</p>
            ${order.payment?.includes("ანგარიშის") ? receiptHtml : ""}
            <h3>შეკვეთილი პროდუქტები:</h3>
            <ul>${orderItemsHtml}</ul>
            <h3 style="color: #C6A265;">სულ ჯამი: ${Number(order.total).toFixed(2)} ₾</h3>
          </div>
        `,
        attachments,
      }),
      STEP_TIMEOUT_MS,
      "Resend send"
    );

    if (sendError) {
      console.error("Resend error:", sendError);
    }
  } catch (error) {
    console.error("Resend error:", error);
  }
}

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch (error) {
    console.error("Send-order: invalid JSON body:", error);
    return NextResponse.json({ success: false, message: "მოთხოვნის ფორმატი არასწორია." }, { status: 400 });
  }

  const { name, phone, delivery, payment, items, total, receiptBase64, receiptName } = body || {};

  // მინიმალური ვალიდაცია — მხოლოდ ამის ჩავარდნაზე ვაბრუნებთ შეცდომას.
  if (!name || !phone || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { success: false, message: "გთხოვთ შეავსოთ სახელი, ტელეფონი და დაამატოთ მინიმუმ ერთი პროდუქტი." },
      { status: 400 }
    );
  }

  const orderData = {
    name,
    phone,
    delivery: delivery ?? null,
    payment: payment ?? null,
    items,
    total: Number(total) || 0,
    receiptBase64: receiptBase64 || "",
    receiptName: receiptName || "",
  };

  // Supabase-ში ჩაწერა და Email შეტყობინება სრულდება პარალელურად, თითოეული საკუთარი
  // ტაიმაუთით დაცული — ერთის დაკიდებამ/ჩავარდნამ არასდროს არ უნდა შეაჩეროს პასუხის დაბრუნება
  // და, შესაბამისად, არასდროს გამოიწვიოს სერვერის მხრიდან non-JSON/timeout პასუხი მომხმარებელთან.
  await Promise.allSettled([
    saveOrderToSupabase(orderData),
    sendOrderEmail(orderData),
  ]);

  // Response Guarantee — მინიმალური ვალიდაციის გავლის შემდეგ ყოველთვის success.
  return NextResponse.json({ success: true, message: "შეკვეთა მიღებულია" });
}

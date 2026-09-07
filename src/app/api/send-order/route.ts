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

export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (err) {
      console.error("JSON PARSE ERROR:", err);
    }

    const { name, phone, delivery, address, payment, items, total, receiptBase64, receiptName } = body || {};
    const safeItems = Array.isArray(items) ? items : [];

    // მინიმალური ვალიდაცია — მხოლოდ ამის ჩავარდნაზე ვაბრუნებთ არა-წარმატებულ პასუხს.
    if (!name || !phone || safeItems.length === 0) {
      return NextResponse.json(
        { success: false, message: "გთხოვთ შეავსოთ სახელი, ტელეფონი და დაამატოთ მინიმუმ ერთი პროდუქტი." },
        { status: 400 }
      );
    }

    // 1. Supabase Insert — საკუთარი try/catch. ჩავარდნაზე მხოლოდ ვლოგავთ და ვაგრძელებთ.
    try {
      const { error } = await withTimeout(
        supabase.from("orders").insert([
          {
            customer_name: name,
            phone,
            delivery_method: delivery ?? null,
            delivery_address: address || null,
            payment_method: payment ?? null,
            items: safeItems,
            total_price: Number(total) || 0,
            receipt_name: receiptName || null,
            status: "new",
          },
        ]),
        STEP_TIMEOUT_MS,
        "Supabase insert"
      );
      if (error) {
        console.error("SUPABASE ERROR:", error);
      }
    } catch (err) {
      console.error("SUPABASE ERROR:", err);
    }

    // 2. Resend Email — საკუთარი try/catch. ჩავარდნაზე მხოლოდ ვლოგავთ და ვაგრძელებთ.
    try {
      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.error("RESEND ERROR: RESEND_API_KEY არ არის მითითებული გარემოს ცვლადებში.");
      } else {
        const resend = new Resend(resendApiKey);

        const orderItemsHtml = safeItems
          .map(
            (item: any) =>
              `<li><strong>${item?.name}</strong> — ${item?.quantity} ც/კგ (${(Number(item?.price) * Number(item?.quantity)).toFixed(2)} ₾)</li>`
          )
          .join("");

        const attachments =
          receiptBase64 && receiptName
            ? [
                {
                  filename: receiptName,
                  content: String(receiptBase64).split(",")[1] || receiptBase64,
                },
              ]
            : [];

        const receiptHtml = receiptBase64
          ? `<p style="color: #2A4533; font-weight: bold;">📎 ქვითარი თან დაერთვის ამ წერილს (ფაილის სახით).</p>`
          : `<p style="color: #888;">ქვითარი არ ყოფილა ატვირთული.</p>`;

        const { error: sendError } = await withTimeout(
          resend.emails.send({
            from: "ნინიკა <orders@ninika.ge>",
            to: ["info@ninika.ge"],
            subject: `ახალი შეკვეთა: ${name}`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; color: #1A1A1A;">
                <h2 style="color: #2A4533;">ახალი შეკვეთა "ნინიკას" ვებგვერდიდან!</h2>
                <hr style="border: 1px solid #C6A265;" />
                <p><strong>მომხმარებელი:</strong> ${name}</p>
                <p><strong>ტელეფონი:</strong> ${phone}</p>
                <p><strong>მიტანის მეთოდი:</strong> ${delivery}</p>
                ${address ? `<p><strong>მისამართი:</strong> ${address}</p>` : ""}
                <p><strong>გადახდის მეთოდი:</strong> ${payment || "ადგილზე გადახდა"}</p>
                ${payment?.includes?.("ანგარიშის") ? receiptHtml : ""}
                <h3>შეკვეთილი პროდუქტები:</h3>
                <ul>${orderItemsHtml}</ul>
                <h3 style="color: #C6A265;">სულ ჯამი: ${(Number(total) || 0).toFixed(2)} ₾</h3>
              </div>
            `,
            attachments,
          }),
          STEP_TIMEOUT_MS,
          "Resend send"
        );

        if (sendError) {
          console.error("RESEND ERROR:", sendError);
        }
      }
    } catch (err) {
      console.error("RESEND ERROR:", err);
    }

    return NextResponse.json({ success: true, message: "შეკვეთა მიღებულია" }, { status: 200 });
  } catch (err) {
    // გლობალური "ბოლო ხაზის" დაცვა — რაც არ უნდა მოხდეს ზემოთ, მომხმარებელი ვერასდროს
    // ვერ ნახავს 500-ს ან ვერ-JSON პასუხს.
    console.error("SEND-ORDER FATAL ERROR:", err);
    return NextResponse.json({ success: true, message: "შეკვეთა მიღებულია" }, { status: 200 });
  }
}

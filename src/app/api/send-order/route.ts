import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";

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

  // 1. Supabase Insert — best-effort. ჩავარდნაზე მხოლოდ ვლოგავთ, მომხმარებელს არაფერს ვუშლით.
  try {
    const { error } = await supabase.from("orders").insert([
      {
        customer_name: name,
        phone,
        delivery_method: delivery ?? null,
        payment_method: payment ?? null,
        items,
        total_price: Number(total) || 0,
        receipt_name: receiptName || null,
        status: "new",
      },
    ]);

    if (error) {
      console.error("Supabase error:", error);
    }
  } catch (error) {
    console.error("Supabase error:", error);
  }

  // 2. Resend / Email — ცალკე try/catch. RESEND_API_KEY-ის არარსებობამ ან გაგზავნის
  //    ჩავარდნამ არასდროს არ უნდა აისახოს მომხმარებელზე.
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("Resend error: RESEND_API_KEY არ არის მითითებული გარემოს ცვლადებში.");
    } else {
      const resend = new Resend(resendApiKey);

      const orderItemsHtml = items
        .map(
          (item: any) =>
            `<li><strong>${item.name}</strong> — ${item.quantity} ც/კგ (${(Number(item.price) * Number(item.quantity)).toFixed(2)} ₾)</li>`
        )
        .join("");

      const attachments =
        receiptBase64 && receiptName
          ? [
              {
                filename: receiptName,
                content: receiptBase64.split(",")[1] || receiptBase64,
              },
            ]
          : [];

      const receiptHtml = receiptBase64
        ? `<p style="color: #2A4533; font-weight: bold;">📎 ქვითარი თან დაერთვის ამ წერილს (ფაილის სახით).</p>`
        : `<p style="color: #888;">ქვითარი არ ყოფილა ატვირთული.</p>`;

      const { error: sendError } = await resend.emails.send({
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
            <p><strong>გადახდის მეთოდი:</strong> ${payment || "ადგილზე გადახდა"}</p>
            ${payment?.includes("ანგარიშის") ? receiptHtml : ""}
            <h3>შეკვეთილი პროდუქტები:</h3>
            <ul>${orderItemsHtml}</ul>
            <h3 style="color: #C6A265;">სულ ჯამი: ${Number(total).toFixed(2)} ₾</h3>
          </div>
        `,
        attachments,
      });

      if (sendError) {
        console.error("Resend error:", sendError);
      }
    }
  } catch (error) {
    console.error("Resend error:", error);
  }

  // 3. Response Guarantee — მინიმალური ვალიდაციის გავლის შემდეგ ყოველთვის success.
  return NextResponse.json({ success: true, message: "შეკვეთა მიღებულია" });
}

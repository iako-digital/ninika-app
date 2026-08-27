import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "Missing RESEND_API_KEY" }, { status: 500 });
    }

    const resend = new Resend(apiKey);
    const body = await request.json();
    const { name, phone, delivery, payment, items, total, receiptBase64, receiptName } = body;

    const orderItemsHtml = items
      .map((item: any) => `<li><strong>${item.name}</strong> — ${item.quantity} ც/კგ (${(item.price * item.quantity).toFixed(2)} ₾)</li>`)
      .join("");

    const attachments = receiptBase64 && receiptName ? [
      {
        filename: receiptName,
        content: receiptBase64.split(",")[1] || receiptBase64,
      }
    ] : [];

    const receiptHtml = receiptBase64
      ? `<p style="color: #2A4533; font-weight: bold;">📎 ქვითარი თან დაერთვის ამ წერილს (ფაილის სახით).</p>`
      : `<p style="color: #888;">ქვითარი არ ყოფილა ატვირთული.</p>`;

    const { data, error } = await resend.emails.send({
      from: "ნინიკა <orders@ninika.ge>",
      to: ["ninika.kitchen@gmail.com"],
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
          <h3 style="color: #C6A265;">სულ ჯამი: ${total.toFixed(2)} ₾</h3>
        </div>
      `,
      attachments: attachments,
    });

    if (error) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || error }, { status: 500 });
  }
}
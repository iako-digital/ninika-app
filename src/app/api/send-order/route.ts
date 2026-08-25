import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, delivery, items, total } = body;

    const orderItemsHtml = items
      .map((item: any) => `<li><strong>${item.name}</strong> — ${item.quantity} ც/კგ (${(item.price * item.quantity).toFixed(2)} ₾)</li>`)
      .join("");

    const data = await resend.emails.send({
      from: "Ninika Kitchen <onboarding@resend.dev>",
      to: ["ninika.kitchen@gmail.com"],
      subject: `ახალი შეკვეთა: ${name}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1A1A1A;">
          <h2 style="color: #2A4533;">ახალი შეკვეთა "ნინიკას" ვებგვერდიდან!</h2>
          <hr style="border: 1px solid #C6A265;" />
          <p><strong>მომხმარებელი:</strong> ${name}</p>
          <p><strong>ტელეფონი:</strong> ${phone}</p>
          <p><strong>მიტანის მეთოდი:</strong> ${delivery}</p>
          <h3>შეკვეთილი პროდუქტები:</h3>
          <ul>${orderItemsHtml}</ul>
          <h3 style="color: #C6A265;">სულ ჯამი: ${total.toFixed(2)} ₾</h3>
        </div>
      `,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
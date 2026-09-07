import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";

function isMissingTableError(error: any) {
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    /schema cache|does not exist/i.test(error?.message || "")
  );
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

  if (!name || !phone || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { success: false, message: "აუცილებელი ველები (სახელი, ტელეფონი, კალათის შემცველობა) არასრულია." },
      { status: 400 }
    );
  }

  // 1. შეკვეთის ჩაწერა Supabase-ში — ეს არის პირველადი, "წყაროს" წყარო.
  //    ეს ნაბიჯი წარმატებით რომ დასრულდეს, შეკვეთა უსაფრთხოდაა შენახული მაშინაც კი,
  //    თუ ქვემოთ Email შეტყობინების გაგზავნა ჩავარდება.
  let orderId: number | null = null;
  let dbError: any = null;
  try {
    const { data: orderRow, error } = await supabase
      .from("orders")
      .insert([
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
      ])
      .select("id")
      .single();

    if (error) {
      dbError = error;
      if (isMissingTableError(error)) {
        console.error(
          `Send-order: "orders" ცხრილი არ არსებობს Supabase-ში. გაუშვით ეს SQL Supabase → SQL Editor-ში:\n\n` +
            `create table if not exists orders (\n` +
            `  id bigint generated always as identity primary key,\n` +
            `  customer_name text not null,\n` +
            `  phone text not null,\n` +
            `  delivery_method text,\n` +
            `  payment_method text,\n` +
            `  items jsonb not null default '[]',\n` +
            `  total_price numeric not null default 0,\n` +
            `  receipt_name text,\n` +
            `  status text not null default 'new',\n` +
            `  email_sent boolean not null default false,\n` +
            `  created_at timestamptz not null default now()\n` +
            `);\n` +
            `alter table orders enable row level security;\n` +
            `create policy "public access" on orders for all using (true) with check (true);`
        );
      } else {
        console.error("Send-order: failed to insert order into Supabase:", error);
      }
    } else {
      orderId = orderRow?.id ?? null;
    }
  } catch (error) {
    dbError = error;
    console.error("Send-order: unexpected error while inserting order:", error);
  }

  // 2. Email შეტყობინება — best-effort. მისმა ჩავარდნამ არასდროს არ უნდა ჩაშალოს
  //    მთელი შეკვეთის პროცესი, თუ ბაზაში ჩაწერა უკვე წარმატებულია.
  let emailError: string | null = null;
  let emailSent = false;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    emailError = "RESEND_API_KEY არ არის მითითებული გარემოს ცვლადებში.";
    console.error("Send-order:", emailError);
  } else {
    try {
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
        emailError = sendError.message || JSON.stringify(sendError);
        console.error("Send-order: Resend API returned an error:", sendError);
      } else {
        emailSent = true;
      }
    } catch (error: any) {
      emailError = error?.message || String(error);
      console.error("Send-order: Resend call threw an exception:", error);
    }
  }

  // 3. თუ შეკვეთა ბაზაში ჩაიწერა, ეს საკმარისია წარმატებისთვის — Email მხოლოდ შეტყობინებაა.
  if (!dbError) {
    if (orderId != null && emailSent) {
      await supabase.from("orders").update({ email_sent: true }).eq("id", orderId);
    }
    return NextResponse.json({
      success: true,
      orderId,
      warning: emailError ? `შეკვეთა შენახულია, თუმცა Email შეტყობინება ვერ გაიგზავნა: ${emailError}` : null,
    });
  }

  // 4. ბაზაში ჩაწერაც ჩავარდა — თუ Email მაინც გაიგზავნა, შეკვეთის ინფორმაცია მაინც ჩაბარდა ნინიკას.
  if (emailSent) {
    return NextResponse.json({
      success: true,
      orderId: null,
      warning: `შეკვეთა გაიგზავნა Email-ით, თუმცა ბაზაში შენახვა ვერ მოხერხდა: ${dbError?.message || dbError}`,
    });
  }

  // 5. ორივე არხი ჩავარდა — ეს რეალური, სრული ხარვეზია და მომხმარებელს უნდა ეცნობოს.
  const message = `შეკვეთის დამუშავება ვერ მოხერხდა. ბაზა: ${dbError?.message || dbError}${emailError ? ` | Email: ${emailError}` : ""}`;
  console.error("Send-order: both persistence and notification failed:", { dbError, emailError });
  return NextResponse.json({ success: false, message }, { status: 500 });
}

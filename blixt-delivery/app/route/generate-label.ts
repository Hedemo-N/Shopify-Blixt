// app/routes/generate-label.ts
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { generateLabelPDF } from "../utils/pdf.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const order_id = url.searchParams.get("order_id") ?? "TEST-123";
  const order_type = url.searchParams.get("order_type") ?? "hemleverans";

  const order = {
    order_id,
    order_type,
    name: url.searchParams.get("name") ?? "Test Testsson",
    address1: url.searchParams.get("address1") ?? "Exempelgatan 1",
    postalnumber: url.searchParams.get("postalnumber") ?? "41131",
    city: url.searchParams.get("city") ?? "Göteborg",
    phone: url.searchParams.get("phone") ?? "070-000 00 00",
    ombud_name: url.searchParams.get("ombud_name") ?? "Ombud Exempel",
    ombud_adress: url.searchParams.get("ombud_adress") ?? "Ombudsgatan 2",
  };

  const origin = url.origin; // ex: https://shopify-blixt.vercel.app
  const logoUrl = `${origin}/logo.png`;

  const pdfBytes = await generateLabelPDF(order, logoUrl); // Uint8Array
const body = new Uint8Array(pdfBytes); // ny backing ArrayBuffer (inte SAB)
return new Response(body, {
  status: 200,
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="label-${order_id}.pdf"`,
    "Cache-Control": "no-store",
  },
});


}

export const action = async () =>
  json({ error: "Use GET to fetch the PDF" }, { status: 405 });

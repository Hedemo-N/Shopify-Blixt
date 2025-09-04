// app/utils/pdf.server.ts
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

export async function generateLabelPDF(order: any, logoUrl?: string) {
  const pageWidth = 300;
  const pageHeight = 400;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // QR-kod → dataURL → bytes → embed
  const qrDataUrl = await QRCode.toDataURL(String(order.order_id));
  const qrRes = await fetch(qrDataUrl);
  const qrImageBytes = new Uint8Array(await qrRes.arrayBuffer());
  const qrImage = await pdfDoc.embedPng(qrImageBytes);

  // Logotyp via HTTP (från /public/logo.png)
  let logoImage: any = null;
  let logoDims = { width: 0, height: 0 };
  if (logoUrl) {
    try {
      const res = await fetch(logoUrl);
      if (!res.ok) throw new Error(`Logo fetch failed: ${res.status}`);
      const logoBytes = new Uint8Array(await res.arrayBuffer());
      logoImage = await pdfDoc.embedPng(logoBytes);
      logoDims = logoImage.scale(0.18);
    } catch {
      logoImage = null; // kör vidare utan logga
    }
  }

  // Ram
  page.drawRectangle({
    x: 10, y: 10,
    width: pageWidth - 20,
    height: pageHeight - 20,
    borderColor: rgb(0, 0, 0),
    borderWidth: 4,
  });

  if (order.order_type === "hemleverans") {
    page.drawText("Order ID:", { x: 20, y: 350, size: 25, font });
    page.drawText(String(order.order_id), { x: 20, y: 320, size: 25, font });

    page.drawText(`Namn: ${order.name ?? ""}`, { x: 20, y: 280, size: 15 });
    page.drawText(`Adress: ${order.address1 ?? ""}`, { x: 20, y: 260, size: 15 });
    page.drawText(`${order.postalnumber ?? ""} ${order.city ?? ""}`, { x: 20, y: 240, size: 15 });
    page.drawText(`Telefon: ${order.phone ?? ""}`, { x: 20, y: 200, size: 15 });
    page.drawText(`Leverans med:`, { x: 20, y: 170, size: 15 });
    page.drawText(`Blixt Delivery`, { x: 20, y: 130, size: 25 });

    if (logoImage) {
      page.drawImage(logoImage, {
        x: (pageWidth - logoDims.width) / 2,
        y: 100,
        width: logoDims.width,
        height: logoDims.height,
      });
    }

    page.drawImage(qrImage, { x: pageWidth - 200, y: 15, width: 100, height: 100 });
  } else if (order.order_type === "ombud") {
    page.drawText("Ombud/Paketbox", { x: 20, y: 350, size: 20, font });
    page.drawText(String(order.ombud_name ?? ""), { x: 20, y: 310, size: 20, font });
    page.drawText("Order ID:", { x: 20, y: 275, size: 20, font });
    page.drawText(String(order.order_id), { x: 20, y: 255, size: 20, font });

    page.drawText(`Namn: ${order.name ?? ""}`, { x: 20, y: 235, size: 15 });
    page.drawText(`Adress: ${order.ombud_adress ?? ""}`, { x: 20, y: 210, size: 15 });
    page.drawText(`Telefon: ${order.phone ?? ""}`, { x: 20, y: 160, size: 15 });
    page.drawText(`Leverans med:`, { x: 20, y: 135, size: 15 });
    page.drawText(`Blixt Delivery`, { x: 20, y: 110, size: 25 });

    if (logoImage) {
      page.drawImage(logoImage, {
        x: (pageWidth - logoDims.width) / 2,
        y: 100,
        width: logoDims.width,
        height: logoDims.height,
      });
    }

    page.drawImage(qrImage, { x: pageWidth - 200, y: 15, width: 80, height: 80 });
  } else {
    page.drawText("Order ID:", { x: 20, y: 350, size: 20, font });
    page.drawText(String(order.order_id), { x: 20, y: 330, size: 20, font });
    if (logoImage) {
      page.drawImage(logoImage, {
        x: (pageWidth - logoDims.width) / 2,
        y: 100,
        width: logoDims.width,
        height: logoDims.height,
      });
    }
    page.drawImage(qrImage, { x: pageWidth - 200, y: 15, width: 80, height: 80 });
  }

  return await pdfDoc.save(); // Uint8Array
}

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const generateLabelPDF = async (order: any) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([300, 400]);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const pageWidth = 300;
  const pageHeight = 400;

  // 🟨 QR-kod
  const qrDataUrl = await QRCode.toDataURL(order.order_id);
  const qrImageBytes = await fetch(qrDataUrl).then((res) => res.arrayBuffer());
  const qrImage = await pdfDoc.embedPng(qrImageBytes);

  // 🟨 Lokal logotyp (OBS: relativ väg från filsystemet – __dirname)
  const logoPath = path.resolve(__dirname, "../routes/Bild/logo.png");
  const logoBytes = fs.readFileSync(logoPath);
  const logoImage = await pdfDoc.embedPng(logoBytes);
  const logoDims = logoImage.scale(0.18);

  // 🟪 Hemleverans
  if (order.order_type === "hemleverans") {
    page.drawText("Order ID:", { x: 20, y: 350, size: 25, font });
    page.drawText(`${order.order_id}`, { x: 20, y: 320, size: 25, font });

    page.drawText(`Namn: ${order.name}`, { x: 20, y: 280, size: 15 });
    page.drawText(`Adress: ${order.address1}`, { x: 20, y: 260, size: 15 });
    page.drawText(`${order.postalnumber} ${order.city}`, { x: 20, y: 240, size: 15 });
    page.drawText(`Telefon: ${order.phone}`, { x: 20, y: 200, size: 15 });
    page.drawText(`Leverans med:`, { x: 20, y: 170, size: 15 });
    page.drawText(`Blixt Delivery`, { x: 20, y: 130, size: 25 });

    page.drawImage(logoImage, {
        x: (480 - logoDims.width) / 2,
      y: 100,
      width: logoDims.width,
      height: logoDims.height,
    });

    page.drawRectangle({
      x: 10,
      y: 10,
      width: pageWidth - 20,
      height: pageHeight - 20,
      borderColor: rgb(0, 0, 0),
      borderWidth: 4,
    });

    page.drawImage(qrImage, {
      x: pageWidth - 200,
      y: 15,
      width: 100,
      height: 100,
    });
  }

  // 🟩 Ombud
  else if (order.order_type === "ombud") {
    page.drawText("Ombud/Paketbox", { x: 20, y: 350, size: 20, font });
    page.drawText(`${order.ombud_name}`, { x: 20, y: 310, size: 20, font });
    page.drawText("Order ID:", { x: 20, y: 275, size: 20, font });
    page.drawText(`${order.order_id}`, { x: 20, y: 255, size: 20, font });

    page.drawText(`Namn: ${order.name}`, { x: 20, y: 235, size: 15 });
    page.drawText(`Adress: ${order.ombud_adress}`, { x: 20, y: 210, size: 15 });
    page.drawText(`Telefon: ${order.phone}`, { x: 20, y: 160, size: 15 });
    page.drawText(`Leverans med:`, { x: 20, y: 135, size: 15 });
    page.drawText(`Blixt Delivery`, { x: 20, y: 110, size: 25 });

    page.drawImage(logoImage, {
        x: (480 - logoDims.width) / 2,
      y: 100,
      width: logoDims.width,
      height: logoDims.height,
    });

    page.drawRectangle({
      x: 10,
      y: 10,
      width: pageWidth - 20,
      height: pageHeight - 20,
      borderColor: rgb(0, 0, 0),
      borderWidth: 4,
    });

    page.drawImage(qrImage, {
      x: pageWidth - 200,
      y: 15,
      width: 80,
      height: 80,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};

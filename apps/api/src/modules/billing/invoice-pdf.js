import PDFDocument from "pdfkit";

function money(v) {
  return `₹${Number(v || 0).toFixed(2)}`;
}

export async function renderInvoicePdf(details) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks = [];

    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const inv = details.invoice;
    const items = details.items || [];
    const pays = details.payments || [];
    const branding = details.branding || {};

    const appName = branding.app_name || inv.org_name || "Invoice";
    const headerColor = branding.primary_color || "#1f2937";

    doc.fillColor(headerColor).fontSize(20).text(appName, { align: "left" });
    doc.fillColor("#111827").fontSize(10);
    doc.text(`Branch: ${inv.branch_name || "-"} (${inv.branch_code || "-"})`);
    if (inv.branch_address) doc.text(`Address: ${inv.branch_address}`);
    if (inv.branch_phone) doc.text(`Phone: ${inv.branch_phone}`);

    doc.moveUp(3).fontSize(12).text(`Invoice: ${inv.invoice_no}`, { align: "right" });
    doc.fontSize(10).text(`Date: ${new Date(inv.invoice_date).toLocaleString()}`, { align: "right" });
    doc.text(`Status: ${inv.status}`, { align: "right" });

    doc.moveDown(1);
    doc.fontSize(11).text("Bill To", { underline: true });
    doc.fontSize(10).text(inv.customer_name || "Walk-in Customer");
    if (inv.customer_phone) doc.text(inv.customer_phone);

    doc.moveDown(1);
    const startY = doc.y;
    doc.fontSize(10).fillColor("#111827");
    doc.text("Item", 40, startY);
    doc.text("Batch", 230, startY);
    doc.text("Qty", 300, startY, { width: 40, align: "right" });
    doc.text("Rate", 350, startY, { width: 80, align: "right" });
    doc.text("GST", 440, startY, { width: 50, align: "right" });
    doc.text("Total", 500, startY, { width: 70, align: "right" });

    doc.moveTo(40, startY + 14).lineTo(570, startY + 14).strokeColor("#d1d5db").stroke();

    let y = startY + 20;
    for (const it of items) {
      if (y > 730) {
        doc.addPage();
        y = 40;
      }
      doc.fillColor("#111827").fontSize(9);
      doc.text(it.medicine_name || "-", 40, y, { width: 180 });
      doc.text(it.batch_no || "-", 230, y, { width: 60 });
      doc.text(String(it.qty || 0), 300, y, { width: 40, align: "right" });
      doc.text(money(it.selling_rate), 350, y, { width: 80, align: "right" });
      doc.text(`${Number(it.gst_rate || 0)}%`, 440, y, { width: 50, align: "right" });
      doc.text(money(it.line_total), 500, y, { width: 70, align: "right" });
      y += 18;
    }

    y += 8;
    doc.moveTo(350, y).lineTo(570, y).strokeColor("#d1d5db").stroke();
    y += 8;

    const cgst = Number(inv.tax_total || 0) / 2;
    const sgst = Number(inv.tax_total || 0) / 2;

    const totals = [
      ["Sub Total", money(inv.subtotal)],
      ["CGST", money(cgst)],
      ["SGST", money(sgst)],
      ["Discount", money(inv.discount_total)],
      ["Grand Total", money(inv.total)],
      ["Paid", money(inv.amount_paid)],
      ["Due", money(inv.amount_due)],
    ];

    for (const [k, v] of totals) {
      doc.fontSize(10).fillColor("#374151").text(k, 390, y, { width: 90, align: "right" });
      doc.fontSize(10).fillColor("#111827").text(v, 490, y, { width: 80, align: "right" });
      y += 16;
    }

    y += 8;
    doc.fontSize(10).fillColor("#111827").text("Payments", 40, y, { underline: true });
    y += 16;
    if (!pays.length) {
      doc.fontSize(9).fillColor("#6b7280").text("No payments", 40, y);
      y += 14;
    } else {
      for (const p of pays) {
        const line = `${p.mode}  ${money(p.amount)}${p.ref_no ? `  Ref: ${p.ref_no}` : ""}`;
        doc.fontSize(9).fillColor("#111827").text(line, 40, y);
        y += 14;
      }
    }

    y += 12;
    doc.fontSize(9).fillColor("#6b7280").text(details.invoice_footer || "Thank you for your business.", 40, y, { width: 530, align: "left" });

    doc.end();
  });
}

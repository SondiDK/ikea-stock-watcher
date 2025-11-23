import { scrapeProduct } from "ikea-availability-checker";
import nodemailer from "nodemailer";

const productId = "10572876"; // SKOGSNÄS
const stores = [
  { id: "094", name: "Taastrup" },
  { id: "121", name: "Gentofte" },
  { id: "686", name: "København" },
];

// Mail opsætning (bruges i GitHub Secrets)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendMail(message) {
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: process.env.MAIL_TO,
    subject: "IKEA Lagerstatus – SKOGSNÄS er på lager!",
    text: message,
  });
}

async function run() {
  console.log("Checking availability for SKOGSNÄS...");

  const results = await scrapeProduct({
    productId,
    countryCode: "dk",
  });

  let message = "";
  let found = false;

  for (const store of stores) {
    const stock = results[store.id]?.inStock || false;
    const qty = results[store.id]?.quantity || 0;

    console.log(`${store.name}: ${qty} stk`);

    if (stock && qty > 0) {
      found = true;
      message += `${store.name} (${store.id}) har ${qty} stk på lager.\n`;
    }
  }

  if (found) {
    console.log("SENDING MAIL!");
    await sendMail(message);
  } else {
    console.log("No stock in selected stores.");
  }
}

run();

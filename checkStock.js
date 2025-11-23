import pkg from "ikea-availability-checker";
const { availability } = pkg;
import nodemailer from "nodemailer";

// --- Config ---
const productId = "30572984"; // testprodukt
const stores = [
  { name: "Taastrup", code: "094" },
  { name: "Gentofte", code: "121" },
  { name: "København", code: "686" },
];

// --- Mail setup via GitHub Secrets ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendMail(message) {
  console.log("Sender mail...");
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: process.env.MAIL_TO,
      subject: "IKEA Lagerstatus – Produkt på lager!",
      text: message,
    });
    console.log("Mail sendt!");
  } catch (err) {
    console.error("Fejl ved afsendelse af mail:", err);
  }
}

// --- Check stock via library ---
async function checkStore(store) {
  console.log(`Tjekker butik: ${store.name} (${store.code})...`);
  try {
    // Timeout kan sættes med axios config
    const result = await availability(store.code, productId, { timeout: 20000 });
    // result er et JSON-objekt
    if (result?.availableStock > 0) {
      console.log(`${store.name} har ${result.availableStock} på lager!`);
      return `${store.name}: ${result.availableStock} stk. på lager`;
    }
    console.log(`${store.name} har ingen på lager.`);
    return null;
  } catch (err) {
    console.error(`Fejl ved tjek af butik ${store.name} (${store.code}):`, err.message);
    return null;
  }
}

// --- Main ---
async function run() {
  console.log("=== Starter lagerstatus tjek ===");

  let message = "";
  for (const store of stores) {
    const result = await checkStore(store);
    if (result) message += result + "\n";
  }

  if (message) {
    console.log("Lager fundet! Sender mail...");
    await sendMail(message);
  } else {
    console.log("Ingen lager i de valgte butikker.");
  }

  console.log("=== Lagerstatus tjek færdigt ===");
}

run();

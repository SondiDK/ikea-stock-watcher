import pkg from "ikea-availability-checker";
import nodemailer from "nodemailer";
const { availability } = pkg;

// --- Config ---
const productId = "30572984"; // test product
const stores = [
  { name: "Taastrup", code: "094" },
  { name: "Gentofte", code: "121" },
  { name: "København", code: "686" },
];

const TIMEOUT = 20000; // 20 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// --- Email setup (GitHub secrets) ---
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,        // mail.mail-online.dk
  port: parseInt(process.env.MAIL_PORT || "587"), // 587 for STARTTLS
  secure: false,                      // STARTTLS
  auth: {
    user: process.env.MAIL_USER,      // olleikea@mail-online.dk
    pass: process.env.MAIL_PASS,
  },
});

// --- Helper ---
async function sendEmail(subject, text) {
  try {
    await transporter.sendMail({
      from: `"IKEA Alert" <${process.env.MAIL_USER}>`,
      to: process.env.MAIL_RECEIVER,  // your recipient email
      subject,
      text,
    });
    console.log("📧 Email sendt!");
  } catch (err) {
    console.error("❌ Fejl ved afsendelse af email:", err.message);
  }
}

async function checkStore(store) {
  console.log(`Tjekker butik: ${store.name} (${store.code})...`);
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await availability(store.code, productId, { timeout: TIMEOUT });
      if (result?.stock && result.stock > 0) {
        console.log(`✅ ${store.name} har ${result.stock} på lager!`);
        await sendEmail(
          `IKEA Lager Alert: ${store.name}`,
          `Produkt ${productId} er på lager i ${store.name} (${result.stock} stk)!`
        );
      } else {
        console.log(`❌ ${store.name} har ingen på lager.`);
      }
      return; // success
    } catch (err) {
      console.error(`⚠️ Forsøg ${attempt} fejlede for ${store.name} (${store.code}):`, err.message);
      if (attempt < MAX_RETRIES) {
        console.log(`⏳ Venter ${RETRY_DELAY / 1000}s før næste forsøg...`);
        await new Promise(r => setTimeout(r, RETRY_DELAY));
      } else {
        console.error(`❌ Alle forsøg mislykkedes for ${store.name}`);
      }
    }
  }
}

// --- Main ---
async function run() {
  console.log("=== Starter lagerstatus tjek ===");
  for (const store of stores) {
    await checkStore(store);
  }
  console.log("=== Lagerstatus tjek færdigt ===");
}

run();

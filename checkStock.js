import pkg from "ikea-availability-checker";
const { availability } = pkg;
import nodemailer from "nodemailer";

// --- Produkt og butikker ---
const productId = "30572984"; // testprodukt
const storesToCheck = [
  { name: "Taastrup", code: "094" },
  { name: "Gentofte", code: "121" },
  { name: "København", code: "060" }, // gyldig butik fra pakken
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

// --- Wrap availability med timeout ---
async function availabilityWithTimeout(storeCode, productId, timeout = 15000) {
  return Promise.race([
    availability(storeCode, productId),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout efter ${timeout}ms`)), timeout)
    ),
  ]);
}

// --- Tjek lager for hver butik ---
async function run() {
  console.log("=== Starter lagerstatus tjek ===");
  let message = "";
  let found = false;

  for (const store of storesToCheck) {
    console.log(`Tjekker butik: ${store.name} (${store.code})...`);
    try {
      const result = await availabilityWithTimeout(store.code, productId);
      const { stock, probability } = result;

      console.log(
        `B

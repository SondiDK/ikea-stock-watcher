import pkg from "ikea-availability-checker";
const { availability, IOWS2 } = pkg;
import nodemailer from "nodemailer";

// --- Produkt og butikker ---
const productId = "30572984"; // testprodukt
const storesToCheck = [
  { name: "Taastrup", code: "094" },
  { name: "Gentofte", code: "121" },
  { name: "København", code: "686" },
];

// --- Patch IKEA timeout til 15 sekunder ---
IOWS2.prototype.fetch = (function (original) {
  return async function (...args) {
    const config = args[0];
    config.timeout = 15000; // 15 sekunder
    return original.call(this, config);
  };
})(IOWS2.prototype.fetch);

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

// --- Tjek lager for hver butik ---
async function run() {
  console.log("=== Starter lagerstatus tjek ===");
  let message = "";
  let found = false;

  for (const store of storesToCheck) {
    console.log(`Tjekker butik: ${store.name} (${store.code})...`);
    try {
      const result = await availability(store.code, productId);
      const { stock, probability } = result;

      console.log(
        `Butik ${store.name}: stock = ${stock}, sandsynlighed = ${probability}`
      );

      if (stock > 0) {
        found = true;
        message += `${store.name} har ${stock} stk på lager (sandsynlighed: ${probability}).\n`;
      }
    } catch (err) {
      console.error(`Fejl ved tjek af butik ${store.name} (${store.code}):`, err.message);
    }
  }

  if (found) {
    console.log("Lager fundet! Mail vil blive sendt med detaljer:");
    console.log("------ DEBUG MESSAGE START ------");
    console.log(message);
    console.log("------- DEBUG MESSAGE END -------");
    await sendMail(message);
  } else {
    console.log("Ingen lager i de valgte butikker.");
  }

  console.log("=== Lagerstatus tjek færdigt ===");
}

// --- Kør script ---
run();

import pkg from "ikea-availability-checker";
const { availability } = pkg;
import nodemailer from "nodemailer";

const productId = "10572876";
const stores = [
  { id: "094", name: "Taastrup" },
  { id: "121", name: "Gentofte" },
  { id: "686", name: "København" },
];

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
  console.log("Tjekker lagerstatus for SKOGSNÄS...");

  let message = "";
  let found = false;

  for (const store of stores) {
    try {
      const result = await availability(store.id, productId);
      const { stock, probability } = result;

      console.log(`${store.name} (${store.id}): stock = ${stock}, prob = ${probability}`);

      if (stock > 0) {
        found = true;
        message += `${store.name} har ${stock} stk på lager (sandsynlighed: ${probability}).\n`;
      }
    } catch (err) {
      console.error(`Fejl ved tjek for butik ${store.id}:`, err);
    }
  }

  if (found) {
    console.log("Lager fundet – sender mail!");
    await sendMail(message);
  } else {
    console.log("Ingen lager i de valgte butikker.");
  }
}

run();

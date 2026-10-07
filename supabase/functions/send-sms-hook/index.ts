import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const requiredEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required server secret: ${name}`);
  return value;
};

function toSensRecipient(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("82")) return digits.slice(2);
  if (digits.startsWith("0")) return digits.slice(1);
  throw new Error("The auth phone number is not a supported Korean number.");
}

async function signSensRequest(secretKey: string, message: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const body = await request.text();
  let event: { user?: { phone?: string }; sms?: { otp?: string } };
  try {
    const hookSecret = requiredEnv("SEND_SMS_HOOK_SECRET").replace(/^v1,whsec_/, "");
    const webhook = new Webhook(hookSecret);
    event = webhook.verify(body, Object.fromEntries(request.headers)) as typeof event;
  } catch {
    return new Response("Invalid SMS hook signature or configuration", { status: 401 });
  }

  const phone = event.user?.phone;
  const otp = event.sms?.otp;
  if (!phone || !otp || !/^\d{6}$/.test(otp)) {
    return new Response("The SMS hook payload is incomplete", { status: 400 });
  }

  const accessKey = requiredEnv("SENS_ACCESS_KEY");
  const secretKey = requiredEnv("SENS_SECRET_KEY");
  const serviceId = requiredEnv("SENS_SERVICE_ID");
  const senderNumber = requiredEnv("SENS_SENDER_NUMBER");
  const uri = `/sms/v2/services/${serviceId}/messages`;
  const timestamp = Date.now().toString();
  const signature = await signSensRequest(secretKey, `POST ${uri}\n${timestamp}\n${accessKey}`);
  const response = await fetch(`https://sens.apigw.ntruss.com${uri}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "x-ncp-apigw-timestamp": timestamp,
      "x-ncp-iam-access-key": accessKey,
      "x-ncp-apigw-signature-v2": signature,
    },
    body: JSON.stringify({
      type: "SMS",
      contentType: "COMM",
      countryCode: "82",
      from: senderNumber,
      content: `이음 휴대전화 인증번호는 ${otp}입니다.`,
      messages: [{ to: toSensRecipient(phone) }],
    }),
  });
  if (!response.ok) {
    console.error("SENS rejected the SMS request", response.status);
    return new Response("SMS provider rejected the request", { status: 502 });
  }

  return new Response(null, { status: 200 });
});

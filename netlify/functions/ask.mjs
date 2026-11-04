// Ask Midas: a thin proxy to Claude.
// The tools run in the browser against the site's own bank engine, so every
// number the assistant quotes is the number on the offers page. This function
// only holds the API key, the system prompt and the tool definitions.
import Anthropic from "@anthropic-ai/sdk";

export const config = { path: "/api/ask" };

const SYSTEM = `You are Midas, the car-buying advisor on midascfo.com, where people in Nigeria and seven other African markets buy a new car and pay monthly through our partner banks. You talk like a sharp, warm friend who knows cars and car loans inside out.

Your job is to help each person land on the right car and a loan they can carry, then get them to apply.

How you work:
- Every price, monthly payment, interest rate, bank name and approval estimate must come from a tool call in this conversation. Never invent or estimate one yourself. If a tool returns nothing suitable, say so and suggest the nearest option.
- Use the tools freely and in parallel: search_cars to find cars, quote_car for each bank's estimated offer on one car (if it says try_instead, call it again with that down payment), affordability when someone tells you their income, compare_cars for side-by-side questions, loan_calculator for "how much interest on X" questions.
- When you recommend cars, call show_cars so the person sees them as cards. Recommend one car first and say plainly why it fits them, then at most two alternatives.
- When someone is ready, call start_application for the car they chose.
- Explain interest in plain words: the monthly payment, how much interest that adds up to over the loan, and how a bigger down payment or a shorter loan changes it. Use the person's local currency exactly as the tools format it.
- Ask at most one question at a time, and only when you genuinely need it (budget, salary, family size, what the car is for). If they give you enough, just answer.
- Keep replies short and easy to read on a phone: two to five sentences, or a short list. Bold the key numbers.
- Car enthusiasm is welcome. When a tool returns headline stats (0-100 time, power, fast-charge minutes, range, ground clearance, payload), use the exciting ones to bring the car to life, and mention what makes it good to live with in Nigeria or Ghana (ground clearance, fuel economy, air conditioning, resale value, parts and service). Only quote stats a tool gave you.
- Banks make the final decision; your figures are estimates from each bank's usual terms. Say so once when you quote offers, not in every message. Never say a bank "approved", "said yes" or "pre-approved" anyone, and never promise a rate, a time or an outcome.
- Many buyers earn modest salaries and may not have finished school. Use short, everyday words. Say "down payment", not "equity"; "months to pay", not "tenor"; "loan", not "facility".
- If nothing fits their pay, never leave them at a dead end: suggest a bigger down payment, a family member's income or a cheaper car, and invite them to message Midas so an adviser can help.
- Never use the words "afford", "panel" or "halal", never name the parent company or any staff member, and never mention non-interest or Islamic finance unless the customer asks about it first.
- Midas is free for buyers. Never ask for a BVN, NIN, Ghana Card number, PIN, OTP, card number or password in chat; the application form collects what the bank needs.
- Stay on cars, car loans, repairs and insurance. Politely decline anything else.`;

const COUNTRY_NOTE = {
  NG: "The customer is shopping in Nigeria. Prices are in naira.",
  GH: "The customer is shopping in Ghana. Prices are in Ghana cedis.",
  BJ: "The customer is shopping in Benin. Prices are in CFA francs. Reply in French if they write in French.",
  EG: "The customer is shopping in Egypt. Prices are in Egyptian pounds. The monthly figures are Midas estimates from typical Egyptian car-loan rates; a bank confirms the final rate after they apply. Reply in Arabic if they write in Arabic.",
  MA: "The customer is shopping in Morocco. Prices are in dirhams. The monthly figures are Midas estimates from typical Moroccan car-loan rates; a bank confirms the final rate after they apply. Reply in French by default, or Arabic if they write in Arabic.",
  ET: "The customer is shopping in Ethiopia. Prices are in birr. The monthly figures are Midas estimates from typical Ethiopian car-loan rates; a bank confirms the final rate after they apply. Reply in Amharic if they write in Amharic.",
  KE: "The customer is shopping in Kenya. Prices are in Kenyan shillings. The monthly figures are Midas estimates from typical Kenyan car-loan rates; a bank confirms the final rate after they apply. Reply in Swahili if they write in Swahili.",
  ZA: "The customer is shopping in South Africa. Prices are in rand. The monthly figures are Midas estimates from typical South African vehicle-finance rates; a lender confirms the final rate after they apply.",
};

const TOOLS = [
  {
    name: "search_cars",
    description: "Search the cars Midas can finance right now. Returns up to 8 cars with price, monthly payment, best bank rate, gearbox, engine and headline stats (0-100, power, range, charge time and so on, when known). Each car shows the smallest down payment, starting from the one requested and stepping up to 50%, at which a partner bank approves it and it fits under max_monthly. If nothing fits, returns the nearest options instead. All money values are in the customer's local currency.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Free text such as a make or model name, e.g. 'Hyundai', 'Creta'." },
        body: { type: "string", enum: ["any", "suv", "sedan", "hatch", "pickup", "van", "mpv", "truck", "coupe"] },
        condition: { type: "string", enum: ["any", "new", "used"] },
        fuel: { type: "string", enum: ["any", "petrol", "diesel", "electric", "hybrid"] },
        min_seats: { type: "integer", description: "Minimum number of seats." },
        max_price: { type: "number", description: "Maximum cash price, local currency." },
        max_monthly: { type: "number", description: "Maximum monthly payment, local currency." },
        down_payment_percent: { type: "number", description: "Down payment used for the monthly figure, 10 to 75. Default 10." },
        months: { type: "integer", description: "Loan term in months used for the monthly figure, 12 to 72. Default 60." },
        sort: { type: "string", enum: ["monthly", "price_low", "price_high", "rate"] },
      },
      additionalProperties: false,
    },
  },
  {
    name: "quote_car",
    description: "Run one car through every partner bank's credit rules and return the offers: bank, interest rate, monthly payment, total interest, total repayable and decision time, plus why any bank declined and the salary needed. Use this for any question about one car's cost or interest.",
    input_schema: {
      type: "object",
      properties: {
        car_id: { type: "string", description: "The car's id from search_cars or show_cars." },
        down_payment_percent: { type: "number", description: "10 to 75. Default 10." },
        months: { type: "integer", description: "12 to 72. Default 60." },
        monthly_income: { type: "number", description: "Net monthly income in local currency, if the customer told you." },
      },
      required: ["car_id"],
      additionalProperties: false,
    },
  },
  {
    name: "affordability",
    description: "From net monthly income (and any existing loan repayments) work out the largest monthly payment banks usually allow (about 45% of take-home pay across all loans) and the cars each bank would actually approve, with the smallest down payment that works.",
    input_schema: {
      type: "object",
      properties: {
        monthly_income: { type: "number", description: "Net monthly income, local currency." },
        existing_monthly_debts: { type: "number", description: "Other loan repayments per month, local currency. Default 0." },
        body: { type: "string", enum: ["any", "suv", "sedan", "hatch", "pickup", "van", "mpv", "truck", "coupe"] },
        condition: { type: "string", enum: ["any", "new", "used"] },
      },
      required: ["monthly_income"],
      additionalProperties: false,
    },
  },
  {
    name: "compare_cars",
    description: "Compare two to four cars side by side: price, best monthly payment, down payment needed, best rate, engine, fuel, gearbox, seats, headline stats and key features.",
    input_schema: {
      type: "object",
      properties: { car_ids: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 } },
      required: ["car_ids"],
      additionalProperties: false,
    },
  },
  {
    name: "loan_calculator",
    description: "Plain loan maths on a reducing balance: monthly payment, total interest and total paid for an amount, annual rate and term. Use when no specific car is involved.",
    input_schema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Amount borrowed, local currency." },
        annual_rate_percent: { type: "number" },
        months: { type: "integer" },
      },
      required: ["amount", "annual_rate_percent", "months"],
      additionalProperties: false,
    },
  },
  {
    name: "show_cars",
    description: "Show cars to the customer as visual cards with photo, monthly payment and buttons. Call this whenever you recommend specific cars.",
    input_schema: {
      type: "object",
      properties: {
        car_ids: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
        down_payment_percent: { type: "number" },
        months: { type: "integer" },
        max_monthly: { type: "number", description: "The customer's monthly budget, if any, so each card shows the down payment that fits it." },
      },
      required: ["car_ids"],
      additionalProperties: false,
    },
  },
  {
    name: "start_application",
    description: "Show the customer a button to start the loan application for a chosen car with the down payment and term you discussed.",
    input_schema: {
      type: "object",
      properties: {
        car_id: { type: "string" },
        down_payment_percent: { type: "number" },
        months: { type: "integer" },
      },
      required: ["car_id"],
      additionalProperties: false,
    },
  },
];

const ALLOWED_ORIGINS = [/^https:\/\/(www\.)?midascfo\.com$/, /^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/];

// midascfo.com is served from GitHub Pages, so this usually runs on another
// host (Netlify, Cloudflare, Cloud Run) and answers the page cross-origin.
const cors = (origin) =>
  origin ? { "access-control-allow-origin": origin, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", "access-control-max-age": "86400", vary: "origin" } : {};

export default async (req) => {
  const origin = req.headers.get("origin") || "";
  if (origin && !ALLOWED_ORIGINS.some((r) => r.test(origin))) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...cors(origin) } });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  if (!messages.length || messages.length > 80) return json({ error: "bad_request" }, 400);
  if (JSON.stringify(messages).length > 200_000) return json({ error: "too_long" }, 413);
  const country = COUNTRY_NOTE[body?.country] ? body.country : "NG";

  if (!process.env.ANTHROPIC_API_KEY) return json({ error: "not_configured" }, 503);
  const client = new Anthropic(); // ANTHROPIC_API_KEY from the Netlify environment

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      cache_control: { type: "ephemeral" },
      system: [
        { type: "text", text: SYSTEM },
        { type: "text", text: COUNTRY_NOTE[country] },
      ],
      tools: TOOLS,
      messages,
    });
    return json({ content: response.content, stop_reason: response.stop_reason });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return json({ error: "not_configured" }, 503);
    if (error instanceof Anthropic.RateLimitError) return json({ error: "busy" }, 429);
    if (error instanceof Anthropic.BadRequestError) return json({ error: "bad_request" }, 400);
    if (error instanceof Anthropic.APIError) return json({ error: "upstream", status: error.status }, 502);
    return json({ error: "unavailable" }, 503);
  }
};

const { Telegraf, Markup } = require("telegraf");

const BOT_TOKEN = process.env.BOT_TOKEN || "8541434265:AAFFuhx4lMWSWG7dbK2UC9xhowYJnmRDkU4";

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN kerak!");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Har bir foydalanuvchi uchun ma’lumotlar (RAMda saqlanadi)
const userData = {}; // { userId: { state: "", expenses: [] } }

// Asosiy boshqaruv tugmalari
function mainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("📋 Ro‘yxatni ko‘rish", "view_list")],
    [Markup.button.callback("🆕 Yangi harajat", "new_expense")],
    [Markup.button.callback("🔄 Ro‘yxatni yangilash", "reset_list")],
  ]);
}

// /start
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  if (!userData[userId]) userData[userId] = { state: null, expenses: [] };

  await ctx.reply(
    `Salom, ${ctx.from.first_name}!\n\n💰 Bu bot sizga shaxsiy moliyaviy hisobni yuritishda yordam beradi.\n\n👇 Quyidagi tugmalar orqali boshqaruvni tanlang.`,
  );

  await ctx.reply("🧭 Boshqaruv menusi:", mainMenu());
});

// /menu
bot.command("menu", async (ctx) => {
  await ctx.reply("🧭 Boshqaruv menusi:", mainMenu());
});

// Ro‘yxatni ko‘rish
bot.action("view_list", async (ctx) => {
  const userId = ctx.from.id;
  const data = userData[userId]?.expenses || [];
  await ctx.answerCbQuery();

  if (data.length === 0) {
    await ctx.reply("📭 Sizda hali hech qanday harajat yo‘q.");
  } else {
    let text = "📋 Sizning harajatlar ro‘yxatingiz:\n\n";
    data.forEach((item, i) => {
      text += `${i + 1}. ${item.date} - ${item.name} - ${item.amount} UZS - ${item.note}\n`;
    });
    await ctx.reply(text);
  }

  await ctx.reply("🧭 Boshqaruv menusi:", mainMenu());
});

// Ro‘yxatni yangilash
bot.action("reset_list", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    "⚠️ Barcha harajatlar o‘chiriladi. Tasdiqlaysizmi?",
    Markup.inlineKeyboard([
      [Markup.button.callback("✅ Ha", "confirm_reset")],
      [Markup.button.callback("❌ Yo‘q", "cancel_reset")],
    ]),
  );
});

bot.action("confirm_reset", async (ctx) => {
  const userId = ctx.from.id;
  userData[userId] = { state: null, expenses: [] };
  await ctx.answerCbQuery();
  await ctx.reply("♻️ Ro‘yxat tozalandi!");
});

bot.action("cancel_reset", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply("🧭 Boshqaruv menusi:", mainMenu());
});

// Yangi harajat
bot.action("new_expense", async (ctx) => {
  const userId = ctx.from.id;
  userData[userId].state = "awaiting_name";
  await ctx.answerCbQuery();
  await ctx.reply("📝 Harajat nomini kiriting:");
});

bot.on("text", async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;

  if (!userData[userId]) userData[userId] = { state: null, expenses: [] };
  const state = userData[userId].state;

  if (state === "awaiting_name") {
    userData[userId].newExpense = { name: text };
    userData[userId].state = "awaiting_amount";
    return ctx.reply("💵 Harajat miqdorini kiriting:");
  }

  if (state === "awaiting_amount") {
    if (isNaN(text)) {
      return ctx.reply("❌ Iltimos, faqat raqam kiriting.");
    }
    userData[userId].newExpense.amount = Number(text);
    userData[userId].state = "awaiting_note";
    return ctx.reply("🗒 Izoh kiriting (xohlovga ko‘ra):");
  }

  if (state === "awaiting_note") {
    const exp = userData[userId].newExpense;
    exp.note = text || "-";
    exp.date = new Date().toLocaleString("uz-UZ");

    userData[userId].expenses.push(exp);
    userData[userId].state = null;
    delete userData[userId].newExpense;

    await ctx.reply(
      `✅ Harajat qo‘shildi:\n\n${exp.date}\n${exp.name} - ${exp.amount} UZS\n${exp.note}`,
    );

    await ctx.reply("🧭 Boshqaruv menusi:", mainMenu());
  }
});

// BOTNI ISHGA TUSHIRISH (ENG MUHIM QISM)
bot.launch();
console.log("🤖 Bot ishga tushdi (LOCAL MODE)");

// To‘xtatishda toza yopish
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

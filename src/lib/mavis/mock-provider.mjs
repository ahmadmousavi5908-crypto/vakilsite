export const mockProvider = Object.freeze({
  name: "mock",
  async generate({ messages }) {
    return {
      text: [
        "ماویس در حال حاضر در حالت آزمایشیِ بدون اتصال به مدل هوش مصنوعی است.",
        "پیام شما دریافت و قالب آن بررسی شد، اما این پاسخ تحلیل حقوقی یا پاسخ تولیدشده توسط مدل نیست.",
        "برای حفظ محرمانگی، اطلاعات هویتی، شماره پرونده یا تصویر اسناد را در این محیط عمومی ارسال نکنید.",
      ].filter(Boolean).join("\n\n"),
      usage: null,
      provider: "mock",
    };
  },
});

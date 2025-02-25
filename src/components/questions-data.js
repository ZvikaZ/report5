//TODO upload to DB
//TODO km and hours shouldnt decrease, unless warning issued

export const questionsData = {
  screens: [
    {
      screen: "כללי",
      questions: [
        {
          type: "select",
          text: "צ. הטנק",
          options: ["425", "417", "191", "401", "435"],
        },
        { type: "text", text: "שילוט" },
        { type: "number", text: 'שע"מ' },
        { type: "number", text: 'ק"מ' },
        { type: "number", text: "סולר" },
      ],
    },
    {
      screen: "מזון",
      questions: [
        { type: "number", text: "מים (ג'ריקנים)", description: "תקן: 2" },
        { type: "number", text: "מים (שישיות)", description: "תקן: 3" },
        { type: "number", text: 'מנ"קים', description: "תקן: 2" },
      ],
    },
    {
      screen: "תחמושת",
      questions: [
        {
          type: "number",
          text: "חלול 1 (ישראלי)",
          description: "כמות פגזים בטנק",
        },
        {
          type: "number",
          text: "חלול 3 (אמריקאי)",
          description: "כמות פגזים בטנק",
        },
        {
          type: "number",
          text: "חצב",
          description: "כמות פגזים בטנק",
        },
        {
          type: "number",
          text: "ברוס מאג 7.62",
          description: "כמות ברוסים בטנק, כולל משורשר",
        },
        {
          type: "number",
          text: "כדורי 0.5",
          description: "כמות כדורי 0.5 בטנק (ברוס מכיל 100)",
        },
        {
          type: "number",
          text: "רימוני רסס",
          description: "נא לספור היטב!!!",
        },
      ],
    },
    {
      screen: "שצל",
      questions: [
        {
          type: "number",
          text: "שצל: חלול 1 (ישראלי)",
          description: "כמה נורו ב 24 שעות האחרונות",
        },
        {
          type: "number",
          text: "שצל: חלול 3 (אמריקאי)",
          description: "כמה נורו ב 24 שעות האחרונות",
        },
        {
          type: "number",
          text: "שצל: חצב",
          description: "כמה נורו ב 24 שעות האחרונות",
        },
        {
          type: "number",
          text: "שצל: ברוס מאג 7.62",
          description: "כמה נורו ב 24 שעות האחרונות",
        },
        {
          type: "number",
          text: "שצל: כדורי 0.5",
          description: "כמה נורו ב 24 שעות האחרונות",
        },
        {
          type: "number",
          text: "שצל: רימוני רסס",
          description: "כמה נורו ב 24 שעות האחרונות",
        },
      ],
    },
    {
      screen: "תקלות חימוש",
      questions: [
        {
          type: "issues",
          topic: "תקלות חימוש",
          singleIssue: "תקלת חימוש",
        },
      ],
    },
    {
      screen: "תקלות קשר",
      questions: [
        {
          type: "boolean",
          text: "כשירות (GPS)",
          color: "green",
        },
        {
          type: "boolean",
          text: "קישוריות (WIFI)",
          color: "green",
        },
        {
          type: "issues",
          topic: "תקלות קשר",
          singleIssue: "תקלת קשר",
        },
      ],
    },
    {
      screen: "ציוד (כמה יש)",
      questions: [
        { type: "boolean", text: "ערכת עזרה ראשונה" },
        { type: "boolean", text: 'פק"ל היגיינה' },
        { type: "number", text: "סוללות פטמה", description: "תקן: 2" },
        { type: "number", text: "סוללות AA", description: "תקן: 1" },
        { type: "number", text: "סוללות AAA", description: "תקן: 1" },
        { type: "number", text: "שמן 2640", description: "תקן: 2" },
        { type: "number", text: "שמן 2510", description: "תקן: 2" },
        { type: "number", text: "שמן 9040", description: "תקן: 1" },
        { type: "number", text: "שמן 9105", description: "תקן: 1" },
        { type: "number", text: "חוליות", description: "תקן: 5" },
        { type: "number", text: "פינים", description: "תקן: 10" },
        { type: "number", text: "טבעות", description: "תקן: 20" },
        { type: "long-text", text: "פערי זיווד" },
        { type: "long-text", text: "חוסרים נוספים" },
      ],
    },
    {
      screen: "וידוא צלמים",
      questions: [
        { type: "boolean", text: "משקפת" },
        { type: "boolean", text: "מצפן" },
        { type: "number", text: "צ. מיקרון" },
        { type: "number", text: "צ. בורסייט" },
        { type: "number", text: "צ. וילון" },
        { type: "number", text: "צ. מאג מפקד + קנספ" },
        { type: "number", text: "צ. מאג טען + קנספ" },
        { type: "number", text: "צ. מאג מקביל + קנספ" },
        { type: "number", text: 'צ. מק"כ (0.5)' },
      ],
    },
    {
      screen: "וידוא צלמי קשר",
      questions: [
        { type: "number", text: "מדיה" },
        { type: "number", text: "מגן מכלול" },
        { type: "number", text: "מבן" },
        { type: "number", text: "מסך CF" },
        { type: "number", text: "כרטיס" },
        { type: "number", text: "אולר" },
        { type: "number", text: "נר לילה", description: "(חלק מהטנקים)" },
        { type: "number", text: 'סל"צ (אדום)', description: "(חלק מהטנקים)" },
        { type: "number", text: "אלעד ירוק", description: "(חלק מהטנקים)" },
        { type: "number", text: "מדיה אלעד", description: "(חלק מהטנקים)" },
        { type: "number", text: "מ.ק. 710", description: "(חלק מהטנקים)" },
      ],
    },
    {
      screen: "הערות",
      questions: [{ type: "long-text", text: "הערות" }],
    },
  ],
};

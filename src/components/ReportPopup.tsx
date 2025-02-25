import React from "react";
import { Modal, Text, ScrollArea, Button, Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";

function generateReport(answers) {
  const myBool = (val) => (val ? "V" : "X");
  return `
דוח 5, פורמט פר כלי
צ': ${answers["צ. הטנק"]}
שילוט: ${answers["שילוט"]}
כשירות (GPS): ${myBool(answers["כשירות (GPS)"])}
קישוריות (WIFI): ${myBool(answers["קישוריות (WIFI)"])}
שע"מ: ${answers['שע"מ']}
ק"מ: ${answers['ק"מ']}
סולר: ${answers["סולר"]}
מים: 
${answers["מים (ג'ריקנים)"]}/2 ג'ריקנים
${answers["מים (שישיות)"]}/3 שישיות
אוכל (מנקים): ${answers['מנ"קים']}/2

תחמושת:
חלול 1 (ישראלי) - ${answers["חלול 1 (ישראלי)"]}
חלול 3 (אמריקאי) - ${answers["חלול 3 (אמריקאי)"]}
חצב - ${answers["חצב"]}

ברוס מאג 7.62 - ${answers["ברוס מאג 7.62"]}
כדורי 0.5 - ${answers["כדורי 0.5"]}
רימוני רסס - ${answers["רימוני רסס"]}

שצל:
שצל: חלול 1 (ישראלי) - ${answers["שצל: חלול 1 (ישראלי)"]}
שצל: חלול 3 (אמריקאי) - ${answers["שצל: חלול 3 (אמריקאי)"]}
שצל: חצב - ${answers["שצל: חצב"]}

שצל: ברוס מאג 7.62 - ${answers["שצל: ברוס מאג 7.62"]}
שצל: כדורי 0.5 - ${answers["שצל: כדורי 0.5"]}
שצל: רימוני רסס - ${answers["שצל: רימוני רסס"]}

סוללות/אנרגיה:
${answers["סוללות פטמה"]}/2 סוללות פטמה
${answers["סוללות AA"]}/1 טריפל איי
${answers["סוללות AAA"]}/1 דאבל איי

תקלות חימוש:
${answers["תקלות חימוש"]?.map((item) => "- " + item.failure).join("\n") || ""}

תקלות קשר:
${answers["תקלות קשר"]?.map((item) => "- " + item.failure).join("\n") || ""}

פערים/חוסרים ודרישות:

ערכת עזרה ראשונה - ${myBool(answers["ערכת עזרה ראשונה"])} 
פק"ל היגיינה - ${myBool(answers['פק"ל היגיינה'])}
פק"ל שמנים:
2640 – ${answers["שמן 2640"]}/2
2510 – ${answers["שמן 2510"]}/2
9040 – ${answers["שמן 9040"]}/1
9105 – ${answers["שמן 9105"]}/1

ח"ח:
חוליות – ${answers["חוליות"]}/5
פינים – ${answers["פינים"]}/10
טבעות – ${answers["טבעות"]}/0

פערי זיווד: ${answers["פערי זיווד"] || "-"}
חוסרים נוספים: ${answers["חוסרים נוספים"] || "-"}

ווידוא צלמים -
משקפת (יש/אין): ${myBool(answers["משקפת"])}
מצפן (יש/אין): ${myBool(answers["מצפן"])}
עכבר/מיקרון:${answers["צ. מיקרון"]}
בורסייט : ${answers["צ. בורסייט"]}
וילון: ${answers["צ. וילון"]}
מאג מפקד+ ק: ${answers["צ. מאג מפקד + קנספ"]}
מאג טען+ ק: ${answers["צ. מאג טען + קנספ"]}
מאג מקביל+ ק: ${answers["צ. מאג מקביל + קנספ"]}
מק״ג 0.5: ${answers['צ. מק"כ (0.5)']}

צלם קשר -
מדיה: ${answers["מדיה"]}
מגן מכלול : ${answers["מגן מכלול"]}
מבן: ${answers["מבן"]}
מסך CF: ${answers["מסך CF"]}
כרטיס: ${answers["כרטיס"]}
אולר: ${answers["אולר"]}
(מכאן עד הסוף אין לכולם)
נר לילה: ${answers["נר לילה"]}
סל"צ (אדום): ${answers['סל"צ (אדום)']}
אלעד ירוק: ${answers["אלעד ירוק"]}
מדיה אלעד: ${answers["מדיה אלעד"]}
מ.ק. 710: ${answers["מ.ק. 710"]}

תחמושת גניבה:
* רימוני רסס (כמות) - ${answers["רימוני רסס"]}

הערות:
${answers["הערות"] || ""}

  `.trim();
}

function ReportPopup({ answers, onFinishClick, showButton }) {
  const [opened, { open, close }] = useDisclosure(false);

  const reportContent = generateReport(answers);

  const handleCopy = () => {
    navigator.clipboard
      .writeText(reportContent)
      .then(() => {
        notifications.show({
          title: "הועתק",
          message: "הטקסט הועתק ללוח",
          color: "green",
        });
      })
      .catch(() => {
        notifications.show({
          title: "שגיאה",
          message: "לא ניתן להעתיק את הטקסט",
          color: "red",
        });
      });
  };

  return (
    <>
      {showButton && <Button onClick={open}>סיים</Button>}
      <Modal
        opened={opened}
        onClose={() => {
          onFinishClick();
          close();
        }}
        title="דוח לדוגמה"
        size="lg"
        scrollAreaComponent={ScrollArea}
        styles={{
          body: {
            maxHeight: "600px",
          },
        }}
      >
        <Button onClick={handleCopy} variant="outline">
          העתק ללוח
        </Button>
        <Text
          style={{
            whiteSpace: "pre-wrap",
            direction: "rtl",
            textAlign: "right",
            fontFamily: "monospace",
            marginBottom: "1rem",
          }}
        >
          {reportContent}
        </Text>
        <Button onClick={handleCopy} variant="outline">
          העתק ללוח
        </Button>
      </Modal>
    </>
  );
}

export { ReportPopup };

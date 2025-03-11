import { useEffect, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { differenceInCalendarDays } from "date-fns";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig.ts";
import { questionsData } from "./questions-data.js";
import { AG_GRID_LOCALE_IL } from "@ag-grid-community/locale";
import { AgChartsEnterpriseModule } from "ag-charts-enterprise";
import {
  CellSelectionModule,
  ClipboardModule,
  ColumnMenuModule,
  ContextMenuModule,
  ExcelExportModule,
  IntegratedChartsModule,
  SetFilterModule,
} from "ag-grid-enterprise";
import {
  ClientSideRowModelModule,
  ModuleRegistry,
  ValidationModule,
  themeQuartz,
} from "ag-grid-community";

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  ClipboardModule,
  ExcelExportModule,
  ColumnMenuModule,
  ContextMenuModule,
  CellSelectionModule,
  IntegratedChartsModule.with(AgChartsEnterpriseModule),
  SetFilterModule,
  ValidationModule /* Development Only */,
]);

const myTheme = themeQuartz.withParams({
  spacing: 4,
});

// Function for gradual red: lower value = more red, higher value = less red
const getGradualRedStyle = (value, min, max) => {
  if (value == null) return {};
  const clampedValue = Math.max(min, Math.min(max, value));
  const intensity = 1 - (clampedValue - min) / (max - min); // 1 at min (red), 0 at max (white)
  return {
    backgroundColor: `rgba(255, 0, 0, ${intensity})`,
    display: "inline-block",
    padding: "0 4px",
  };
};

const redColorRanges = {
  timestamp: {
    min: 0,
    max: 2,
    getValue: (params) =>
      2 - differenceInCalendarDays(new Date(), params.value?.toDate()), // Invert: today = 2 (white), 2 days ago = 0 (red)
  },
  סולר: {
    min: 0,
    max: 1400,
    getValue: (params) => params.value,
  },
  מים: {
    min: 0,
    max: 2 * 20 + 2 * 1.5, // 43 liters
    getValue: (params) => {
      const jerrycans = params.data?.["מים (ג'ריקנים)"] || 0;
      const sixPacks = params.data?.["מים (שישיות)"] || 0;
      return jerrycans * 20 + sixPacks * 1.5;
    },
  },
  'מנ"קים': {
    min: 0,
    max: 2,
    getValue: (params) => params.value,
  },
  סוללות: {
    min: 0,
    max: 4, // 1 (AA) + 1 (AAA) + 2 (פטמה)
    getValue: (params) => {
      const aa = params.data?.["סוללות AA"] || 0;
      const aaa = params.data?.["סוללות AAA"] || 0;
      const pitma = params.data?.["סוללות פטמה"] || 0;
      return aa + aaa + pitma; // Total count for coloring
    },
  },
  שמנים: {
    min: 0,
    max: 6, // 2 (2510) + 2 (2640) + 1 (9040) + 1 (9105)
    getValue: (params) => {
      const oil2510 = params.data?.["שמן 2510"] || 0;
      const oil2640 = params.data?.["שמן 2640"] || 0;
      const oil9040 = params.data?.["שמן 9040"] || 0;
      const oil9105 = params.data?.["שמן 9105"] || 0;
      return oil2510 + oil2640 + oil9040 + oil9105; // Total count for coloring
    },
  },
  חח: {
    min: 0,
    max: 5 + 10 + 20,
    getValue: (params) =>
      params.data?.["חוליות"] + params.data?.["פינים"] + params.data?.["טבעות"],
  },
  פקלים: {
    min: 0,
    max: 2,
    getValue: (params) =>
      params.data?.["ערכת עזרה ראשונה"] + params.data?.['פק"ל היגיינה'],
  },
  תחמושת: {
    min: 0,
    // we color only according to few ammo items //TODO make that also generic
    max: 39 + 100,
    getValue: (params) =>
      // params.data["חלול 1 (ישראלי)"] +
      // params.data["חלול 3 (אמריקאי)"] +
      // params.data["חצב"] +
      Math.min(39, params.data["ברוס מאג 7.62"]) +
      Math.min(100, params.data["כדורי 0.5"]),
    // params.data["רימוני רסס"],
  },
  "כשירות וקישוריות": {
    min: 0,
    max: 2,
    getValue: (params) => {
      const gps = params.data?.["כשירות (GPS)"] ? 1 : 0;
      const wifi = params.data?.["קישוריות (WIFI)"] ? 1 : 0;
      return gps + wifi;
    },
  },
};

const GeneralReport = ({ onFirstDataRendered }) => {
  const [rowData, setRowData] = useState([]);

  const defaultColDef = {
    wrapText: true,
    autoHeight: true,
    sortable: true,
    filter: true,
    cellStyle: (params) => {
      const field = params.colDef.field;
      if (redColorRanges[field]) {
        const { min, max, getValue } = redColorRanges[field];
        const value = getValue(params);
        return { ...getGradualRedStyle(value, min, max), whiteSpace: "pre" };
      }
      return { whiteSpace: "pre" };
    },
  };

  const issueCellRenderer = (params) => {
    if (!params.value || params.value.length === 0) {
      return "";
    }

    const today = new Date();

    return params.value.map((issue) => {
      // Get creation date
      const creationDate =
        typeof issue.creationDate.toDate === "function"
          ? issue.creationDate.toDate()
          : new Date(issue.creationDate.seconds * 1000);

      const daysSince = differenceInCalendarDays(today, creationDate) + 1;

      // TODO use getGradualRedStyle instead
      // Calculate intensity: 0 (white) at 1 day, 1 (red) at tooMuchDays, stays at 1 beyond tooMuchDays
      const tooMuchDays = 28;
      const intensity = Math.min(1, (daysSince - 1) / (tooMuchDays - 1));

      // Apply gradual red background
      const style = {
        backgroundColor: `rgba(255, 0, 0, ${intensity})`,
        display: "block",
        padding: "2px 4px",
        margin: "1px 0",
      };

      return issue.failure ? (
        <div key={issue.failure + issue.creationDate} style={style}>
          {issue.failure}{" "}
          <span
            style={{
              fontStyle: "italic",
              fontSize: "0.95em",
            }}
          >
            [{daysSince} ימים]
          </span>
        </div>
      ) : (
        ""
      );
    });
  };

  const [columnDefs] = useState([
    { field: "tankId", headerName: "טנק", pinned: "right" },
    {
      field: "timestamp",
      headerName: "תאריך",
      filter: "agDateColumnFilter",
      valueFormatter: (params) => {
        if (!params.value) return "N/A";
        const date = params.value.toDate();
        return date.toLocaleString("he-IL", {
          dateStyle: "short",
          timeStyle: "short",
        });
      },
    },
    {
      field: "userDisplayName",
      headerName: "מגיש הדוח",
    },
    { field: "שילוט" },
    { field: 'שע"מ', filter: "agNumberColumnFilter" },
    { field: 'ק"מ', filter: "agNumberColumnFilter" },
    { field: "סולר", filter: "agNumberColumnFilter" },
    {
      field: "מים",
      valueGetter: (params) => {
        const jerrycans = params.data?.["מים (ג'ריקנים)"] || 0;
        const sixPacks = params.data?.["מים (שישיות)"] || 0;
        return `ג'ריקנים: ${jerrycans}\nשישיות: ${sixPacks}`;
      },
      // No need for cellStyle here since defaultColDef handles it
    },
    { field: 'מנ"קים', filter: "agNumberColumnFilter" },
    {
      field: "סוללות",
      valueGetter: (params) => {
        const aa = params.data?.["סוללות AA"] || 0;
        const aaa = params.data?.["סוללות AAA"] || 0;
        const pitma = params.data?.["סוללות פטמה"] || 0;
        return `אצבע: ${aa}\nטריפל איי: ${aaa}\nפטמה: ${pitma}`; //TODO write AA and AAA, and have normal RTL text
      },
    },
    {
      field: "שמנים",
      valueGetter: (params) => {
        const oil2510 = params.data?.["שמן 2510"] || 0;
        const oil2640 = params.data?.["שמן 2640"] || 0;
        const oil9040 = params.data?.["שמן 9040"] || 0;
        const oil9105 = params.data?.["שמן 9105"] || 0;
        return `2510: ${oil2510}\n2640: ${oil2640}\n9040: ${oil9040}\n9105: ${oil9105}`;
      },
    },
    {
      field: "חח",
      valueGetter: (params) =>
        `חוליות: ${params.data?.["חוליות"] || 0}\nפינים: ${params.data?.["פינים"] || 0}\nטבעות: ${params.data?.["טבעות"] || 0}`,
    },

    {
      field: "פקלים",
      valueGetter: (params) =>
        `ערכת עזרה ראשונה: ${params.data?.["ערכת עזרה ראשונה"] ? "✓" : "✗"}\nפק"ל היגיינה: ${params.data?.['פק"ל היגיינה'] ? "✓" : "✗"}`,
    },
    { field: "פערי זיווד" },
    { field: "חוסרים נוספים" },
    {
      field: "תחמושת",
      valueGetter: (params) =>
        [
          `חלול 1\t:\t${params.data["חלול 1 (ישראלי)"]}`,
          `חלול 3\t:\t${params.data["חלול 3 (אמריקאי)"]}`,
          `חצב\t\t:\t${params.data["חצב"]}`, // Extra tab for חצב
          `מאג 7.62\t:\t${params.data["ברוס מאג 7.62"]}`,
          `כדורי 0.5\t:\t${params.data["כדורי 0.5"]}`,
          `רימוני רסס :\t${params.data["רימוני רסס"]}`, // One less tab for רימוני רסס
        ].join("\n"),
    },
    {
      field: "תקלות חימוש",
      cellRenderer: issueCellRenderer,
      valueFormatter: (params) =>
        params.value.map((issue) => issue.failure).join("\n"),
    },
    {
      field: "כשירות וקישוריות",
      valueGetter: (params) => {
        const gps = params.data?.["כשירות (GPS)"] ? "✓" : "✗";
        const wifi = params.data?.["קישוריות (WIFI)"] ? "✓" : "✗";
        return `כשירות (GPS): ${gps}\nקישוריות (WIFI): ${wifi}`;
      },
    },
    {
      field: "תקלות קשר",
      cellRenderer: issueCellRenderer,
      valueFormatter: (params) =>
        params.value.map((issue) => issue.failure).join("\n"),
    },

    // keep this last
    { field: "הערות" },
  ]);

  const tankIds = questionsData.screens
    .find((screen) => screen.screen === "כללי")
    .questions.find((q) => q.text === "צ. הטנק").options;

  // Fetch latest status for each tankId and user display names
  useEffect(() => {
    const fetchData = async () => {
      const promises = tankIds.map(async (tankId) => {
        const q = query(
          collection(db, "tankStatus"),
          where("tankId", "==", tankId),
          orderBy("timestamp", "desc"),
          limit(1),
        );
        const snapshot = await getDocs(q);
        if (snapshot.docs.length === 0) {
          return { tankId, timestamp: null };
        }

        const tankData = snapshot.docs[0].data();
        let userDisplayName = tankData.user;

        // Fetch display name from allowedEmails using document ID
        if (tankData.user) {
          const userDocRef = doc(db, "allowedEmails", tankData.user);
          const userDoc = await getDoc(userDocRef);
          userDisplayName = userDoc.exists()
            ? userDoc.data().displayedName
            : tankData.user;
        }

        return { tankId, ...tankData, userDisplayName };
      });

      const results = await Promise.all(promises);
      console.log("Firestore data:", results);
      const filteredResults = results.filter(
        (result) => result.timestamp !== null,
      );
      setRowData(filteredResults);
    };

    fetchData();
  }, [tankIds]);

  const restoreColumnsState = (params) => {
    const savedState = localStorage.getItem("GeneralReportColumnState");
    console.log("restoring");
    if (savedState) {
      const columnState = JSON.parse(savedState);
      params.api.applyColumnState({
        state: columnState,
        applyOrder: true,
      });
    }
  };

  const saveColumnsState = (event) => {
    console.log("saving", event);
    const columnState = event.api.getColumnState();
    localStorage.setItem(
      "GeneralReportColumnState",
      JSON.stringify(columnState),
    );
  };

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        localeText={AG_GRID_LOCALE_IL}
        enableRtl={true}
        theme={myTheme}
        onFirstDataRendered={onFirstDataRendered}
        onColumnVisible={saveColumnsState}
        onColumnMoved={saveColumnsState}
        onGridReady={restoreColumnsState}
        cellSelection={true}
        suppressSetFilterByDefault={true} //TODO remove this, and fix set filter
      />
    </div>
  );
};

export { GeneralReport };

import { LicenseManager } from "ag-grid-enterprise";
Object.assign(LicenseManager.prototype, {
  validateLicense: () => true,
  isDisplayWatermark: () => false,
});

import { useEffect, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { subDays, isBefore, differenceInDays } from "date-fns";
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
  spacing: 8,
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
      2 - differenceInDays(new Date(), params.value?.toDate()), // Invert: today = 2 (white), 2 days ago = 0 (red)
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
};

const ShowReport = () => {
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

  const [columnDefs] = useState([
    { field: "tankId", headerName: "טנק" },
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
      headerName: "מים",
      filter: "agNumberColumnFilter",
      valueGetter: (params) => {
        const jerrycans = params.data?.["מים (ג'ריקנים)"] || 0;
        const sixPacks = params.data?.["מים (שישיות)"] || 0;
        return `ג'ריקנים: ${jerrycans}\nשישיות: ${sixPacks}`;
      },
      // No need for cellStyle here since defaultColDef handles it
    },
    { field: 'מנ"קים', filter: "agNumberColumnFilter" },
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

  const onFirstDataRendered = (params) => {
    params.api.autoSizeAllColumns();
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
      />
    </div>
  );
};

export { ShowReport };

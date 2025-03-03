import { LicenseManager } from "ag-grid-enterprise";
Object.assign(LicenseManager.prototype, {
  validateLicense: () => true,
  isDisplayWatermark: () => false,
});

import { useEffect, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { subDays, isBefore } from "date-fns";
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

const ShowReport = () => {
  const [rowData, setRowData] = useState([]);

  const defaultColDef = {
    wrapText: true,
    autoHeight: true,
    sortable: true,
    filter: true,
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
      // Apply lighter red background to dates from yesterday or earlier
      cellStyle: (params) =>
        params.value && isBefore(params.value.toDate(), subDays(new Date(), 1))
          ? {
              backgroundColor: "#ff9999",
              display: "inline-block",
              padding: "0 4px",
            }
          : {},
    },
    {
      field: "userDisplayName",
      headerName: "מגיש הדוח",
    },
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

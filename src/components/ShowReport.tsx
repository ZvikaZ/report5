import { LicenseManager } from "ag-grid-enterprise";
Object.assign(LicenseManager.prototype, {
  validateLicense: () => true,
  isDisplayWatermark: () => false,
});

import { useEffect, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
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
} from "ag-grid-enterprise";
import {
  ClientSideRowModelModule,
  ModuleRegistry,
  ValidationModule,
} from "ag-grid-community";

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  ClipboardModule,
  ExcelExportModule,
  ColumnMenuModule,
  ContextMenuModule,
  CellSelectionModule,
  IntegratedChartsModule.with(AgChartsEnterpriseModule),
  ValidationModule /* Development Only */,
]);

const ShowReport = () => {
  const [rowData, setRowData] = useState([]);
  const [columnDefs] = useState([
    { field: "tankId", headerName: "צ. טנק" },
    {
      field: "timestamp",
      headerName: "תאריך",
      valueFormatter: (params) => {
        if (!params.value) return "N/A";
        const date = params.value.toDate();
        return date.toLocaleString("he-IL", {
          dateStyle: "short",
          timeStyle: "short",
        });
      },
    },
  ]);

  const defaultColDef = {
    wrapText: true,
    autoHeight: true,
    sortable: true,
  };

  const tankIds = questionsData.screens
    .find((screen) => screen.screen === "כללי")
    .questions.find((q) => q.text === "צ. הטנק").options;

  // Fetch latest status for each tankId
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
        return snapshot.docs.length > 0
          ? { tankId, ...snapshot.docs[0].data() }
          : { tankId, timestamp: null };
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

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        localeText={AG_GRID_LOCALE_IL}
        enableRtl={true}
      />
    </div>
  );
};

export { ShowReport };

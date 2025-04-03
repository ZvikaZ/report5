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
  Timestamp,
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
import { TimeNavigation } from "./TimeNavigation";
import { useTimeNavigation } from "../hooks/useTimeNavigation";

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

const fullTank = 1400;

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
  neededFuel: {
    min: 0,
    max: 1400,
    getValue: (params) => fullTank - (params.data.neededFuel ?? params.value),
  },
};

const FuelReport = ({ onFirstDataRendered }) => {
  const [rowData, setRowData] = useState([]);
  const [latestTimestamp, setLatestTimestamp] = useState<Timestamp | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Use the time navigation hook
  const {
    currentTimestamp,
    currentDate,
    goToTimestamp,
    goToDate,
    goToPrevChange,
    goToNextChange,
    goToPrevDay,
    goToNextDay,
    goToCurrent,
    canGoPrevChange,
    canGoNextChange,
    canGoPrevDay,
    canGoNextDay,
    isAtLatest,
  } = useTimeNavigation();

  const defaultColDef = {
    wrapText: true,
    autoHeight: true,
    sortable: true,
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
    {
      field: "tankId",
      headerName: "טנק",
      valueFormatter: (params) => {
        if (params.data?.isSummary) return "סיכום";
        return params.value;
      },
    },
    {
      field: "timestamp",
      headerName: "תאריך",
      valueFormatter: (params) => {
        if (!params.value || params.data?.isSummary) return "";
        const date = params.value.toDate();
        return date.toLocaleString("he-IL", {
          dateStyle: "short",
          timeStyle: "short",
        });
      },
    },
    {
      field: "סולר",
      headerName: "כמה סולר יש",
      valueFormatter: (params) => {
        if (params.data?.isSummary) return ""; // Leave blank for summary row
        return params.value;
      },
    },
    {
      field: "neededFuel",
      headerName: "כמה סולר חסר",
      valueGetter: (params) => {
        return params.data.neededFuel ?? fullTank - params.data["סולר"];
      },
    },
  ]);

  const tankIds = questionsData.screens
    .find((screen) => screen.screen === "כללי")
    .questions.find((q) => q.text === "צ. הטנק").options;

  // Fetch latest status for each tankId and calculate summary
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const promises = tankIds.map(async (tankId) => {
        let q;
        
        if (currentTimestamp) {
          // If we have a specific timestamp, fetch data at that time
          q = query(
            collection(db, "tankStatus"),
            where("tankId", "==", tankId),
            where("timestamp", "<=", currentTimestamp),
            orderBy("timestamp", "desc"),
            limit(1),
          );
        } else {
          // Otherwise, fetch the latest data
          q = query(
            collection(db, "tankStatus"),
            where("tankId", "==", tankId),
            orderBy("timestamp", "desc"),
            limit(1),
          );
        }
        
        const snapshot = await getDocs(q);
        if (snapshot.docs.length === 0) {
          return { tankId, timestamp: null };
        }

        const tankData = snapshot.docs[0].data();
        return { tankId, ...tankData };
      });

      const results = await Promise.all(promises);
      console.log("Firestore data:", results);
      const filteredResults = results.filter(
        (result) => result.timestamp !== null,
      );

      // Update the latest timestamp if we're fetching current data
      if (!currentTimestamp && filteredResults.length > 0) {
        // Find the most recent timestamp among all results
        let maxTimestamp = filteredResults[0].timestamp;
        filteredResults.forEach(result => {
          if (result.timestamp && (!maxTimestamp || result.timestamp.seconds > maxTimestamp.seconds)) {
            maxTimestamp = result.timestamp;
          }
        });
        
        if (maxTimestamp) {
          setLatestTimestamp(maxTimestamp);
          // Initialize time navigation with the latest timestamp
          goToTimestamp(maxTimestamp);
        }
      }

      // Calculate total missing fuel
      const totalMissingFuel = filteredResults.reduce((sum, row) => {
        const missingFuel = fullTank - (row["סולר"] || 0);
        return sum + missingFuel;
      }, 0);

      // Add summary row
      const summaryRow = {
        isSummary: true,
        tankId: "סיכום",
        timestamp: null,
        סולר: null, // Leave blank for summary row
        neededFuel: totalMissingFuel,
      };
      console.log({ totalMissingFuel, summaryRow });

      setRowData([...filteredResults, summaryRow]);
      setIsLoading(false);
    };

    fetchData();
  }, [tankIds, currentTimestamp, goToTimestamp]);

  // Custom styling for the summary row
  const getRowStyle = (params) => {
    if (params.data && params.data.isSummary) {
      return {
        fontWeight: "bold",
        backgroundColor: "#f2f2f2",
        borderTop: "2px solid #999",
        fontSize: "1.1em",
      };
    }
    return null;
  };

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <TimeNavigation
        onPrevChange={goToPrevChange}
        onNextChange={goToNextChange}
        onPrevDay={goToPrevDay}
        onNextDay={goToNextDay}
        onCurrent={goToCurrent}
        canGoPrevChange={canGoPrevChange}
        canGoNextChange={canGoNextChange}
        canGoPrevDay={canGoPrevDay}
        canGoNextDay={canGoNextDay}
        isAtLatest={isAtLatest}
        currentDate={currentDate}
        isLoading={isLoading}
      />
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        localeText={AG_GRID_LOCALE_IL}
        enableRtl={true}
        theme={myTheme}
        getRowStyle={getRowStyle}
        cellSelection={true}
        onFirstDataRendered={onFirstDataRendered}
      />
    </div>
  );
};

export { FuelReport };

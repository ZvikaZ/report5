import { useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig.ts";
import { questionsData } from "./questions-data.js";
import { AG_GRID_LOCALE_IL } from "@ag-grid-community/locale";
import { endOfDay, subDays, differenceInCalendarDays, startOfDay } from "date-fns";
import { themeQuartz } from "ag-grid-community";
import { TimeNavigation } from "./TimeNavigation";
import { useTimeNavigation } from "../hooks/useTimeNavigation";

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
};

const ScreenReport = ({
  onFirstDataRendered,
  screenName,
  showSummary = false,
}) => {
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
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

  // Extract tankIds from questionsData
  const tankIds =
    questionsData.screens
      .flatMap((screen) => screen.questions)
      .find((question) => question.text === "צ. הטנק")?.options || [];

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const results = [];

      for (const tankId of tankIds) {
        let latestQuery;
        
        if (currentTimestamp) {
          // If we have a specific time to show, fetch data up to that point
          latestQuery = query(
            collection(db, "tankStatus"),
            where("tankId", "==", tankId),
            where("timestamp", "<=", currentTimestamp),
            orderBy("timestamp", "desc"),
            limit(1),
          );
        } else {
          // Otherwise fetch the latest data
          latestQuery = query(
            collection(db, "tankStatus"),
            where("tankId", "==", tankId),
            orderBy("timestamp", "desc"),
            limit(1),
          );
        }
        
        const latestSnapshot = await getDocs(latestQuery);
        let latestData = null;
        latestSnapshot.forEach((doc) => {
          latestData = { tankId, ...doc.data() };
        });

        // For the "previous" data for comparison, always use data from the day before
        // the current timestamp or today if no timestamp is selected
        const comparisonDate = currentTimestamp 
          ? subDays(currentTimestamp.toDate(), 1)
          : subDays(new Date(), 1);
          
        const previousQuery = query(
          collection(db, "tankStatus"),
          where("tankId", "==", tankId),
          where("timestamp", "<=", endOfDay(comparisonDate)),
          orderBy("timestamp", "desc"),
          limit(1),
        );
        
        const previousSnapshot = await getDocs(previousQuery);
        let previousData = null;
        previousSnapshot.forEach((doc) => {
          previousData = { tankId, ...doc.data() };
        });

        if (latestData) {
          results.push({
            ...latestData,
            previous: previousData || {},
          });
        }
      }

      // Update the latest timestamp if we're fetching current data
      if (!currentTimestamp && results.length > 0) {
        // Find the most recent timestamp among all results
        let maxTimestamp = results[0].timestamp;
        results.forEach(result => {
          if (result.timestamp && (!maxTimestamp || result.timestamp.seconds > maxTimestamp.seconds)) {
            maxTimestamp = result.timestamp;
          }
        });
        
        if (maxTimestamp) {
          setLatestTimestamp(maxTimestamp);
          
          // Collect historical timestamps to populate history
          const timestamps = [...new Set(results
            .filter(result => result.timestamp)
            .map(result => result.timestamp))]
            .sort((a, b) => a.seconds - b.seconds);
          
          // Initialize time navigation with historical data
          if (timestamps.length > 0) {
            // Add timestamps to history in chronological order
            timestamps.forEach(ts => {
              goToTimestamp(ts);
            });
          }
        }
      }

      // Filter questions based on the provided screenName
      const screenData = questionsData.screens.find(
        (screen) => screen.screen === screenName,
      );
      if (!screenData) return;

      const columnDefs = [
        { field: "tankId", headerName: "צ. הטנק", pinned: "right" },
        {
          field: "timestamp",
          headerName: "תאריך",
          filter: "agDateColumnFilter",
          valueFormatter: (params) => {
            if (!params.value || params.data.isSummary || params.data.isAverage) return "";
            const date = params.value.toDate();
            return date.toLocaleString("he-IL", {
              dateStyle: "short",
              timeStyle: "short",
            });
          },
        },
        ...screenData.questions.map((q) => ({
          field: q.text,
          headerName: q.text,
          // Use valueGetter to handle fields with dots in their names (e.g., "צ. מיקרון").
          // AG-Grid interprets dots as nested paths by default, but our data uses flat keys with dots.
          valueGetter: (params) => params.data[q.text],
          cellRenderer: (params) => {
            if (params.data.isSummary || params.data.isAverage) {
              return params.data[q.text] !== undefined
                ? params.data[q.text]
                : "";
            }

            const latestValue = params.data[q.text];
            const previousValue = params.data.previous[q.text];

            const formatValue = (value) =>
              typeof value === "boolean" ? (value ? "✓" : "✗") : value;

            // Show changes in red if previous exists and value differs
            if (
              previousValue !== undefined &&
              latestValue !== previousValue &&
              !(latestValue === undefined && previousValue === null)
            ) {
              return (
                <span style={{ color: "red" }}>
                  ישן: {formatValue(previousValue)} | חדש:{" "}
                  {formatValue(latestValue)}
                </span>
              );
            }
            return formatValue(latestValue);
          },
        })),
      ];

      setColumnDefs(columnDefs);

      // Add summary and average rows if showSummary is true
      if (showSummary && results.length > 0) {
        // Create summary row
        const summaryRow = { tankId: "סיכום", isSummary: true };

        // Create average row
        const averageRow = { tankId: "ממוצע", isAverage: true };

        // Calculate summary and averages for each question
        screenData.questions.forEach((q) => {
          if (q.text === "צ. הטנק") return; // Skip tank ID field

          const fieldValues = results
            .map((item) => item[q.text])
            .filter((val) => val !== undefined);

          // For boolean fields
          if (typeof fieldValues[0] === "boolean") {
            const trueCount = fieldValues.filter((val) => val === true).length;
            summaryRow[q.text] = `${trueCount}/${fieldValues.length}`;
            averageRow[q.text] =
              `${Math.round((trueCount / fieldValues.length) * 100)}%`;
          }
          // For numeric fields
          else if (typeof fieldValues[0] === "number") {
            const sum = fieldValues.reduce((acc, val) => acc + val, 0);
            summaryRow[q.text] = sum;

            // Format average to show decimal only when necessary
            if (fieldValues.length > 0) {
              const avg = sum / fieldValues.length;
              // Check if it's a whole number
              if (Math.floor(avg) === avg) {
                // If whole number, don't show decimal
                averageRow[q.text] = Math.floor(avg);
              } else {
                // If has decimal, round to 1 decimal place
                averageRow[q.text] = avg.toFixed(1);
              }
            } else {
              averageRow[q.text] = "N/A";
            }
          }
          // For string fieldsno
          else if (typeof fieldValues[0] === "string") {
            const uniqueValues = [...new Set(fieldValues)];
            const valueCounts = uniqueValues.map((value) => {
              const count = fieldValues.filter((v) => v === value).length;
              return `${value}: ${count}`;
            });
            summaryRow[q.text] = valueCounts.join(", ");
            averageRow[q.text] = ""; // No average for string values
          }
        });

        // Add summary and average rows to results
        results.push(summaryRow, averageRow);
      }

      setRowData(results);
      setIsLoading(false);
    };

    fetchData();
  }, [screenName, tankIds, showSummary, currentTimestamp, goToTimestamp]);

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

  // Custom row styling function matching your existing implementation
  const getRowStyle = (params) => {
    if (params.data && (params.data.isSummary || params.data.isAverage)) {
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
        cellSelection={true}
        getRowStyle={getRowStyle}
        onFirstDataRendered={onFirstDataRendered}
      />
    </div>
  );
};

export { ScreenReport };

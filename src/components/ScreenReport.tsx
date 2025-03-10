import { useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebaseConfig.ts";
import { questionsData } from "./questions-data.js";
import { AG_GRID_LOCALE_IL } from "@ag-grid-community/locale";
import { endOfDay, subDays } from "date-fns";

const ScreenReport = ({ screenName }) => {
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);

  // Extract tankIds from questionsData
  const tankIds =
    questionsData.screens
      .flatMap((screen) => screen.questions)
      .find((question) => question.text === "צ. הטנק")?.options || [];

  useEffect(() => {
    const fetchData = async () => {
      const results = [];

      for (const tankId of tankIds) {
        // Fetch the latest record
        const latestQuery = query(
          collection(db, "tankStatus"),
          where("tankId", "==", tankId),
          orderBy("timestamp", "desc"),
          limit(1),
        );
        const latestSnapshot = await getDocs(latestQuery);
        let latestData = null;
        latestSnapshot.forEach((doc) => {
          latestData = { tankId, ...doc.data() };
        });

        // Fetch the previous record (latest from yesterday or before)
        const previousQuery = query(
          collection(db, "tankStatus"),
          where("tankId", "==", tankId),
          where("timestamp", "<=", endOfDay(subDays(new Date(), 1))),
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

      // Filter questions based on the provided screenName
      const screenData = questionsData.screens.find(
        (screen) => screen.screen === screenName,
      );
      if (!screenData) return;

      const columnDefs = [
        { field: "tankId", headerName: "צ. הטנק" },
        ...screenData.questions.map((q) => ({
          field: q.text,
          headerName: q.text,
          // Use valueGetter to handle fields with dots in their names (e.g., "צ. מיקרון").
          // AG-Grid interprets dots as nested paths by default, but our data uses flat keys with dots.
          valueGetter: (params) => params.data[q.text],
          cellRenderer: (params) => {
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

      setRowData(results);
      setColumnDefs(columnDefs);
    };

    fetchData();
  }, [screenName, tankIds]);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        localeText={AG_GRID_LOCALE_IL}
        enableRtl={true}
        cellSelection={true}
      />
    </div>
  );
};

export { ScreenReport };

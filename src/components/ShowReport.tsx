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

const ShowReport = () => {
  const [rowData, setRowData] = useState([]);
  const [columnDefs] = useState([
    { field: "tankId", headerName: "צ. טנק" },
    {
      field: "timestamp",
      headerName: "תאריך",
      valueFormatter: (params) => {
        if (!params.value) return "N/A";
        // Use Firestore's .toDate() to parse Timestamp
        const date = params.value.toDate();
        return date.toLocaleString("he-IL", {
          dateStyle: "short",
          timeStyle: "short",
        });
      },
    },
  ]);

  // Get tank IDs from questionsData
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
        const data =
          snapshot.docs.length > 0
            ? { tankId, ...snapshot.docs[0].data() }
            : { tankId, timestamp: null };
        return data;
      });

      const results = await Promise.all(promises);
      console.log("Firestore data:", results); // Log all fetched data
      // Filter out rows with null timestamp
      const filteredResults = results.filter(
        (result) => result.timestamp !== null,
      );
      setRowData(filteredResults);
    };

    fetchData();
  }, []);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        localeText={AG_GRID_LOCALE_IL}
        enableRtl={true}
      />
    </div>
  );
};

export { ShowReport };

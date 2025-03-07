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

const IdReport = ({ screenName }) => {
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

      // Fetch latest data for each tank ID
      for (const tankId of tankIds) {
        const q = query(
          collection(db, "tankStatus"),
          where("tankId", "==", tankId),
          orderBy("timestamp", "desc"),
          limit(1),
        );

        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          results.push({ tankId, ...data });
        });
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
          // Format boolean values as ✓ (true) or ✗ (false)
          cellRenderer: (params) => {
            if (typeof params.value === "boolean") {
              return params.value ? "✓" : "✗";
            }
            return params.value;
          },
        })),
      ];

      setRowData(results);
      setColumnDefs(columnDefs);
    };

    fetchData();
  }, [screenName]);

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

export { IdReport };

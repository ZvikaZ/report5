import { useEffect, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { AG_GRID_LOCALE_IL } from "@ag-grid-community/locale";
import { themeQuartz } from "ag-grid-community";
import { FirstDataRenderedEvent } from "ag-grid-community";

const db = getFirestore();

const myTheme = themeQuartz.withParams({
  spacing: 4,
});

function ShetzelReport({ onFirstDataRendered }: { onFirstDataRendered?: (params: FirstDataRenderedEvent) => void }) {
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const q = query(
        collection(db, "tankStatus"),
        orderBy("timestamp", "asc"),
      );
      const querySnapshot = await getDocs(q);

      const data = [];
      const shetzelFields = new Set();

      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        const timestamp = docData.timestamp.toDate();
        const dateStr = format(timestamp, "P", { locale: he });

        const row = { timestamp: dateStr, tankId: docData.tankId };
        Object.keys(docData).forEach((key) => {
          if (key.includes("שצל")) {
            shetzelFields.add(key);
            row[key] =
              docData[key] !== undefined && docData[key] !== null
                ? docData[key]
                : 0;
          }
        });

        const allZeros = Array.from(shetzelFields).every(
          (field) => row[field] === 0,
        );

        if (!allZeros) {
          data.push(row);
        }
      });

      // Filter columns: only include those with at least one non-zero value
      const nonZeroFields = Array.from(shetzelFields).filter((field) =>
        data.some((row) => row[field] !== 0),
      );

      // Calculate summary totals for each field
      const summaryRow = {
        timestamp: "סה״כ",
        tankId: "",
        isSummary: true, // Flag to identify the summary row
      };

      nonZeroFields.forEach((field) => {
        summaryRow[field] = data.reduce(
          (sum, row) => sum + (row[field] || 0),
          0,
        );
      });

      // Add the summary row to the end of the data
      setRowData([...data, summaryRow]);

      setColumnDefs([
        { headerName: "תאריך", field: "timestamp" },
        { headerName: "טנק", field: "tankId" },
        ...nonZeroFields.map((field) => ({
          headerName: field.replace("שצל: ", "").replace("שצל:", ""),
          field,
          valueGetter: (params) => params.data[field], // required because of fields with dot in the key
        })),
      ]);
    };

    fetchData();
  }, []);

  // Custom cell renderer to style the summary row
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
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        localeText={AG_GRID_LOCALE_IL}
        enableRtl={true}
        cellSelection={true}
        onFirstDataRendered={onFirstDataRendered}
        getRowStyle={getRowStyle}
        domLayout="autoHeight"
        theme={myTheme}
      />
    </div>
  );
}

export { ShetzelReport };

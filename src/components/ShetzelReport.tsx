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

const db = getFirestore();

function ShetzelReport() {
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

      setRowData(data);
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

  const onFirstDataRendered = (params) => {
    // params.api.autoSizeAllColumns();   //TODO doesnt work. why?
  };

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <h2>מידע שצל עד 6/3 כרגע חלקי</h2>
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        localeText={AG_GRID_LOCALE_IL}
        enableRtl={true}
        cellSelection={true}
        onFirstDataRendered={onFirstDataRendered}
      />
    </div>
  );
}

export { ShetzelReport };

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

      console.log(
        "Firestore result:",
        querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );

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

      console.log("Table rows:", data);
      setRowData(data);
      setColumnDefs([
        { headerName: "תאריך", field: "timestamp" },
        { headerName: "טנק", field: "tankId" },
        ...Array.from(shetzelFields).map((field) => ({
          headerName: field.replace("שצל: ", ""),
          field,
        })),
      ]);
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
}

export { ShetzelReport };

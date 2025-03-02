import React, { useState, useEffect, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { db } from "../firebaseConfig.ts";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { questionsData } from "./questions-data.js";

// Custom cell renderer for nested ag-grid tables
const NestedGridCellRenderer = (props) => {
  const columnDefs = [
    { field: "failure", headerName: "תקלה", maxWidth: 200 },
    {
      field: "fixed",
      headerName: "תוקן",
      maxWidth: 100,
      cellRenderer: (params) => (params.value ? "✓" : "✗"),
    },
    {
      field: "creationDate",
      headerName: "תאריך",
      maxWidth: 200,
      valueFormatter: (params) =>
        new Date(params.value.seconds * 1000).toLocaleString("he-IL"),
    },
  ];

  const rowData = props.value || [];

  return (
    <div style={{ width: "100%" }} className="ag-theme-alpine">
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        enableRtl={true}
        domLayout="autoHeight"
        onGridReady={(params) => params.api.sizeColumnsToFit()}
      />
    </div>
  );
};

const tankIds = questionsData.screens
  .find((screen) => screen.screen === "כללי")
  .questions.find((q) => q.text === "צ. הטנק").options;

export const ShowReport = () => {
  const [rowData, setRowData] = useState([]);
  const gridRef = useRef(null); // Ref to access grid API

  const groupedScreens = [
    "תחמושת",
    "ציוד (כמה יש)",
    "וידוא צלמים",
    "וידוא צלמי קשר",
  ];
  const groupedQuestions = groupedScreens.reduce((acc, screenName) => {
    const screen = questionsData.screens.find((s) => s.screen === screenName);
    if (screen) {
      acc[screenName] = screen.questions.map((q) => q.text);
    }
    return acc;
  }, {});

  const columnDefs = (() => {
    const columns = [
      { field: "tankId", headerName: "צ. הטנק", maxWidth: 150 },
      {
        field: "displayName",
        headerName: "שם המדווח",
        maxWidth: 200,
        wrapText: true,
      },
      {
        field: "timestamp",
        headerName: "תאריך",
        maxWidth: 200,
        cellStyle: (params) => {
          if (!params.value?.seconds) return { whiteSpace: "pre-wrap" };
          const date = new Date(params.value.seconds * 1000);
          const today = new Date();
          const diffTime = today - date;
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 0) {
            return { whiteSpace: "pre-wrap" };
          } else {
            const intensity = Math.min(diffDays, 5);
            const redValue = 255;
            const greenBlueValue = Math.max(255 - intensity * 51, 0);
            const color = `rgb(${redValue}, ${greenBlueValue}, ${greenBlueValue})`;
            return { whiteSpace: "pre-wrap", color };
          }
        },
        valueFormatter: (params) => {
          if (!params.value?.seconds) return "";
          const date = new Date(params.value.seconds * 1000);
          return `${date.toLocaleDateString("he-IL")}\n${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
        },
        wrapText: true,
      },
      {
        field: "מים",
        headerName: "מים",
        maxWidth: 200,
        cellStyle: { whiteSpace: "pre-wrap", direction: "rtl" },
        wrapText: true,
      },
    ];

    questionsData.screens.forEach((screen) => {
      if (screen.screen === "מזון") {
        screen.questions.forEach((question) => {
          if (
            question.text !== "מים (ג'ריקנים)" &&
            question.text !== "מים (שישיות)"
          ) {
            const colDef = {
              field: question.text,
              headerName: question.text,
              maxWidth: 200,
              wrapText: true,
            };
            if (question.type === "boolean") {
              colDef.cellRenderer = (params) => (
                <span style={{ color: params.value ? "#00FF00" : "red" }}>
                  {params.value ? "✓" : "✗"}
                </span>
              );
            }
            columns.push(colDef);
          }
        });
      } else if (groupedScreens.includes(screen.screen)) {
        columns.push({
          field: screen.screen,
          headerName: screen.screen,
          maxWidth: 300,
          cellStyle: { whiteSpace: "pre-wrap", direction: "rtl" },
          wrapText: true,
        });
      } else if (screen.screen !== "שצל") {
        screen.questions.forEach((question) => {
          if (question.text === "צ. הטנק") return;

          const colDef = {
            field: question.text,
            headerName: question.text,
            maxWidth: question.type === "issues" ? 400 : 200,
            wrapText: true,
          };
          if (question.type === "boolean") {
            colDef.cellRenderer = (params) => (
              <span style={{ color: params.value ? "#00FF00" : "red" }}>
                {params.value ? "✓" : "✗"}
              </span>
            );
          } else if (question.type === "issues") {
            colDef.cellRenderer = "nestedGridCellRenderer";
          }
          columns.push(colDef);
        });
      }
    });

    return columns;
  })();

  useEffect(() => {
    const fetchData = async () => {
      const reports = [];

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
          const processedData = { ...data };

          processedData["מים"] = [
            `• מים (ג'ריקנים): ${processedData["מים (ג'ריקנים)"] ?? ""}`,
            `• מים (שישיות): ${processedData["מים (שישיות)"] ?? ""}`,
          ].join("\n");

          Object.keys(groupedQuestions).forEach((screenName) => {
            processedData[screenName] = groupedQuestions[screenName]
              .map((q) => `• ${q}: ${processedData[q] ?? ""}`)
              .join("\n");
          });

          reports.push({ id: doc.id, ...processedData });
        });
      }

      setRowData(reports);
      // Auto-size columns after data is loaded
      if (gridRef.current?.api) {
        gridRef.current.api.autoSizeAllColumns();
      }
    };

    fetchData().catch(console.error);
  }, []);

  const onGridReady = (params) => {
    gridRef.current = params;
    params.api.autoSizeAllColumns(); // Initial sizing
  };

  return (
    <div style={{ height: "600px", width: "100%" }} className="ag-theme-alpine">
      <AgGridReact
        ref={gridRef}
        rowData={rowData}
        columnDefs={columnDefs}
        enableRtl={true}
        components={{
          nestedGridCellRenderer: NestedGridCellRenderer,
        }}
        autoHeight={true} // Rows expand to fit content
        defaultColDef={{
          resizable: true, // Optional: allows manual resizing
        }}
      />
    </div>
  );
};

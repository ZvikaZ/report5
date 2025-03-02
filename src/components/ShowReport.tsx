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
    { field: "failure", headerName: "תקלה", minWidth: 150, maxWidth: 300 },
    {
      field: "fixed",
      headerName: "תוקן",
      minWidth: 80,
      maxWidth: 150,
      cellRenderer: (params) => (params.value ? "✓" : "✗"),
    },
    {
      field: "creationDate",
      headerName: "תאריך",
      minWidth: 150,
      maxWidth: 300,
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
  const gridRef = useRef(null);

  const groupedScreens = ["תחמושת", "ציוד (כמה יש)"];
  const groupedQuestions = groupedScreens.reduce((acc, screenName) => {
    const screen = questionsData.screens.find((s) => s.screen === screenName);
    if (screen) {
      acc[screenName] = screen.questions.map((q) => q.text);
    }
    return acc;
  }, {});

  const columnDefs = (() => {
    const columns = [
      { field: "tankId", headerName: "צ. הטנק", minWidth: 80, maxWidth: 150 },
      {
        field: "displayName",
        headerName: "שם המדווח",
        minWidth: 150,
        maxWidth: 300,
        wrapText: true,
        autoHeight: true,
      },
      {
        field: "timestamp",
        headerName: "תאריך",
        minWidth: 120,
        maxWidth: 300,
        cellStyle: (params) => {
          if (!params.value?.seconds)
            return { whiteSpace: "pre-wrap", lineHeight: "1.2" };
          const date = new Date(params.value.seconds * 1000);
          const today = new Date();
          const diffTime = today - date;
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 0) {
            return { whiteSpace: "pre-wrap", lineHeight: "1.2" };
          } else {
            const intensity = Math.min(diffDays, 5);
            const redValue = 255;
            const greenBlueValue = Math.max(255 - intensity * 51, 0);
            const color = `rgb(${redValue}, ${greenBlueValue}, ${greenBlueValue})`;
            return { whiteSpace: "pre-wrap", lineHeight: "1.2", color };
          }
        },
        valueFormatter: (params) => {
          if (!params.value?.seconds) return "";
          const date = new Date(params.value.seconds * 1000);
          return `${date.toLocaleDateString("he-IL")}\n${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
        },
        wrapText: true,
        autoHeight: true,
      },
      {
        field: "מים",
        headerName: "מים",
        minWidth: 150,
        maxWidth: 300,
        cellStyle: {
          whiteSpace: "pre-wrap",
          direction: "rtl",
          lineHeight: "1.2",
        },
        wrapText: true,
        autoHeight: true,
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
              minWidth:
                question.type === "boolean"
                  ? 80
                  : question.type === "number"
                    ? 100
                    : 150,
              maxWidth:
                question.type === "boolean"
                  ? 120
                  : question.type === "number"
                    ? 150
                    : 300,
              wrapText: true,
              autoHeight: true,
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
          minWidth: 250,
          maxWidth: 500,
          cellStyle: {
            whiteSpace: "pre-wrap",
            direction: "rtl",
            lineHeight: "1.2",
          },
          wrapText: true,
          autoHeight: true,
        });
      } else if (
        screen.screen !== "שצל" &&
        screen.screen !== "וידוא צלמים" &&
        screen.screen !== "וידוא צלמי קשר"
      ) {
        screen.questions.forEach((question) => {
          if (question.text === "צ. הטנק") return;

          const colDef = {
            field: question.text,
            headerName: question.text,
            minWidth:
              question.type === "issues"
                ? 300
                : question.type === "boolean"
                  ? 80
                  : question.type === "number"
                    ? 100
                    : 150,
            maxWidth:
              question.type === "issues"
                ? 600
                : question.type === "boolean"
                  ? 120
                  : question.type === "number"
                    ? 150
                    : 300,
            wrapText: true,
            autoHeight: question.type !== "issues",
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
      if (gridRef.current?.api) {
        gridRef.current.api.autoSizeAllColumns();
      }
    };

    fetchData().catch(console.error);
  }, []);

  const onGridReady = (params) => {
    gridRef.current = params;
    params.api.autoSizeAllColumns();
  };

  return (
    <div
      style={{ height: "90vh", width: "98vw", margin: "1vh auto" }}
      className="ag-theme-alpine"
    >
      <AgGridReact
        ref={gridRef}
        rowData={rowData}
        columnDefs={columnDefs}
        enableRtl={true}
        components={{
          nestedGridCellRenderer: NestedGridCellRenderer,
        }}
        defaultColDef={{
          resizable: true,
        }}
      />
    </div>
  );
};

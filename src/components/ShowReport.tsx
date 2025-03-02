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
        cellRenderer: (params) => {
          if (!params.value?.seconds) return "";
          const date = new Date(params.value.seconds * 1000);
          const today = new Date();
          const diffTime = today - date;
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          let backgroundColor = "transparent";
          if (diffDays === 1) {
            backgroundColor = "#ff9999"; // Softer red for 1 day
          } else if (diffDays >= 2) {
            backgroundColor = "#ff6666"; // Deeper but pleasant red for 2+ days
          }

          return (
            <div style={{ whiteSpace: "pre-wrap", lineHeight: "1.2" }}>
              <span
                style={{
                  backgroundColor,
                  padding: "2px 4px",
                  borderRadius: "2px",
                }}
              >
                {`${date.toLocaleDateString("he-IL")}\n${date
                  .getHours()
                  .toString()
                  .padStart(
                    2,
                    "0",
                  )}:${date.getMinutes().toString().padStart(2, "0")}`}
              </span>
            </div>
          );
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
              cellStyle: {
                whiteSpace: "pre-wrap",
                direction: "rtl",
                lineHeight: "1.2",
              },
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
              question.type === "boolean"
                ? 80
                : question.type === "number"
                  ? 100
                  : question.type === "issues"
                    ? 300
                    : 150,
            maxWidth:
              question.type === "boolean"
                ? 120
                : question.type === "number"
                  ? 150
                  : question.type === "issues"
                    ? 500
                    : 300,
            wrapText: true,
            autoHeight: true,
            cellStyle: {
              whiteSpace: "pre-wrap",
              direction: "rtl",
              lineHeight: "1.2",
            },
          };
          if (question.type === "boolean") {
            colDef.cellRenderer = (params) => (
              <span style={{ color: params.value ? "#00FF00" : "red" }}>
                {params.value ? "✓" : "✗"}
              </span>
            );
          }
          columns.push(colDef);
        });
      }
    });

    // Explicitly add issues columns with custom renderer
    const issuesFields = ["תקלות חימוש", "תקלות קשר"];
    issuesFields.forEach((field) => {
      if (!columns.some((col) => col.field === field)) {
        columns.push({
          field: field,
          headerName: field,
          minWidth: 300,
          maxWidth: 500,
          wrapText: true,
          autoHeight: true,
          cellStyle: {
            whiteSpace: "pre-wrap",
            direction: "rtl",
            lineHeight: "1.2",
          },
          cellRenderer: (params) => {
            if (!params.value || params.value === "אין תקלות מדווחות") {
              return params.value;
            }
            return (
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  direction: "rtl",
                  lineHeight: "1.2",
                }}
              >
                {params.value.split("\n").map((line, index) => (
                  <div key={index}>
                    {line
                      .split(" [")
                      .map((part, i) =>
                        i === 0 ? (
                          part
                        ) : (
                          <span style={{ color: "blue", fontStyle: "italic" }}>
                            {" "}
                            [{part}
                          </span>
                        ),
                      )}
                  </div>
                ))}
              </div>
            );
          },
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
            `• ג'ריקנים: ${processedData["מים (ג'ריקנים)"] ?? ""}`,
            `• שישיות: ${processedData["מים (שישיות)"] ?? ""}`,
          ].join("\n");

          Object.keys(groupedQuestions).forEach((screenName) => {
            processedData[screenName] = groupedQuestions[screenName]
              .map((q) => `• ${q}: ${processedData[q] ?? ""}`)
              .join("\n");
          });

          // Process issues fields with days in square brackets and space
          const issuesFields = ["תקלות חימוש", "תקלות קשר"];
          const today = new Date();
          issuesFields.forEach((field) => {
            const issues = processedData[field];
            if (Array.isArray(issues) && issues.length > 0) {
              processedData[field] = issues
                .map((issue) => {
                  const creationDate = issue.creationDate?.seconds
                    ? new Date(issue.creationDate.seconds * 1000)
                    : null;
                  const daysPassed = creationDate
                    ? Math.floor(
                        (today - creationDate) / (1000 * 60 * 60 * 24),
                      ) + 1
                    : "לא ידוע";
                  return `• ${issue.failure || "לא צוין"} [${daysPassed} ימים]`;
                })
                .join("\n");
            } else {
              processedData[field] = "אין תקלות מדווחות";
            }
          });

          reports.push({ id: doc.id, ...processedData });
        });
      }

      setRowData(reports);
    };

    fetchData().catch((error) => console.error("Error fetching data:", error));
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
      <style>
        {`
          .ag-theme-alpine .ag-cell {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
          }
        `}
      </style>
      <AgGridReact
        ref={gridRef}
        rowData={rowData}
        columnDefs={columnDefs}
        enableRtl={true}
        defaultColDef={{
          resizable: true,
        }}
      />
    </div>
  );
};

import { useState, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { AG_GRID_LOCALE_IL } from "@ag-grid-community/locale";
import { startOfDay, differenceInDays } from "date-fns";

ModuleRegistry.registerModules([AllCommunityModule]);

const Issues = ({ topic, singleIssue, value, onChange }) => {
  const getCurrentDate = () => {
    return startOfDay(new Date());
  };

  const newRow = {
    failure: `הוסף ${singleIssue} חדשה`,
    fixed: false,
    creationDate: getCurrentDate(),
  };

  // Initialize rowData with the value prop (if it exists) and append a copy of newRow
  const [rowData, setRowData] = useState(
    value ? [...value, { ...newRow }] : [{ ...newRow }],
  );
  const gridRef = useRef();

  const colDefs = [
    {
      field: "failure",
      headerName: topic,
      editable: true,
      flex: 1,
      minWidth: 150,
      wrapText: true,
      autoHeight: true,
      cellStyle: { display: "flex", alignItems: "center" }, // Center vertically
      cellRenderer: (params) => {
        const isLastRow = params.node.rowIndex === rowData.length - 1;
        const isPlaceholder = params.value === newRow.failure;
        const style = {
          fontStyle: isLastRow && isPlaceholder ? "italic" : "normal",
          backgroundColor: isLastRow && isPlaceholder ? "#f5f5f5" : "white",
          color: isLastRow && isPlaceholder ? "#888" : "#000",
          border: "none",
          width: "100%",
          height: "100%",
          whiteSpace: "normal", // Enable text wrapping
          lineHeight: "1.3", // Reduce space between wrapped lines (default is usually ~1.5)
          display: "flex", // Center vertically
          alignItems: "center", // Center vertically
        };
        return <div style={style}>{params.value}</div>;
      },
      cellEditorParams: {
        onCellEditingStarted: (event) => {
          if (
            event.node.rowIndex === rowData.length - 1 &&
            event.value === newRow.failure
          ) {
            event.node.setDataValue("failure", ""); // Clear placeholder when editing starts
          }
        },
      },
    },
    {
      field: "days",
      headerName: "ימים",
      width: 80,
      cellStyle: (params) => ({
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        visibility:
          params.node.rowIndex === rowData.length - 1 ? "hidden" : "visible", // Hide for the new row
      }),
      valueGetter: (params) => {
        if (params.data.creationDate) {
          return (
            differenceInDays(getCurrentDate(), params.data.creationDate) + 1
          );
        }
        return 1; // Default value for rows without creationDate
      },
    },
    {
      field: "fixed",
      headerName: "תוקן",
      editable: true,
      width: 60,
      cellStyle: (params) => ({
        textAlign: "center",
        display: "flex", // Center vertically
        alignItems: "center", // Center vertically
        visibility:
          params.node.rowIndex === rowData.length - 1 ? "hidden" : "visible",
      }),
    },
  ];

  const onCellEditingStopped = (event) => {
    if (
      event.rowIndex === rowData.length - 1 &&
      event.value !== newRow.failure
    ) {
      const updatedData = [
        ...rowData,
        { ...newRow, creationDate: getCurrentDate() },
      ];
      setRowData(updatedData);
    }

    // Filter out the `newRow` placeholder before calling `onChange`
    const filteredData = rowData.filter(
      (row) => row.failure !== newRow.failure || row.fixed !== newRow.fixed,
    );
    onChange(filteredData);
  };

  const onRowDataUpdated = (params) => {
    const newRowIndex = rowData.length - 1;

    // Focus and start editing the new row
    gridRef.current.api.setFocusedCell(newRowIndex, "failure");
    gridRef.current.api.startEditingCell({
      rowIndex: newRowIndex,
      colKey: "failure",
    });
  };

  return (
    <div style={{ height: 500 }}>
      <AgGridReact
        ref={gridRef}
        rowData={rowData}
        columnDefs={colDefs}
        onCellEditingStopped={onCellEditingStopped}
        onRowDataUpdated={onRowDataUpdated}
        localeText={AG_GRID_LOCALE_IL}
        enableRtl={true}
        singleClickEdit={true}
        stopEditingWhenCellsLoseFocus={true}
        rowHeight={40} // Original default row height
        autoHeight={true} // Keep dynamic row height for long text
      />
    </div>
  );
};

export { Issues };

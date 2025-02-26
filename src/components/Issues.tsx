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
      suppressMovable: true, // Disable dragging
      resizable: false, // Disable resizing
      cellStyle: { display: "flex", alignItems: "center" },
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
          whiteSpace: "normal",
          lineHeight: "1.3",
          display: "flex",
          alignItems: "center",
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
      field: "fixed",
      headerName: "תוקן",
      editable: true,
      width: 60,
      suppressMovable: true, // Disable dragging
      resizable: false, // Disable resizing
      cellStyle: (params) => ({
        textAlign: "center",
        display: "flex",
        alignItems: "center",
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
        rowHeight={40}
        autoHeight={true}
      />
    </div>
  );
};

export { Issues };

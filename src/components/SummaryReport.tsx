import { useEffect, useState, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebaseConfig.ts";
import { questionsData } from "./questions-data.js";
import { AG_GRID_LOCALE_IL } from "@ag-grid-community/locale";
import { themeQuartz } from "ag-grid-community";
import { useTimeNavigation } from "../hooks/useTimeNavigation";
import { format, startOfDay, endOfDay, parse, isValid } from "date-fns";
import { he } from "date-fns/locale";
import { ColDef, GetContextMenuItemsParams, MenuItemDef, FirstDataRenderedEvent } from "ag-grid-community";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getReports } from "../services/firebase";

const myTheme = themeQuartz.withParams({
  spacing: 4,
});

interface TankData {
  tankId: string;
  dailyData: {
    [date: string]: {
      km: number | null;
      engineHours: number | null;
    };
  };
  isSummary?: boolean;
  isAverage?: boolean;
}

const SummaryReport = ({ onFirstDataRendered }: { onFirstDataRendered?: (params: FirstDataRenderedEvent) => void }) => {
  const [rowData, setRowData] = useState<TankData[]>([]);
  const [columnDefs, setColumnDefs] = useState<ColDef[][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kmGridRef = useRef<AgGridReact>(null);
  const engineHoursGridRef = useRef<AgGridReact>(null);
  
  // Extract tankIds from questionsData
  const tankIds = questionsData.screens
    .find((screen: any) => screen.screen === "כללי")
    .questions.find((q: any) => q.text === "צ. הטנק").options;

  // Save column state to localStorage
  const saveColumnsState = (event: any) => {
    const columnState = event.api.getColumnState();
    localStorage.setItem(
      "SummaryReportColumnState",
      JSON.stringify(columnState)
    );
  };

  // Restore column state from localStorage
  const restoreColumnsState = (params: any) => {
    const savedState = localStorage.getItem("SummaryReportColumnState");
    if (savedState) {
      const columnState = JSON.parse(savedState);
      params.api.applyColumnState({
        state: columnState,
        applyOrder: true,
      });
    }
  };

  // Helper function to format a date with slashes
  const formatDateWithSlashes = (dateStr: string) => {
    // Convert from d.M.yyyy to d/M/yyyy
    return dateStr.replace(/\./g, '/');
  };

  // Helper function to parse a date for sorting
  const parseDateForSorting = (dateStr: string) => {
    // Try to parse the date in d.M.yyyy format
    const parsedDate = parse(dateStr, 'P', new Date(), { locale: he });
    return isValid(parsedDate) ? parsedDate : new Date(0);
  };

  // Helper function to get all dates in a range
  const getDatesInRange = (startDate: Date, endDate: Date) => {
    const dates: string[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      dates.push(format(currentDate, "P", { locale: he }));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const results: TankData[] = [];

        // Get the date range to fetch data for
        const endDate = new Date();
        const startDate = new Date(0); // Start from beginning of time

        // Fetch data for each tank
        for (const tankId of tankIds) {
          const tankData: TankData = { tankId, dailyData: {} };

          // Fetch all reports for this tank in the date range
          const q = query(
            collection(db, "tankStatus"),
            where("tankId", "==", tankId),
            where("timestamp", ">=", startOfDay(startDate)),
            where("timestamp", "<=", endOfDay(endDate)),
            orderBy("timestamp", "asc")
          );

          const snapshot = await getDocs(q);
          const reports: any[] = [];
          snapshot.forEach((doc) => {
            reports.push(doc.data());
          });

          // Group reports by day and keep only the last report of each day
          const reportsByDay: Record<string, any> = {};
          reports.forEach((report) => {
            const date = format(report.timestamp.toDate(), "P", { locale: he });
            if (!reportsByDay[date] || reportsByDay[date].timestamp.seconds < report.timestamp.seconds) {
              reportsByDay[date] = report;
            }
          });

          // Calculate daily usage
          const sortedDates = Object.keys(reportsByDay).sort((a, b) => {
            const dateA = parseDateForSorting(a);
            const dateB = parseDateForSorting(b);
            return dateA.getTime() - dateB.getTime();
          });
          
          // Verify gaps in dates aren't too large to prevent incorrect deltas
          let validDateRanges: string[][] = [];
          let currentRange: string[] = [];
          
          for (let i = 0; i < sortedDates.length; i++) {
            const date = sortedDates[i];
            
            if (currentRange.length === 0) {
              currentRange.push(date);
            } else {
              const currentDate = parseDateForSorting(date);
              const prevDate = parseDateForSorting(currentRange[currentRange.length - 1]);
              
              // If dates are more than 14 days apart, start a new range
              const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
              
              if (daysDiff > 14) {
                validDateRanges.push([...currentRange]);
                currentRange = [date];
              } else {
                currentRange.push(date);
              }
            }
          }
          
          if (currentRange.length > 0) {
            validDateRanges.push(currentRange);
          }
          
          // Now process each valid date range independently
          for (const dateRange of validDateRanges) {
            for (let i = 0; i < dateRange.length; i++) {
              const date = dateRange[i];
              const report = reportsByDay[date];
              
              if (i > 0) {
                // Calculate delta from previous day
                const prevDate = dateRange[i - 1];
                const prevReport = reportsByDay[prevDate];
                
                // Only calculate delta when values make sense
                let kmDelta = null;
                let engineHoursDelta = null;
                
                if (typeof report['ק"מ'] === 'number' && typeof prevReport['ק"מ'] === 'number') {
                  kmDelta = report['ק"מ'] - prevReport['ק"מ'];
                  // Ensure reasonable values (skip if negative or unreasonably large)
                  if (kmDelta < 0 && kmDelta > -50) {
                    // Small negative values might be corrections, allow them
                    // Values like -6901 are likely errors
                  } else if (kmDelta > 1000) {
                    // Skip unreasonably large jumps
                    kmDelta = null;
                  }
                }
                
                if (typeof report['שע"מ'] === 'number' && typeof prevReport['שע"מ'] === 'number') {
                  engineHoursDelta = report['שע"מ'] - prevReport['שע"מ'];
                  // Ensure reasonable values
                  if (engineHoursDelta < 0 && engineHoursDelta > -50) {
                    // Small negative values might be corrections, allow them
                  } else if (engineHoursDelta > 1000) {
                    // Skip unreasonably large jumps
                    engineHoursDelta = null;
                  }
                }
                
                tankData.dailyData[date] = {
                  km: isNaN(kmDelta as number) ? null : kmDelta,
                  engineHours: isNaN(engineHoursDelta as number) ? null : engineHoursDelta
                };
              } else {
                // First report - no delta to show
                tankData.dailyData[date] = {
                  km: null,
                  engineHours: null
                };
              }
            }
          }

          results.push(tankData);
        }

        // Create column definitions
        const dates = new Set<string>();
        results.forEach(tank => {
          Object.keys(tank.dailyData).forEach(date => dates.add(date));
        });
        
        // Find the min and max dates to create a complete range
        let minDate = new Date();
        let maxDate = new Date(0);
        
        dates.forEach(dateStr => {
          const date = parseDateForSorting(dateStr);
          if (date < minDate) minDate = new Date(date);
          if (date > maxDate) maxDate = new Date(date);
        });
        
        // Ensure we have all dates in the range
        const allDatesInRange = getDatesInRange(minDate, maxDate);
        
        // Fill in missing dates for all tanks
        results.forEach(tank => {
          allDatesInRange.forEach(date => {
            if (!tank.dailyData[date]) {
              tank.dailyData[date] = {
                km: null,
                engineHours: null
              };
            }
          });
        });
        
        // Sort dates chronologically
        const sortedDates = allDatesInRange.sort((a, b) => {
          const dateA = parseDateForSorting(a);
          const dateB = parseDateForSorting(b);
          return dateA.getTime() - dateB.getTime();
        });

        const kmColumns = [
          { field: "tankId", headerName: "טנק", pinned: "right", width: 100, cellStyle: { fontWeight: 'bold' } },
          ...sortedDates.map(date => ({
            field: `km_${date}`,
            headerName: formatDateWithSlashes(date),
            width: 120,
            valueGetter: (params: any) => {
              if (!params.data?.dailyData) return null;
              const tankData = params.data.dailyData[date];
              return tankData?.km === null || isNaN(tankData?.km) ? null : tankData?.km;
            },
            valueFormatter: (params: any) => {
              return params.value === null || isNaN(params.value) ? '' : params.value;
            },
            cellStyle: { textAlign: 'center' }
          }))
        ];

        const engineHoursColumns = [
          { field: "tankId", headerName: "טנק", pinned: "right", width: 100, cellStyle: { fontWeight: 'bold' } },
          ...sortedDates.map(date => ({
            field: `engineHours_${date}`,
            headerName: formatDateWithSlashes(date),
            width: 120,
            valueGetter: (params: any) => {
              if (!params.data?.dailyData) return null;
              const tankData = params.data.dailyData[date];
              return tankData?.engineHours === null || isNaN(tankData?.engineHours) ? null : tankData?.engineHours;
            },
            valueFormatter: (params: any) => {
              return params.value === null || isNaN(params.value) ? '' : params.value;
            },
            cellStyle: { textAlign: 'center' }
          }))
        ];

        // Add summary and average rows
        const summaryRow: TankData = { tankId: "סיכום", isSummary: true, dailyData: {} };
        const averageRow: TankData = { tankId: "ממוצע", isAverage: true, dailyData: {} };

        sortedDates.forEach(date => {
          const kmValues = results
            .map(tank => tank.dailyData[date]?.km)
            .filter((val): val is number => val !== null && val !== undefined && !isNaN(val));
          const engineHoursValues = results
            .map(tank => tank.dailyData[date]?.engineHours)
            .filter((val): val is number => val !== null && val !== undefined && !isNaN(val));

          if (kmValues.length > 0) {
            const kmSum = kmValues.reduce((a, b) => a + b, 0);
            summaryRow.dailyData[date] = { km: kmSum, engineHours: null };
            averageRow.dailyData[date] = { km: Number((kmSum / kmValues.length).toFixed(1)), engineHours: null };
          } else {
            summaryRow.dailyData[date] = { km: null, engineHours: null };
            averageRow.dailyData[date] = { km: null, engineHours: null };
          }

          if (engineHoursValues.length > 0) {
            const engineHoursSum = engineHoursValues.reduce((a, b) => a + b, 0);
            if (summaryRow.dailyData[date]) {
              summaryRow.dailyData[date].engineHours = engineHoursSum;
            } else {
              summaryRow.dailyData[date] = { km: null, engineHours: engineHoursSum };
            }
            if (averageRow.dailyData[date]) {
              averageRow.dailyData[date].engineHours = Number((engineHoursSum / engineHoursValues.length).toFixed(1));
            } else {
              averageRow.dailyData[date] = { km: null, engineHours: Number((engineHoursSum / engineHoursValues.length).toFixed(1)) };
            }
          } else if (!summaryRow.dailyData[date]?.engineHours) {
            summaryRow.dailyData[date] = { ...summaryRow.dailyData[date], engineHours: null };
            averageRow.dailyData[date] = { ...averageRow.dailyData[date], engineHours: null };
          }
        });

        results.push(summaryRow, averageRow);

        setColumnDefs([kmColumns, engineHoursColumns]);
        setRowData(results);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('שגיאה בטעינת הנתונים. אנא נסה שוב.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [tankIds]);

  const defaultColDef = {
    wrapText: true,
    autoHeight: true,
    sortable: true,
    filter: true,
    resizable: true,
  };

  // Custom row styling for summary and average rows
  const getRowStyle = (params: any) => {
    if (params.data && (params.data.isSummary || params.data.isAverage)) {
      return {
        fontWeight: "bold",
        backgroundColor: "#f2f2f2",
        borderTop: "2px solid #999",
        fontSize: "1.1em",
      };
    }
    return undefined;
  };

  const getContextMenuItems = (params: GetContextMenuItemsParams): MenuItemDef[] => {
    return [
      {
        name: 'ייצא לאקסל',
        action: () => {
          if (kmGridRef.current && engineHoursGridRef.current) {
            // Step 1: Get km sheet data
            const kmApi = kmGridRef.current.api;
            const kmSheetData = kmApi.getSheetDataForExcel({
              sheetName: 'קילומטראז',
              skipColumnHeaders: false,
              skipRowGroups: false
            });
            
            // Step 2: Get engine hours sheet data
            const engineHoursApi = engineHoursGridRef.current.api;
            const engineHoursSheetData = engineHoursApi.getSheetDataForExcel({
              sheetName: 'שעות מנוע',
              skipColumnHeaders: false,
              skipRowGroups: false
            });
            
            // Step 3: Export multiple sheets
            kmApi.exportMultipleSheetsAsExcel({
              fileName: 'דוח יומי.xlsx',
              data: [kmSheetData, engineHoursSheetData]
            });
          }
        }
      }
    ];
  };

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;
  }

  if (isLoading) {
    return <div style={{ padding: '20px' }}>טוען נתונים...</div>;
  }

  return (
    <div style={{ padding: "20px", width: "100%" }}>
      <div style={{ marginBottom: "40px" }}>
        <h3 style={{ marginBottom: "10px" }}>קילומטראז' יומי</h3>
        <div style={{ height: "400px", width: "100%", border: "1px solid #ddd" }}>
          <AgGridReact
            ref={kmGridRef}
            rowData={rowData}
            columnDefs={columnDefs[0]}
            defaultColDef={defaultColDef}
            localeText={AG_GRID_LOCALE_IL}
            enableRtl={true}
            theme={myTheme}
            getRowStyle={getRowStyle}
            cellSelection={true}
            onFirstDataRendered={onFirstDataRendered}
            onColumnVisible={saveColumnsState}
            onColumnMoved={saveColumnsState}
            onGridReady={restoreColumnsState}
            maintainColumnOrder={true}
            domLayout="normal"
            getContextMenuItems={getContextMenuItems}
          />
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: "10px" }}>שעות מנוע יומיות</h3>
        <div style={{ height: "400px", width: "100%", border: "1px solid #ddd" }}>
          <AgGridReact
            ref={engineHoursGridRef}
            rowData={rowData}
            columnDefs={columnDefs[1]}
            defaultColDef={defaultColDef}
            localeText={AG_GRID_LOCALE_IL}
            enableRtl={true}
            theme={myTheme}
            getRowStyle={getRowStyle}
            cellSelection={true}
            onFirstDataRendered={onFirstDataRendered}
            onColumnVisible={saveColumnsState}
            onColumnMoved={saveColumnsState}
            onGridReady={restoreColumnsState}
            maintainColumnOrder={true}
            domLayout="normal"
            getContextMenuItems={getContextMenuItems}
          />
        </div>
      </div>
    </div>
  );
};

export { SummaryReport }; 
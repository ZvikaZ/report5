import { useState, useCallback, useEffect, useMemo } from "react";
import { Timestamp } from "firebase/firestore";
import { 
  startOfDay, 
  endOfDay, 
  addDays, 
  subDays, 
  isSameDay, 
  isAfter, 
  isBefore, 
  isEqual,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
} from "date-fns";

interface TimeNavigationState {
  currentTimestamp: Timestamp | null;
  history: Timestamp[];
  historyIndex: number;
  isLoading: boolean;
  latestTimestamp: Timestamp | null;
}

/**
 * Custom hook for managing time navigation in reports
 * 
 * This hook provides functionality to:
 * - Navigate between changes (historical data points)
 * - Navigate between days
 * - Return to the current (latest) timestamp
 * - Track navigation history
 */
export const useTimeNavigation = () => {
  // State to track the current timestamp, navigation history, and position in history
  const [state, setState] = useState<TimeNavigationState>({
    currentTimestamp: null,
    history: [],
    historyIndex: -1,
    isLoading: false,
    latestTimestamp: null,
  });

  // Set timestamp to 23:59:59 for a given date
  const setToEndOfDay = (date: Date): Date => {
    return setMilliseconds(setSeconds(setMinutes(setHours(date, 23), 59), 59), 999);
  };

  // Add a timestamp to the navigation history and set it as current
  const goToTimestamp = useCallback((timestamp: Timestamp) => {
    setState(prevState => ({
      ...prevState,
      isLoading: true
    }));

    setTimeout(() => {
      setState(prevState => {
        // If history is empty, just add the timestamp
        if (prevState.history.length === 0) {
          return {
            ...prevState,
            currentTimestamp: timestamp,
            latestTimestamp: timestamp, // This is now the latest timestamp
            history: [timestamp],
            historyIndex: 0,
            isLoading: false
          };
        }

        // Check if we're already at this timestamp
        const existingIndex = prevState.history.findIndex(t => 
          t.seconds === timestamp.seconds && t.nanoseconds === timestamp.nanoseconds
        );
        
        if (existingIndex !== -1) {
          // We already have this timestamp in history, just navigate to it
          
          // If this is a newer timestamp than our current latest, update that
          if (prevState.latestTimestamp) {
            const isNewerThanLatest = 
              timestamp.seconds > prevState.latestTimestamp.seconds || 
              (timestamp.seconds === prevState.latestTimestamp.seconds && 
               timestamp.nanoseconds > prevState.latestTimestamp.nanoseconds);
               
            if (isNewerThanLatest) {
              return {
                ...prevState,
                currentTimestamp: timestamp,
                latestTimestamp: timestamp,
                historyIndex: existingIndex,
                isLoading: false
              };
            }
          }
          
          return {
            ...prevState,
            currentTimestamp: timestamp,
            historyIndex: existingIndex,
            isLoading: false
          };
        }
        
        // Compare with current latest timestamp to see if this is newer
        const isNewerThanLatest = prevState.latestTimestamp 
          ? (timestamp.seconds > prevState.latestTimestamp.seconds || 
             (timestamp.seconds === prevState.latestTimestamp.seconds && 
              timestamp.nanoseconds > prevState.latestTimestamp.nanoseconds))
          : true;
        
        // Update latest timestamp if this is newer
        const newLatestTimestamp = isNewerThanLatest 
          ? timestamp 
          : prevState.latestTimestamp;
        
        // Add to history in chronological order
        const newHistory = [...prevState.history];
        
        // Find the right position to insert chronologically
        let insertPosition = newHistory.length; // Default to end
        
        for (let i = 0; i < newHistory.length; i++) {
          const historyTs = newHistory[i];
          if (
            historyTs.seconds > timestamp.seconds || 
            (historyTs.seconds === timestamp.seconds && historyTs.nanoseconds > timestamp.nanoseconds)
          ) {
            insertPosition = i;
            break;
          }
        }
        
        newHistory.splice(insertPosition, 0, timestamp);
        
        return {
          ...prevState,
          currentTimestamp: timestamp,
          latestTimestamp: newLatestTimestamp,
          history: newHistory,
          historyIndex: insertPosition,
          isLoading: false
        };
      });
    }, 300);
  }, []);

  // Go to the previous change in history
  const goToPrevChange = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      isLoading: true
    }));

    setTimeout(() => {
      setState(prevState => {
        if (prevState.historyIndex <= 0 || prevState.history.length === 0) {
          return {
            ...prevState,
            isLoading: false
          };
        }
        
        return {
          ...prevState,
          currentTimestamp: prevState.history[prevState.historyIndex - 1],
          historyIndex: prevState.historyIndex - 1,
          isLoading: false
        };
      });
    }, 300);
  }, []);

  // Go to the next change in history
  const goToNextChange = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      isLoading: true
    }));

    setTimeout(() => {
      setState(prevState => {
        if (
          prevState.historyIndex >= prevState.history.length - 1 ||
          prevState.history.length === 0
        ) {
          return {
            ...prevState,
            isLoading: false
          };
        }
        
        return {
          ...prevState,
          currentTimestamp: prevState.history[prevState.historyIndex + 1],
          historyIndex: prevState.historyIndex + 1,
          isLoading: false
        };
      });
    }, 300);
  }, []);

  // Go to the previous day
  const goToPrevDay = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      isLoading: true
    }));

    setTimeout(() => {
      setState(prevState => {
        // If no current timestamp, use today as starting point
        const startDate = prevState.currentTimestamp 
          ? prevState.currentTimestamp.toDate() 
          : prevState.latestTimestamp 
            ? prevState.latestTimestamp.toDate() 
            : new Date();
        
        // Get the date from the current timestamp and subtract one day
        const prevDate = subDays(startDate, 1);
        
        // Create a new timestamp for the previous day at 23:59:59
        const prevDayEnd = setToEndOfDay(startOfDay(prevDate));
        const prevDayTimestamp = Timestamp.fromDate(prevDayEnd);
        
        // Always keep entire history to maintain proper prev/next navigation
        const newHistory = [...prevState.history];
        
        // Check if this timestamp already exists in history
        const existingIndex = newHistory.findIndex(t => 
          t.seconds === prevDayTimestamp.seconds && 
          t.nanoseconds === prevDayTimestamp.nanoseconds
        );
        
        if (existingIndex !== -1) {
          // We already have this timestamp, just navigate to it
          return {
            ...prevState,
            currentTimestamp: prevDayTimestamp,
            historyIndex: existingIndex,
            isLoading: false
          };
        }
        
        // Not in history yet, add it at the beginning of history
        // This ensures we maintain proper chronological order
        newHistory.unshift(prevDayTimestamp);
        
        return {
          ...prevState,
          currentTimestamp: prevDayTimestamp,
          history: newHistory,
          historyIndex: 0, // Since we added at the beginning, index is 0
          isLoading: false
        };
      });
    }, 300);
  }, []);

  // Go to the next day
  const goToNextDay = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      isLoading: true
    }));

    setTimeout(() => {
      setState(prevState => {
        if (!prevState.currentTimestamp) return {
          ...prevState,
          isLoading: false
        };
        
        // Get the date from the current timestamp and add one day
        const currentDate = prevState.currentTimestamp.toDate();
        
        // Don't allow navigating to the future beyond today
        const today = new Date();
        if (isSameDay(currentDate, today)) {
          return {
            ...prevState,
            isLoading: false
          };
        }
        
        // Calculate the next day date
        const nextDate = addDays(currentDate, 1);
        
        // Make sure we don't go beyond today
        const finalDate = isAfter(nextDate, today) ? today : nextDate;
        
        // If we have a latest timestamp, check if next day is the same day as the latest timestamp
        if (prevState.latestTimestamp) {
          const latestDate = prevState.latestTimestamp.toDate();
          
          // Check if the next day we're navigating to is the same as the latest timestamp's day
          const isNavigatingToLatestDay = isSameDay(finalDate, latestDate);
          
          if (isNavigatingToLatestDay) {
            // Always keep entire history to maintain proper prev/next navigation
            const newHistory = [...prevState.history];
            
            // Check if latest timestamp already exists in history
            const existingIndex = newHistory.findIndex(t => 
              t.seconds === prevState.latestTimestamp!.seconds && 
              t.nanoseconds === prevState.latestTimestamp!.nanoseconds
            );
            
            if (existingIndex !== -1) {
              // Latest timestamp already in history, just navigate to it
              return {
                ...prevState,
                currentTimestamp: prevState.latestTimestamp,
                historyIndex: existingIndex,
                isLoading: false
              };
            }
            
            // Not in history yet, add it at the appropriate chronological position
            // Find the right position to insert it
            const latestTs = prevState.latestTimestamp;
            let insertPosition = newHistory.length; // Default to end
            
            for (let i = 0; i < newHistory.length; i++) {
              const historyTs = newHistory[i];
              if (
                historyTs.seconds > latestTs.seconds || 
                (historyTs.seconds === latestTs.seconds && historyTs.nanoseconds > latestTs.nanoseconds)
              ) {
                insertPosition = i;
                break;
              }
            }
            
            newHistory.splice(insertPosition, 0, prevState.latestTimestamp);
            
            return {
              ...prevState,
              currentTimestamp: prevState.latestTimestamp,
              history: newHistory,
              historyIndex: insertPosition,
              isLoading: false
            };
          }
        }
        
        // Create a new timestamp for the next day at 23:59:59
        const nextDayEnd = setToEndOfDay(startOfDay(finalDate));
        const nextDayTimestamp = Timestamp.fromDate(nextDayEnd);
        
        // Always keep entire history to maintain proper prev/next navigation
        const newHistory = [...prevState.history];
        
        // Check if this timestamp already exists in history
        const existingIndex = newHistory.findIndex(t => 
          t.seconds === nextDayTimestamp.seconds && 
          t.nanoseconds === nextDayTimestamp.nanoseconds
        );
        
        if (existingIndex !== -1) {
          // We already have this timestamp, just navigate to it
          return {
            ...prevState,
            currentTimestamp: nextDayTimestamp,
            historyIndex: existingIndex,
            isLoading: false
          };
        }
        
        // Not in history yet, add it at the appropriate chronological position
        // Find the right position to insert it
        let insertPosition = newHistory.length; // Default to end
        
        for (let i = 0; i < newHistory.length; i++) {
          const historyTs = newHistory[i];
          if (
            historyTs.seconds > nextDayTimestamp.seconds || 
            (historyTs.seconds === nextDayTimestamp.seconds && historyTs.nanoseconds > nextDayTimestamp.nanoseconds)
          ) {
            insertPosition = i;
            break;
          }
        }
        
        newHistory.splice(insertPosition, 0, nextDayTimestamp);
        
        return {
          ...prevState,
          currentTimestamp: nextDayTimestamp,
          history: newHistory,
          historyIndex: insertPosition,
          isLoading: false
        };
      });
    }, 300);
  }, []);

  // Go to the current (latest) timestamp
  const goToCurrent = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      isLoading: true
    }));

    setTimeout(() => {
      setState(prevState => {
        if (!prevState.latestTimestamp) {
          return {
            ...prevState,
            isLoading: false
          };
        }
        
        // Navigate to latest timestamp
        // Check if this timestamp already exists in history
        let existingIndex = prevState.history.findIndex(t => 
          t.seconds === prevState.latestTimestamp!.seconds && 
          t.nanoseconds === prevState.latestTimestamp!.nanoseconds
        );
        
        // If already in history, just navigate to it
        if (existingIndex !== -1) {
          return {
            ...prevState,
            currentTimestamp: prevState.latestTimestamp,
            historyIndex: existingIndex,
            isLoading: false
          };
        }
        
        // Not in history yet, add it at the appropriate chronological position
        let newHistory = [...prevState.history];
        const latestTs = prevState.latestTimestamp;
        
        // Find the right position to insert it
        let insertPosition = newHistory.length; // Default to end
        
        for (let i = 0; i < newHistory.length; i++) {
          const historyTs = newHistory[i];
          if (
            historyTs.seconds > latestTs.seconds || 
            (historyTs.seconds === latestTs.seconds && historyTs.nanoseconds > latestTs.nanoseconds)
          ) {
            insertPosition = i;
            break;
          }
        }
        
        newHistory.splice(insertPosition, 0, latestTs);
        
        return {
          ...prevState,
          currentTimestamp: prevState.latestTimestamp,
          history: newHistory,
          historyIndex: insertPosition,
          isLoading: false
        };
      });
    }, 300);
  }, []);

  // Whether we're currently at the latest timestamp in history
  const isAtLatest = (() => {
    // If no current timestamp or no latest timestamp, we're not at latest
    if (!state.currentTimestamp || !state.latestTimestamp) {
      return false;
    }
    
    // Compare current timestamp to the latest timestamp we've seen
    return state.currentTimestamp.seconds === state.latestTimestamp.seconds && 
           state.currentTimestamp.nanoseconds === state.latestTimestamp.nanoseconds;
  })();

  // Calculate whether we can navigate in each direction
  // These will be used to enable/disable the navigation buttons
  const canGoPrevChange = state.currentTimestamp !== null && state.history.length > 1;
  
  // Can go to next change if not at the end of history
  const canGoNextChange = state.historyIndex < state.history.length - 1 && state.history.length > 0;
  
  // Can go to previous day if we have a current timestamp
  const canGoPrevDay = true; // Always allow going to previous days
  
  // Can go to next day only if current date is before today
  const canGoNextDay = (() => {
    if (!state.currentTimestamp) return false;
    
    const currentDate = state.currentTimestamp.toDate();
    const today = new Date();
    
    // Compare dates to check if current date is today
    // Using precise date comparison to avoid timezone issues
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const currentDay = currentDate.getDate();
    
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    
    const isCurrentDateToday = 
      currentYear === todayYear && 
      currentMonth === todayMonth && 
      currentDay === todayDay;
    
    // Can go next day if not today and not in future
    return !isCurrentDateToday && 
           (currentYear < todayYear || 
            (currentYear === todayYear && currentMonth < todayMonth) || 
            (currentYear === todayYear && currentMonth === todayMonth && currentDay < todayDay)) && 
           !isAtLatest;
  })();

  return {
    currentTimestamp: state.currentTimestamp,
    currentDate: state.currentTimestamp?.toDate() || null,
    goToTimestamp,
    goToPrevChange,
    goToNextChange,
    goToPrevDay,
    goToNextDay,
    goToCurrent,
    canGoPrevChange,
    canGoNextChange,
    canGoPrevDay,
    canGoNextDay,
    isAtLatest,
    isLoading: state.isLoading,
  };
}; 
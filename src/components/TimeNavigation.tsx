import { Button, Group, Text, Box, Badge } from "@mantine/core";
import { format, isToday } from "date-fns";
import { he } from "date-fns/locale";

interface TimeNavigationProps {
  onPrevChange: () => void;
  onNextChange: () => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onCurrent: () => void;
  canGoPrevChange: boolean;
  canGoNextChange: boolean;
  canGoPrevDay: boolean;
  canGoNextDay: boolean;
  isAtLatest: boolean;
  currentDate: Date | null;
  isLoading?: boolean;
}

/**
 * TimeNavigation component
 * 
 * Provides UI controls for navigating through time in reports:
 * - Previous/Next change buttons
 * - Previous/Next day buttons
 * - Current (latest) data button
 * - Display of current date
 */
export const TimeNavigation = ({
  onPrevChange,
  onNextChange,
  onPrevDay,
  onNextDay,
  onCurrent,
  canGoPrevChange,
  canGoNextChange,
  canGoPrevDay,
  canGoNextDay,
  isAtLatest,
  currentDate,
  isLoading = false,
}: TimeNavigationProps) => {
  // Determine date display text
  const dateDisplayText = (() => {
    if (!currentDate) return "לא נבחר תאריך";
    if (isAtLatest && isToday(currentDate)) return "נתונים אחרונים";
    return format(currentDate, "dd/MM/yyyy HH:mm", { locale: he });
  })();

  return (
    <Box mb="md">
      <Group gap="md" align="center">
        <Group gap="xs">
          <Button
            variant="filled"
            color="indigo"
            onClick={onPrevDay}
            disabled={!canGoPrevDay || isLoading}
            size="sm"
            radius="md"
          >
            יום קודם
          </Button>
          <Button
            variant="light"
            color="blue"
            onClick={onPrevChange}
            disabled={!canGoPrevChange || isLoading}
            size="sm"
            radius="md"
          >
            שינוי קודם
          </Button>
        </Group>

        <Text component="span" fw={500}>
          <Badge variant="light" size="lg">
            {dateDisplayText}
          </Badge>
        </Text>

        <Group gap="xs">
          <Button
            variant="light"
            color="blue"
            onClick={onNextChange}
            disabled={!canGoNextChange || isLoading}
            size="sm"
            radius="md"
          >
            שינוי הבא
          </Button>
          <Button
            variant="filled"
            color="indigo"
            onClick={onNextDay}
            disabled={!canGoNextDay || isLoading}
            size="sm"
            radius="md"
          >
            יום הבא
          </Button>
          <Button 
            variant="filled" 
            color="green"
            onClick={onCurrent} 
            disabled={isAtLatest || isLoading}
            size="sm"
            radius="md"
          >
            עדכני
          </Button>
        </Group>
      </Group>
    </Box>
  );
}; 
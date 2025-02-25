import { Button, Text } from "@mantine/core";

export function Read({ onFinish }) {
  return (
    <>
      <Text>'קריאת דוח 5' עדיין לא מוכנה</Text>
      <Text fs="italic">אבל עובדים על זה...</Text>
      <Button onClick={onFinish}>סיים</Button>
    </>
  );
}

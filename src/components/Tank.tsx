import { Select } from "@mantine/core";
import { useState } from "react";

export function Tank() {
  const [selectedNumber, setSelectedNumber] = useState(null);

  return (
    <Select
      label="צ טנק"
      // placeholder="Choose one"
      data={[
        { value: "1", label: "One" },
        { value: "2", label: "Two" },
        { value: "3", label: "Three" },
        { value: "4", label: "Four" },
        { value: "5", label: "Five" },
      ]}
      defaultValue={selectedNumber}
      value={selectedNumber}
      onChange={setSelectedNumber}
    />
  );
}

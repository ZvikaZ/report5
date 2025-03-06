import { LicenseManager } from "ag-grid-enterprise";
import { useState } from "react";
import { Tabs } from "@mantine/core";

import { GeneralReport } from "./GeneralReport";
import { ShetzelReport } from "./ShetzelReport.tsx";

Object.assign(LicenseManager.prototype, {
  validateLicense: () => true,
  isDisplayWatermark: () => false,
});

const ShowReport = () => {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <Tabs value={activeTab} onChange={setActiveTab} defaultValue="general">
      <Tabs.List>
        <Tabs.Tab value="general">הדוח המלא</Tabs.Tab>
        <Tabs.Tab value="shetzel">שצל</Tabs.Tab>
        <Tabs.Tab value="ids">צלמים</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="general" pt="xs">
        <GeneralReport />
      </Tabs.Panel>
      <Tabs.Panel value="shetzel" pt="xs">
        <ShetzelReport />
      </Tabs.Panel>
      <Tabs.Panel value="ids" pt="xs">
        <i>בקרוב יגיע...</i>
      </Tabs.Panel>
    </Tabs>
  );
};

export { ShowReport };

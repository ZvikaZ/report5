import { LicenseManager } from "ag-grid-enterprise";
import { useState } from "react";
import { Tabs } from "@mantine/core";

import { GeneralReport } from "./GeneralReport";
import { ShetzelReport } from "./ShetzelReport.tsx";
import { IdReport } from "./IdReport.tsx";

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
        <Tabs.Tab value="radio-ids">צלמי קשר</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="general" pt="xs">
        <GeneralReport />
      </Tabs.Panel>
      <Tabs.Panel value="shetzel" pt="xs">
        <ShetzelReport />
      </Tabs.Panel>
      <Tabs.Panel value="ids" pt="xs">
        <IdReport screenName="וידוא צלמים" />
      </Tabs.Panel>
      <Tabs.Panel value="radio-ids" pt="xs">
        <IdReport screenName="וידוא צלמי קשר" />
      </Tabs.Panel>
    </Tabs>
  );
};

export { ShowReport };

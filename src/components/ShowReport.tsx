import { LicenseManager } from "ag-grid-enterprise";
import { useState, useRef, cloneElement, useEffect } from "react";
import { Tabs } from "@mantine/core";

import { GeneralReport } from "./GeneralReport";
import { ShetzelReport } from "./ShetzelReport.tsx";
import { ScreenReport } from "./ScreenReport.tsx";
import { FuelReport } from "./FuelReport.tsx";

Object.assign(LicenseManager.prototype, {
  validateLicense: () => true,
  isDisplayWatermark: () => false,
});

const ShowReport = () => {
  const [activeTab, setActiveTab] = useState("general");
  const gridRefs = useRef({});

  const onFirstDataRendered = (params, tabKey) => {
    gridRefs.current[tabKey] = params.api;
    params.api.autoSizeAllColumns();
  };

  useEffect(() => {
    const gridApi = gridRefs.current[activeTab];
    if (gridApi) {
      gridApi.autoSizeAllColumns();
    }
  }, [activeTab]); // Runs after activeTab changes and DOM updates

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
  };

  // Define tab configurations
  const tabs = [
    { value: "general", label: "הדוח המלא", component: <GeneralReport /> },
    { value: "shetzel", label: "שצל", component: <ShetzelReport /> },
    {
      value: "ids",
      label: "צלמים",
      component: <ScreenReport screenName="וידוא צלמים" />,
    },
    {
      value: "radio-ids",
      label: "צלמי קשר",
      component: <ScreenReport screenName="וידוא צלמי קשר" />,
    },
    {
      value: "ammo",
      label: "תחמושת",
      component: <ScreenReport screenName="תחמושת" showSummary={true} />,
    },
    { value: "fuel", label: "סולר", component: <FuelReport /> },
  ];

  return (
    <Tabs value={activeTab} onChange={handleTabChange} defaultValue="general">
      <Tabs.List>
        {tabs.map((tab) => (
          <Tabs.Tab key={tab.value} value={tab.value}>
            {tab.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>

      {tabs.map((tab) => (
        <Tabs.Panel key={tab.value} value={tab.value} pt="xs">
          {cloneElement(tab.component, {
            onFirstDataRendered: (params) =>
              onFirstDataRendered(params, tab.value),
          })}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
};

export { ShowReport };

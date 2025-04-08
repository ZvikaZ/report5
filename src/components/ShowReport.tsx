import { LicenseManager } from "ag-grid-enterprise";
import { useState, useRef, cloneElement, useEffect } from "react";
import { Tabs } from "@mantine/core";
import { GridApi, FirstDataRenderedEvent } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";

import { GeneralReport } from "./GeneralReport";
import { ShetzelReport } from "./ShetzelReport.tsx";
import { ScreenReport } from "./ScreenReport.tsx";
import { FuelReport } from "./FuelReport.tsx";
import { SummaryReport } from "./SummaryReport.tsx";

Object.assign(LicenseManager.prototype, {
  validateLicense: () => true,
  isDisplayWatermark: () => false,
});

interface TabConfig {
  value: string;
  label: string;
  component: React.ReactElement;
}

const ShowReport = () => {
  const [activeTab, setActiveTab] = useState("general");
  const gridRefs = useRef<Record<string, GridApi>>({});

  const onFirstDataRendered = (params: FirstDataRenderedEvent, tabKey: string) => {
    gridRefs.current[tabKey] = params.api;
    params.api.autoSizeAllColumns();
  };

  useEffect(() => {
    const gridApi = gridRefs.current[activeTab];
    if (gridApi) {
      gridApi.autoSizeAllColumns();
    }
  }, [activeTab]); // Runs after activeTab changes and DOM updates

  const handleTabChange = (newTab: string | null) => {
    if (newTab) {
      setActiveTab(newTab);
    }
  };

  // Define tab configurations
  const tabs: TabConfig[] = [
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
    { value: "summary", label: "סיכום", component: <SummaryReport /> },
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
            onFirstDataRendered: (params: FirstDataRenderedEvent) =>
              onFirstDataRendered(params, tab.value),
          })}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
};

export { ShowReport };

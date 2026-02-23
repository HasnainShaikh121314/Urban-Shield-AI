export interface PageContext {
  page: string;
  riskLevel?: string;
  rainfall?: number;
  location?: string;
}

export interface QuickPrompt {
  label: string;
  message: string;
}

const contextMap: Record<string, { greeting: string; prompts: QuickPrompt[] }> = {
  "/": {
    greeting:
      "I'm on the main dashboard showing current flood risk. Ask me about risk meters, weather metrics, or flood safety!",
    prompts: [
      { label: "Explain risk meter", message: "What does this risk level mean according to FEMA?" },
      { label: "What should I do?", message: "What actions should I take for the current risk level? (Ready.gov)" },
      { label: "Weather alerts", message: "What are the current weather alert types from NOAA?" },
      { label: "What do these numbers mean?", message: "Explain what rainfall, humidity, and pressure metrics mean for flood risk (NOAA)" },
    ],
  },
  "/monitoring": {
    greeting:
      "You're viewing real-time flood monitoring. I can help with map colors, warning levels, and alerts.",
    prompts: [
      { label: "Map colors", message: "What do the flood zone map colors mean? (USGS classifications)" },
      { label: "Warning levels", message: "Explain the different flood warning levels (National Weather Service)" },
      { label: "Station data", message: "How do I read weather station data? (NOAA standards)" },
      { label: "River levels", message: "How are river flood levels measured and classified? (NOAA)" },
    ],
  },
  "/predict": {
    greeting:
      "You're on the prediction page. Ask me about input parameters, risk scores, or recommended actions.",
    prompts: [
      { label: "What inputs matter?", message: "What inputs matter most for flood prediction? (FEMA flood factors)" },
      { label: "Risk score meaning", message: "How should I interpret flood risk scores? (Official classification)" },
      { label: "Actions by risk", message: "What actions should I take for different risk levels? (CDC/Ready.gov)" },
      { label: "Rainfall thresholds", message: "What rainfall amounts typically trigger floods? (NOAA data)" },
    ],
  },
  "/historical": {
    greeting:
      "You're viewing historical flood data. I can explain past events, trends, and patterns.",
    prompts: [
      { label: "Notable floods", message: "What were notable historical floods in the US? (Official records)" },
      { label: "Climate trends", message: "How is climate change affecting flood frequency? (NOAA climate data)" },
      { label: "Recurrence intervals", message: "What are flood recurrence intervals? (FEMA flood maps)" },
      { label: "Recovery guidance", message: "What is the official guidance for flood recovery? (FEMA reports)" },
    ],
  },
  "/alerts": {
    greeting:
      "You're in the Alerts section. I can help with alert types, severity levels, and response actions.",
    prompts: [
      { label: "Alert severity", message: "What do different flood alert severity levels mean? (NWS criteria)" },
      { label: "When alerted", message: "What should I do when I receive a flood alert? (FEMA response guide)" },
      { label: "Alert types", message: "What are the different types of flood alerts? (National Weather Service)" },
      { label: "Set up alerts", message: "How can I subscribe to official flood alerts for my area?" },
    ],
  },
};

export function getPageContext(pathname: string): { greeting: string; prompts: QuickPrompt[] } {
  return contextMap[pathname] || contextMap["/"];
}

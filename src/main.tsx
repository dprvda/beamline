import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/geist/wght.css";
import "@fontsource-variable/geist-mono/wght.css";
import "./styles.css";
import { UIRoot } from "@/components/ui-root/ui-root";
import { App } from "./app";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* the whole page in Prism, dark; set brand="oklch(0.7 0.15 150)" for your own colour */}
    <UIRoot look="prism" theme="dark" className="look-page" style={{ minHeight: "100dvh" }}>
      <App />
    </UIRoot>
  </StrictMode>,
);

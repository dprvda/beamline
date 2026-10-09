import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Beamline's source imports itself as "@/…": point it at the sample in ui/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "ui") } },
});

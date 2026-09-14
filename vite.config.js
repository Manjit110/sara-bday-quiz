import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base must match the GitHub Pages project path: https://<user>.github.io/sara-bday-quiz/
export default defineConfig({
  plugins: [react()],
  base: "/sara-bday-quiz/",
});

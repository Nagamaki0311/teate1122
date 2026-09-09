import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Built to editor/dist/, then passthrough-copied by eleventy.config.js into
// _site/editor/ so it is served at https://<site>/editor/ alongside the
// statically generated Eleventy pages.
export default defineConfig({
  base: "/editor/",
  plugins: [react()],
});

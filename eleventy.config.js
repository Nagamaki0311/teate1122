export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/style.css");
  eleventyConfig.addPassthroughCopy("src/site.js");
  eleventyConfig.addPassthroughCopy("src/favicon.svg");
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/robots.txt");
  // editor/dist is built by `npm run build --workspace=editor` (see root
  // package.json's build script) before eleventy runs, so this directory
  // exists by the time this passthrough copy executes.
  eleventyConfig.addPassthroughCopy({ "editor/dist": "editor" });

  // Look up an asset entry (site.json `assets[]`) by id.
  eleventyConfig.addFilter("findAsset", (assets, id) => (assets || []).find((a) => a.id === id));

  // Convert a 0-1 focal fraction to a "NN.N" percentage string (e.g. 0.5 -> "50.0").
  eleventyConfig.addFilter("pct", (n) => (Number(n) * 100).toFixed(1));

  // Normalize a heading that may be a single string or an array of lines to an array.
  eleventyConfig.addFilter("lines", (v) => (Array.isArray(v) ? v : [v]));

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
    },
  };
}

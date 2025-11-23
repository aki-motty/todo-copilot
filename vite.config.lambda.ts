/**
 * Vite Configuration for Lambda Build
 * Builds the Lambda handler for deployment
 * Output: dist-lambda/index.js
 */

import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    // Output directory for Lambda code
    outDir: "dist-lambda",
    // Entry point is the Lambda handler
    lib: {
      entry: path.resolve(__dirname, "src/index.lambda.ts"),
      name: "TodoLambdaHandler",
      fileName: () => "index.cjs",
      formats: ["cjs"],
    },
    // Ensure dependencies are bundled
    rollupOptions: {
      external: [],
      output: {
        format: "cjs",
        strict: true,
        entryFileNames: "index.cjs",
      },
    },
    // Enable source maps for debugging
    sourcemap: true,
    // Minify for smaller bundle size
    minify: "terser",
    // Target Node.js 18+ (Lambda runtime)
    target: "node18",
    // Build for Server-Side Rendering (Node.js environment)
    ssr: true,
  },
  resolve: {
    alias: {
      "@domain": path.resolve(__dirname, "./src/domain"),
      "@application": path.resolve(__dirname, "./src/application"),
      "@infrastructure": path.resolve(__dirname, "./src/infrastructure"),
      "@presentation": path.resolve(__dirname, "./src/presentation"),
      "@shared": path.resolve(__dirname, "./src/shared"),
    },
  },
});

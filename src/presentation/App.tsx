/**
 * Root application component
 * Serves as the entry point for the React application
 */
export default function App() {
  return (
    <div style={{ padding: "20px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <h1>📝 ToDo Copilot</h1>
      <p>Development environment ready. Phase 1 Setup complete!</p>
      <div style={{ marginTop: "20px", padding: "10px", backgroundColor: "#f0f0f0" }}>
        <p>✅ TypeScript strict mode enabled</p>
        <p>✅ Jest configured for testing</p>
        <p>✅ Playwright ready for E2E tests</p>
        <p>✅ Biome linting configured</p>
        <p>✅ React 18 and Vite ready</p>
      </div>
    </div>
  );
}

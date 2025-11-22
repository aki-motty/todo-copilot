/**
 * Unit Tests: HTTP Client
 * Tests the HTTP client basic functionality
 */

jest.mock("@infrastructure/config/logger", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { HttpClient, HttpError, NetworkError, TimeoutError } from "@infrastructure/api/HttpClient";

describe("HttpClient", () => {
  let client: HttpClient;

  beforeEach(() => {
    client = new HttpClient("https://api.example.com", { timeout: 5000 });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should construct with base URL", () => {
    expect(client).toBeDefined();
  });

  test("should throw HttpError for 404 responses", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      headers: new Map([["content-type", "application/json"]]),
      json: async () => ({ error: "Not Found" }),
    });

    await expect(client.get("/todos/123")).rejects.toThrow(HttpError);
  });

  test("should throw NetworkError for network failures", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new TypeError("Failed to fetch")
    );

    await expect(client.get("/todos")).rejects.toThrow(NetworkError);
  });

  test("should handle fetch errors gracefully", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Fetch failed"));

    await expect(client.post("/todos", { title: "Test" })).rejects.toThrow();
  });

  test("should successfully parse JSON response", async () => {
    const mockData = { items: [], total: 0 };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Map([["content-type", "application/json"]]),
      json: async () => mockData,
    });

    const result = await client.get("/todos");
    expect(result).toEqual(mockData);
  });

  test("should set proper headers", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Map([["content-type", "application/json"]]),
      json: async () => ({ success: true }),
    });

    await client.get("/todos");

    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    const headers = callArgs[1].headers;

    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["Accept"]).toBe("application/json");
  });

  test("should serialize request body as JSON", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 201,
      statusText: "Created",
      headers: new Map([["content-type", "application/json"]]),
      json: async () => ({ id: "123", title: "Test" }),
    });

    await client.post("/todos", { title: "Test" });

    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    expect(callArgs[1].body).toBe(JSON.stringify({ title: "Test" }));
  });
});

describe("HttpClient Error Extraction", () => {
  let client: HttpClient;

  beforeEach(() => {
    client = new HttpClient("https://api.example.com");
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should extract error message from API response wrapper", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      headers: new Map([["content-type", "application/json"]]),
      json: async () => ({
        body: { error: "Invalid title provided" },
      }),
    });

    try {
      await client.get("/todos");
      fail("Should have thrown HttpError");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).message).toContain("Invalid title provided");
    }
  });
});

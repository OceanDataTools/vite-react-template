import { describe, expect, it } from "vitest"
import { extractError } from "./apikeyThunks"

const jsonResponse = (body: unknown, status = 400) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

describe("extractError", () => {
  it("returns a string detail as is", async () => {
    await expect(
      extractError(jsonResponse({ detail: "Key name taken" }), "fallback"),
    ).resolves.toBe("Key name taken")
  })

  it("formats FastAPI 422 validation issues with their field names", async () => {
    const res = jsonResponse(
      {
        detail: [
          {
            type: "datetime_from_date_parsing",
            loc: ["body", "expires_at"],
            msg: "Input should be a valid datetime or date, input is too short",
          },
          { type: "missing", loc: ["body"], msg: "Field required" },
        ],
      },
      422,
    )
    await expect(extractError(res, "fallback")).resolves.toBe(
      "expires_at: Input should be a valid datetime or date, input is too short; Field required",
    )
  })

  it("falls back when there is no usable detail", async () => {
    await expect(
      extractError(jsonResponse({ detail: [] }), "fallback"),
    ).resolves.toBe("fallback")
    await expect(extractError(jsonResponse({}), "fallback")).resolves.toBe(
      "fallback",
    )
    await expect(
      extractError(
        new Response("<html>502</html>", { status: 502 }),
        "fallback",
      ),
    ).resolves.toBe("fallback")
  })
})

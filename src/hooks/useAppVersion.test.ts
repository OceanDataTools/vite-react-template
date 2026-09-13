import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// useAppVersion caches its fetch in module-level state so it survives
// across mounts within a page load. Each test needs a pristine copy of
// that state, so the module is re-imported fresh (via resetModules) in
// every test rather than statically imported once for the whole file.
async function importUseAppVersion() {
  const mod = await import("./useAppVersion")
  return mod.useAppVersion
}

describe("useAppVersion", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns the version reported by the backend", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ version: "2.6.1" }),
    } as Response)

    const useAppVersion = await importUseAppVersion()
    const { result } = renderHook(() => useAppVersion())

    await waitFor(() => {
      expect(result.current).toBe("2.6.1")
    })
  })

  it("only fetches once across multiple concurrently mounted hooks", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ version: "2.6.1" }),
    } as Response)

    const useAppVersion = await importUseAppVersion()
    const first = renderHook(() => useAppVersion())
    const second = renderHook(() => useAppVersion())

    await waitFor(() => {
      expect(first.result.current).toBe("2.6.1")
    })
    await waitFor(() => {
      expect(second.result.current).toBe("2.6.1")
    })

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("reuses the cached version for a later mount instead of refetching", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ version: "2.6.1" }),
    } as Response)

    const useAppVersion = await importUseAppVersion()

    const first = renderHook(() => useAppVersion())
    await waitFor(() => {
      expect(first.result.current).toBe("2.6.1")
    })
    first.unmount()

    const second = renderHook(() => useAppVersion())
    await waitFor(() => {
      expect(second.result.current).toBe("2.6.1")
    })

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("allows a later mount to retry after a failed fetch", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network error"))

    const useAppVersion = await importUseAppVersion()

    const first = renderHook(() => useAppVersion())
    await waitFor(() => {
      expect(first.result.current).toBeNull()
    })
    first.unmount()

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ version: "2.6.1" }),
    } as Response)

    const second = renderHook(() => useAppVersion())
    await waitFor(() => {
      expect(second.result.current).toBe("2.6.1")
    })

    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it("resolves to null when the response is not ok", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response)

    const useAppVersion = await importUseAppVersion()
    const { result } = renderHook(() => useAppVersion())

    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current).toBeNull()
  })
})

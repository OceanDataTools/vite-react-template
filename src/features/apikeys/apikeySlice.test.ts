import { describe, expect, it } from "vitest"
import reducer from "./apikeySlice"
import { fetchRoutesThunk } from "./apikeyThunks"

const routes = [{ name: "items", route: "/api/v1/items", methods: ["GET"] }]
const initial = reducer(undefined, { type: "@@init" })

describe("apikeySlice: fetchRoutesThunk", () => {
  it("stores routes on success", () => {
    const state = reducer(
      initial,
      fetchRoutesThunk.fulfilled(routes, "req", undefined),
    )
    expect(state.routes).toEqual(routes)
    expect(state.routesError).toBeNull()
  })

  it("records the rejection message and clears stale routes", () => {
    const loaded = reducer(
      initial,
      fetchRoutesThunk.fulfilled(routes, "req", undefined),
    )
    const state = reducer(
      loaded,
      fetchRoutesThunk.rejected(null, "req", undefined, "Server exploded"),
    )
    expect(state.routes).toEqual([])
    expect(state.routesError).toBe("Server exploded")
  })

  it("clears the error when refetching", () => {
    const failed = reducer(
      initial,
      fetchRoutesThunk.rejected(null, "req", undefined, "boom"),
    )
    const state = reducer(failed, fetchRoutesThunk.pending("req", undefined))
    expect(state.routesError).toBeNull()
  })
})

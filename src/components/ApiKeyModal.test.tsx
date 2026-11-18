import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it, vi } from "vitest"
import ApiKeyModal from "./ApiKeyModal"

const routes = [
  { name: "items", route: "/api/v1/items", methods: ["GET", "POST"] },
]

const renderModal = (
  props: Partial<React.ComponentProps<typeof ApiKeyModal>> = {},
) =>
  render(
    <ApiKeyModal
      isOpen
      onClose={vi.fn()}
      routes={routes}
      onSubmitForm={vi.fn(() => Promise.resolve(true))}
      {...props}
    />,
  )

describe("ApiKeyModal", () => {
  beforeAll(() => {
    // jsdom doesn't implement showModal(); mark the dialog open so its
    // contents are accessible.
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.open = true
    }
  })

  it("toggles individual permissions and reflects them in select-all", async () => {
    const user = userEvent.setup()
    renderModal()

    const selectAll = screen.getByRole<HTMLInputElement>("checkbox", {
      name: "Select all",
    })
    const get = screen.getByRole("checkbox", { name: "GET /api/v1/items" })
    const post = screen.getByRole("checkbox", { name: "POST /api/v1/items" })

    await user.click(get)
    expect(get).toBeChecked()
    expect(selectAll).not.toBeChecked()
    expect(selectAll.indeterminate).toBe(true)

    await user.click(post)
    expect(selectAll).toBeChecked()
    expect(selectAll.indeterminate).toBe(false)

    await user.click(get)
    expect(get).not.toBeChecked()
    expect(post).toBeChecked()
  })

  it("select-all checks and clears every permission", async () => {
    const user = userEvent.setup()
    renderModal()

    const selectAll = screen.getByRole("checkbox", { name: "Select all" })
    const get = screen.getByRole("checkbox", { name: "GET /api/v1/items" })
    const post = screen.getByRole("checkbox", { name: "POST /api/v1/items" })

    await user.click(selectAll)
    expect(get).toBeChecked()
    expect(post).toBeChecked()

    await user.click(selectAll)
    expect(get).not.toBeChecked()
    expect(post).not.toBeChecked()
  })

  it("never-expires blanks the expiration and makes it read-only", async () => {
    const user = userEvent.setup()
    const { container } = renderModal()

    const expiresAt = container.querySelector<HTMLInputElement>(
      'input[name="expiresAt"]',
    )
    if (!expiresAt) throw new Error("expiresAt input not found")
    await user.type(expiresAt, "2999-01-01")
    expect(expiresAt).toHaveValue("2999-01-01")

    await user.click(screen.getByRole("checkbox", { name: "Never expires" }))
    expect(expiresAt).toHaveValue("")
    expect(expiresAt).toHaveAttribute("readonly")
  })

  it("enables submit once the form is valid", async () => {
    const user = userEvent.setup()
    renderModal()

    const submit = screen.getByRole("button", { name: "Create" })
    expect(submit).toBeDisabled()

    await user.type(screen.getByRole("textbox"), "my key")
    await user.click(screen.getByRole("checkbox", { name: "Never expires" }))
    await user.click(
      screen.getByRole("checkbox", { name: "GET /api/v1/items" }),
    )

    expect(submit).toBeEnabled()
  })

  it("submits expiresAt as null when never-expires is ticked (#109)", async () => {
    const user = userEvent.setup()
    const onSubmitForm = vi.fn(() => Promise.resolve(true))
    const { container } = renderModal({ onSubmitForm })

    await user.type(screen.getByRole("textbox"), "my key")
    const expiresAt = container.querySelector<HTMLInputElement>(
      'input[name="expiresAt"]',
    )
    if (!expiresAt) throw new Error("expiresAt input not found")
    await user.type(expiresAt, "2999-01-01")
    await user.click(screen.getByRole("checkbox", { name: "Never expires" }))
    await user.click(
      screen.getByRole("checkbox", { name: "GET /api/v1/items" }),
    )
    await user.click(screen.getByRole("button", { name: "Create" }))

    expect(onSubmitForm).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ neverExpires: true, expiresAt: null }),
    )
  })

  it("submits expiresAt as null on reissue of a never-expiring key", async () => {
    const user = userEvent.setup()
    const onSubmitForm = vi.fn(() => Promise.resolve(true))
    renderModal({
      onSubmitForm,
      mode: "reissue",
      initialValues: {
        id: "abc",
        keyName: "existing",
        neverExpires: true,
        expiresAt: null,
        permissions: [{ route: "/api/v1/items", method: "GET" }],
      },
    })

    await user.click(screen.getByRole("button", { name: /re-?issue/i }))

    expect(onSubmitForm).toHaveBeenCalledWith(
      expect.objectContaining({ id: "abc", expiresAt: null }),
    )
  })

  it("passes a chosen expiration through unchanged", async () => {
    const user = userEvent.setup()
    const onSubmitForm = vi.fn(() => Promise.resolve(true))
    const { container } = renderModal({ onSubmitForm })

    await user.type(screen.getByRole("textbox"), "my key")
    const expiresAt = container.querySelector<HTMLInputElement>(
      'input[name="expiresAt"]',
    )
    if (!expiresAt) throw new Error("expiresAt input not found")
    await user.type(expiresAt, "2999-01-01")
    await user.click(
      screen.getByRole("checkbox", { name: "GET /api/v1/items" }),
    )
    await user.click(screen.getByRole("button", { name: "Create" }))

    expect(onSubmitForm).toHaveBeenCalledWith(
      expect.objectContaining({ neverExpires: false, expiresAt: "2999-01-01" }),
    )
  })

  it("explains an empty route list instead of showing select-all", () => {
    renderModal({ routes: [] })

    expect(screen.getByText("No routes accept API keys.")).toBeInTheDocument()
    expect(
      screen.queryByRole("checkbox", { name: "Select all" }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled()
  })

  it("shows the error when routes failed to load", () => {
    renderModal({ routes: [], routesError: "Internal Server Error" })

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Couldn't load routes: Internal Server Error",
    )
    expect(
      screen.queryByText("No routes accept API keys."),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("checkbox", { name: "Select all" }),
    ).not.toBeInTheDocument()
  })
})

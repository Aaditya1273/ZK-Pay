import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { SessionProvider } from "../SessionProvider"

describe("SessionProvider", () => {
  it("renders children within the session context", () => {
    render(
      <SessionProvider>
        <div data-testid="child">Hello World</div>
      </SessionProvider>
    )

    expect(screen.getByTestId("child")).toBeInTheDocument()
    expect(screen.getByText("Hello World")).toBeInTheDocument()
  })

  it("renders multiple children", () => {
    render(
      <SessionProvider>
        <span data-testid="first">First</span>
        <span data-testid="second">Second</span>
      </SessionProvider>
    )

    expect(screen.getByTestId("first")).toBeInTheDocument()
    expect(screen.getByTestId("second")).toBeInTheDocument()
    expect(screen.getByText("First")).toBeInTheDocument()
    expect(screen.getByText("Second")).toBeInTheDocument()
  })

  it("renders without children", () => {
    const { container } = render(<SessionProvider>{null}</SessionProvider>)
    expect(container.innerHTML).toBe("")
  })
})

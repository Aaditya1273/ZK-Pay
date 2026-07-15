import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// Need dynamic import since the module uses default export
const LoginPagePromise = import("@/app/login/page")

async function renderLoginPage() {
  const LoginPage = (await LoginPagePromise).default
  return render(<LoginPage />)
}

describe("LoginPage", () => {
  it("renders loading spinner when session status is loading", async () => {
    const { useSession } = await import("next-auth/react")
    ;(useSession as any).mockReturnValue({
      data: null,
      status: "loading",
    })

    await renderLoginPage()

    expect(screen.getByText("SHIPIT")).toBeInTheDocument()
    expect(screen.getByText("Zero-touch deployment for OKX.AI Agent Service Providers")).toBeInTheDocument()
    expect(document.querySelector(".animate-spin")).toBeInTheDocument()
  })

  it("renders sign-in button when user is not authenticated", async () => {
    const { useSession } = await import("next-auth/react")
    ;(useSession as any).mockReturnValue({
      data: null,
      status: "unauthenticated",
    })

    await renderLoginPage()

    expect(screen.getByText("Sign in with Google")).toBeInTheDocument()
    expect(screen.getByText("Welcome")).toBeInTheDocument()
  })

  it("renders user profile when user is authenticated", async () => {
    const { useSession } = await import("next-auth/react")
    ;(useSession as any).mockReturnValue({
      data: {
        user: {
          name: "Test User",
          email: "test@example.com",
          image: null,
        },
      },
      status: "authenticated",
    })

    await renderLoginPage()

    expect(screen.getByText("Test User")).toBeInTheDocument()
    expect(screen.getByText("test@example.com")).toBeInTheDocument()
    expect(screen.getByText("Go to Dashboard")).toBeInTheDocument()
    expect(screen.getByText("Sign Out")).toBeInTheDocument()
  })

  it("displays user avatar when image is provided", async () => {
    const { useSession } = await import("next-auth/react")
    ;(useSession as any).mockReturnValue({
      data: {
        user: {
          name: "User With Avatar",
          email: "avatar@example.com",
          image: "https://example.com/avatar.png",
        },
      },
      status: "authenticated",
    })

    await renderLoginPage()

    const images = screen.getAllByRole("img")
    expect(images[0]).toHaveAttribute("src", "https://example.com/avatar.png")
  })

  it("shows initial letter when user has no image", async () => {
    const { useSession } = await import("next-auth/react")
    ;(useSession as any).mockReturnValue({
      data: {
        user: {
          name: "Alice",
          email: "alice@example.com",
          image: null,
        },
      },
      status: "authenticated",
    })

    await renderLoginPage()

    // Should show "A" as initial
    expect(screen.getByText("A")).toBeInTheDocument()
  })
})

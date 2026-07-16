import type { Metadata } from "next"
import localFont from "next/font/local"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { SessionProvider } from "@/components/auth/SessionProvider"
import { AuthModal } from "@/components/auth/AuthModal"
import "./globals.css"

const geistSans = localFont({
  src: "../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
  variable: "--font-geist-sans",
  display: "swap",
  weight: "100 900",
})

const geistMono = localFont({
  src: "../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  display: "swap",
  weight: "100 900",
})

export const metadata: Metadata = {
  title: "SHIPIT — Zero-Touch Deployment for OKX.AI",
  description: "The first zero-touch deployment platform for OKX.AI. Describe your idea, SHIPIT generates, validates, and deploys Agent Service Providers in seconds.",
  icons: {
    icon: "/favicon.svg",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <SessionProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem
              disableTransitionOnChange
          >
            {children}
            <AuthModal />
            <Toaster theme="dark" />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}

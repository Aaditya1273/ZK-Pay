export { default } from "next-auth/middleware"

export const config = {
  matcher: ["/new", "/deploy", "/review", "/success", "/history", "/settings"],
}

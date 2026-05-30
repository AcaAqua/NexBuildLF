export { auth as middleware } from "@/auth"

export const config = {
  // 簡易版（ログイン不要）の開発のため、一時的に全てのリクエストを許可
  matcher: [],
}

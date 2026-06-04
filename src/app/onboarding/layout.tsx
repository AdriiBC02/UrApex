import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 20% 50%, rgb(6 182 212 / 0.04) 0%, transparent 50%), " +
          "radial-gradient(ellipse at 80% 20%, rgb(6 182 212 / 0.03) 0%, transparent 50%)",
      }}
    >
      {children}
    </div>
  )
}

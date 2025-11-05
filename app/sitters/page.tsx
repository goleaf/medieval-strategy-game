import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { SitterManager } from "@/components/game/sitter-manager"
import { DualManager } from "@/components/game/dual-manager"

export default async function SittersPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Account Management</h1>
          <p className="text-gray-600">
            Manage sitters and duals to help maintain your account when you're away
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <SitterManager />
          <DualManager />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-3">Important Information</h2>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <strong>Sitters:</strong> Trusted players from your tribe who can perform limited actions on your account.
              Maximum 2 sitters per account.
            </p>
            <p>
              <strong>Duals:</strong> Players who can access your account with full permissions. There is no limit on duals.
            </p>
            <p>
              <strong>Inactivity Allowance:</strong> Starts at 14 days. Resets when you or your sitters are active.
              When it reaches 0, all sitters are deactivated.
            </p>
            <p>
              <strong>Security:</strong> Only add sitters/duals you fully trust. They gain significant control over your account.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

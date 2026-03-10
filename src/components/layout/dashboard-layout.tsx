import { type Profile } from '@/types'
import { Sidebar } from './sidebar'

export function DashboardLayout({ user, children }: { user: Profile; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  )
}

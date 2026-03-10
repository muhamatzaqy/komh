'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { type Profile } from '@/types'
import { LayoutDashboard, Users, Calendar, ClipboardList, FileText, CreditCard, BarChart3, AlertTriangle, Eye, Camera, Clock, LogOut, Menu, X, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { useState } from 'react'

const pengelolaNav = [
  { href: '/pengelola', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pengelola/users', label: 'Mahasiswa', icon: Users },
  { href: '/pengelola/jadwal', label: 'Jadwal Ngaji', icon: Calendar },
  { href: '/pengelola/presensi', label: 'Presensi', icon: ClipboardList },
  { href: '/pengelola/perizinan', label: 'Perizinan', icon: FileText },
  { href: '/pengelola/keuangan', label: 'Keuangan SPP', icon: CreditCard },
  { href: '/pengelola/laporan', label: 'Laporan', icon: BarChart3 },
]
const pengurusNav = [
  { href: '/pengurus', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pengurus/kegiatan', label: 'Kegiatan', icon: Calendar },
  { href: '/pengurus/pelanggaran', label: 'Pelanggaran', icon: AlertTriangle },
  { href: '/pengurus/monitoring', label: 'Monitoring', icon: Eye },
]
const mahasiswaNav = [
  { href: '/mahasiswa', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/mahasiswa/absensi', label: 'Absensi', icon: Camera },
  { href: '/mahasiswa/perizinan', label: 'Perizinan', icon: FileText },
  { href: '/mahasiswa/keuangan', label: 'Keuangan', icon: CreditCard },
  { href: '/mahasiswa/riwayat', label: 'Riwayat', icon: Clock },
]

export function Sidebar({ user }: { user: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const supabase = createClient()

  const navItems = user.role === 'pengelola' ? pengelolaNav : user.role === 'pengurus' ? pengurusNav : mahasiswaNav
  const roleLabel = user.role === 'pengelola' ? 'Pengelola' : user.role === 'pengurus' ? 'Pengurus' : 'Mahasiswa'

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  const NavContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <BookOpen className="h-5 w-5 text-primary-foreground" />
        </div>
        <div><p className="font-bold leading-none">SI-ASRAMA</p><p className="text-xs text-muted-foreground">Ma&apos;had Aly &amp; LKIM</p></div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors', isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')}>
              <Icon className="h-4 w-4 shrink-0" />{item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t p-4">
        <div className="flex items-center gap-3 rounded-lg p-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{getInitials(user.nama)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{user.nama}</p>
            <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 shrink-0" title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div className="flex items-center border-b bg-background px-4 py-3 lg:hidden">
        <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} className="mr-3">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /><span className="font-bold">SI-ASRAMA</span></div>
      </div>
      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={cn('fixed inset-y-0 left-0 z-50 w-64 bg-background shadow-xl transition-transform duration-300 lg:hidden', open ? 'translate-x-0' : '-translate-x-full')}>
        <NavContent />
      </aside>
      <aside className="hidden w-64 shrink-0 border-r bg-background lg:block">
        <div className="sticky top-0 h-screen"><NavContent /></div>
      </aside>
    </>
  )
}

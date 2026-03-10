import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/shared/stat-card'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Calendar, CheckSquare, CreditCard } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default async function PengelolaDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'pengelola') redirect(`/${profile?.role ?? 'login'}`)

  const [{ count: totalMahasiswa }, { count: totalJadwal }, { count: pendingIzin }, { count: pendingSpp }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'mahasiswa').eq('is_active', true),
    supabase.from('jadwal_kegiatan').select('*', { count: 'exact', head: true }).eq('tanggal', new Date().toISOString().split('T')[0]),
    supabase.from('perizinan').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('pembayaran_spp').select('*', { count: 'exact', head: true }).eq('status', 'menunggu_verifikasi'),
  ])

  const { data: recentIzin } = await supabase.from('perizinan').select('*, profiles(nama, nim)').eq('status', 'pending').order('created_at', { ascending: false }).limit(5)

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard Pengelola" description={`Hari ini ${formatDate(new Date())}`} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Mahasiswa Aktif" value={totalMahasiswa ?? 0} icon={Users} />
        <StatCard title="Jadwal Hari Ini" value={totalJadwal ?? 0} icon={Calendar} />
        <StatCard title="Izin Menunggu" value={pendingIzin ?? 0} icon={CheckSquare} iconClassName="bg-yellow-100" />
        <StatCard title="Pembayaran Menunggu" value={pendingSpp ?? 0} icon={CreditCard} iconClassName="bg-blue-100" />
      </div>
      <Card>
        <CardHeader><CardTitle>Perizinan Menunggu Persetujuan</CardTitle></CardHeader>
        <CardContent>
          {recentIzin && recentIzin.length > 0 ? (
            <div className="space-y-3">
              {recentIzin.map(izin => {
                const p = izin.profiles as { nama: string; nim: string } | null
                return (
                  <div key={izin.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div><p className="font-medium">{p?.nama ?? '-'}</p><p className="text-sm text-muted-foreground">{p?.nim} · {izin.jenis_izin}</p></div>
                    <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800">Pending</span>
                  </div>
                )
              })}
            </div>
          ) : <p className="text-sm text-muted-foreground">Tidak ada perizinan menunggu.</p>}
        </CardContent>
      </Card>
    </div>
  )
}
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/shared/stat-card'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Calendar, CheckSquare, CreditCard, ArrowRight } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import Link from 'next/link'

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

  const { data: recentIzin } = await supabase
    .from('perizinan')
    .select('*, profiles(nama, nim)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: recentSpp } = await supabase
    .from('pembayaran_spp')
    .select('*, profiles(nama, nim)')
    .eq('status', 'menunggu_verifikasi')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Dashboard Pengelola"
        description={`Hari ini ${formatDate(new Date())}`}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Mahasiswa Aktif"
          value={totalMahasiswa ?? 0}
          icon={Users}
          iconClassName="bg-emerald-100 [&_svg]:text-emerald-600"
        />
        <StatCard
          title="Jadwal Hari Ini"
          value={totalJadwal ?? 0}
          icon={Calendar}
          iconClassName="bg-blue-100 [&_svg]:text-blue-600"
        />
        <StatCard
          title="Izin Menunggu"
          value={pendingIzin ?? recentIzin?.length ?? 0}
          icon={CheckSquare}
          iconClassName="bg-amber-100 [&_svg]:text-amber-600"
        />
        <StatCard
          title="Pembayaran Menunggu"
          value={pendingSpp ?? recentSpp?.length ?? 0}
          icon={CreditCard}
          iconClassName="bg-purple-100 [&_svg]:text-purple-600"
        />
      </div>

      {/* Recent Perizinan */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Perizinan Menunggu Persetujuan</CardTitle>
            <Link
              href="/pengelola/perizinan"
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Lihat semua <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentIzin && recentIzin.length > 0 ? (
            <div className="space-y-2">
              {recentIzin.map((izin) => {
                const p = izin.profiles as { nama: string; nim: string } | null
                return (
                  <div
                    key={izin.id}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-background p-3 transition-colors hover:bg-muted/30"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-sm text-foreground">{p?.nama ?? '-'}</p>
                      <p className="text-xs text-muted-foreground">{p?.nim} · {izin.jenis_izin}</p>
                    </div>
                    <span className="ml-3 shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                      Pending
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-8 text-center">
              <CheckSquare className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Tidak ada perizinan menunggu.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent SPP Menunggu Verifikasi */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Pembayaran SPP Menunggu Verifikasi</CardTitle>
            <Link
              href="/pengelola/keuangan"
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Lihat semua <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentSpp && recentSpp.length > 0 ? (
            <div className="space-y-2">
              {recentSpp.map((spp) => {
                const p = spp.profiles as { nama: string; nim: string } | null
                return (
                  <div
                    key={spp.id}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-background p-3 transition-colors hover:bg-muted/30"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-sm text-foreground">{p?.nama ?? '-'}</p>
                      <p className="text-xs text-muted-foreground">{p?.nim} · {formatCurrency(spp.nominal)}</p>
                    </div>
                    <span className="ml-3 shrink-0 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
                      Menunggu
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-8 text-center">
              <CreditCard className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Tidak ada pembayaran menunggu verifikasi.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/shared/stat-card'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, CreditCard, AlertTriangle } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { CURRENT_SEMESTER } from '@/lib/constants'

export default async function MahasiswaDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'mahasiswa') redirect(`/${profile?.role ?? 'login'}`)

  const today = new Date().toISOString().split('T')[0]
  const [{ data: jadwalHariIni }, { data: sppData }, { data: pelanggaran }] = await Promise.all([
    supabase.from('jadwal_kegiatan').select('*').eq('tanggal', today).or(`target_unit.eq.${profile?.unit},target_unit.eq.gabungan`),
    supabase.from('pembayaran_spp').select('*').eq('mahasiswa_id', user.id).eq('semester', CURRENT_SEMESTER).single(),
    supabase.from('pelanggaran').select('poin').eq('mahasiswa_id', user.id),
  ])

  const totalPoin = (pelanggaran ?? []).reduce((sum: number, p: any) => sum + p.poin, 0)

  return (
    <div className="space-y-6">
      <PageHeader title={`Halo, ${profile?.nama?.split(' ')[0] ?? 'Mahasiswa'}!`} description={`Hari ini ${formatDate(new Date())}`} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Jadwal Hari Ini" value={jadwalHariIni?.length ?? 0} icon={Calendar} />
        <StatCard title="Status SPP" value={sppData ? sppData.status : 'Belum Ada'} icon={CreditCard} iconClassName="bg-blue-100" />
        <StatCard title="Total Poin Pelanggaran" value={totalPoin} icon={AlertTriangle} iconClassName={totalPoin > 0 ? 'bg-red-100' : 'bg-green-100'} />
      </div>
      {jadwalHariIni && jadwalHariIni.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Jadwal Hari Ini</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {jadwalHariIni.map((j: any) => (
                <div key={j.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="font-medium">{j.nama_kegiatan}</p><p className="text-sm text-muted-foreground">{j.jam_mulai}–{j.jam_selesai}</p></div>
                  <div className="flex gap-2"><Badge variant="secondary">{j.jenis}</Badge>{j.wajib_foto && <Badge variant="info">Foto</Badge>}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {sppData && (
        <Card>
          <CardHeader><CardTitle>Status SPP</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div><p className="font-medium">{sppData.semester}</p><p className="text-2xl font-bold mt-1">{formatCurrency(sppData.nominal)}</p></div>
              <Badge variant={sppData.status === 'lunas' ? 'success' : sppData.status === 'menunggu_verifikasi' ? 'warning' : 'destructive'}>{sppData.status}</Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
export const dynamic = 'force-dynamic'

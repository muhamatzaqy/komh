'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { formatDate, formatLabel } from '@/lib/utils'
import { CheckCircle, XCircle, Filter } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function PerizinanPage() {
  const [perizinan, setPerizinan] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIzin, setSelectedIzin] = useState<any>(null)
  const [catatan, setCatatan] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('pending')
  const { toast } = useToast()
  const supabase = createClient()

  const fetchPerizinan = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('perizinan').select('*, profiles(nama, nim, unit), jadwal_kegiatan(nama_kegiatan, tanggal)').order('created_at', { ascending: false })
    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus)
    }
    const { data } = await query
    setPerizinan(data ?? [])
    setLoading(false)
  }, [filterStatus]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fetchPerizinan() }, [fetchPerizinan])

  const handleApprove = async (status: 'approved' | 'rejected') => {
    if (!selectedIzin) return
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('perizinan').update({ status, approved_by: user?.id, approved_at: new Date().toISOString(), catatan_admin: catatan, updated_at: new Date().toISOString() }).eq('id', selectedIzin.id)
    if (error) { toast({ title: 'Error', description: 'Gagal memperbarui', variant: 'destructive' }) }
    else { toast({ title: 'Berhasil', description: status === 'approved' ? 'Izin disetujui' : 'Izin ditolak', variant: 'success' }); setSelectedIzin(null); fetchPerizinan() }
    setSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Perizinan" description="Approve atau tolak perizinan mahasiswa">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Menunggu</SelectItem>
            <SelectItem value="approved">Disetujui</SelectItem>
            <SelectItem value="rejected">Ditolak</SelectItem>
            <SelectItem value="all">Semua</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>
      <Card>
        <CardContent className="p-0">
          {loading ? <div className="space-y-3 p-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          : perizinan.length === 0 ? <p className="p-6 text-center text-muted-foreground">Tidak ada data perizinan.</p>
          : <div className="divide-y">{perizinan.map((izin: any) => (
            <div key={izin.id} className="flex items-center justify-between p-4 gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{izin.profiles?.nama ?? '-'}</p>
                  <Badge variant={izin.status === 'pending' ? 'warning' : izin.status === 'approved' ? 'success' : 'destructive'}>{formatLabel(izin.status)}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{izin.profiles?.nim} · {formatLabel(izin.jenis_izin)} · {formatDate(izin.created_at)}</p>
                {izin.jadwal_kegiatan && <p className="text-xs text-muted-foreground">Kegiatan: {izin.jadwal_kegiatan.nama_kegiatan}</p>}
              </div>
              {izin.status === 'pending' && <Button size="sm" className="shrink-0" onClick={() => { setSelectedIzin(izin); setCatatan('') }}>Review</Button>}
            </div>
          ))}</div>}
        </CardContent>
      </Card>
      <Dialog open={!!selectedIzin} onOpenChange={o => !o && setSelectedIzin(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Perizinan</DialogTitle></DialogHeader>
          {selectedIzin && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <p><span className="font-medium">Mahasiswa:</span> {selectedIzin.profiles?.nama}</p>
                <p><span className="font-medium">NIM:</span> {selectedIzin.profiles?.nim}</p>
                <p><span className="font-medium">Unit:</span> {formatLabel(selectedIzin.profiles?.unit)}</p>
                <p><span className="font-medium">Jenis:</span> {formatLabel(selectedIzin.jenis_izin)}</p>
                <p><span className="font-medium">Keterangan:</span> {selectedIzin.keterangan ?? '-'}</p>
                {selectedIzin.jadwal_kegiatan && <p><span className="font-medium">Kegiatan:</span> {selectedIzin.jadwal_kegiatan.nama_kegiatan} ({formatDate(selectedIzin.jadwal_kegiatan.tanggal)})</p>}
                {selectedIzin.bukti_foto_url && <p><span className="font-medium">Bukti: </span><a href={selectedIzin.bukti_foto_url} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm">Lihat Foto</a></p>}
              </div>
              <div className="space-y-2"><Label>Catatan Admin</Label><Textarea value={catatan} onChange={e => setCatatan(e.target.value)} placeholder="Catatan..." /></div>
              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => handleApprove('approved')} disabled={submitting}><CheckCircle className="mr-2 h-4 w-4" />Setujui</Button>
                <Button variant="destructive" className="flex-1" onClick={() => handleApprove('rejected')} disabled={submitting}><XCircle className="mr-2 h-4 w-4" />Tolak</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
export const dynamic = 'force-dynamic'

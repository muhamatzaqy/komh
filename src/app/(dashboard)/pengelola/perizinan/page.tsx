'use client'
import { useEffect, useState } from 'react'
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
import { formatDate } from '@/lib/utils'
import { CheckCircle, XCircle } from 'lucide-react'

export default function PerizinanPage() {
  const [perizinan, setPerizinan] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIzin, setSelectedIzin] = useState<any>(null)
  const [catatan, setCatatan] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const fetchPerizinan = async () => {
    setLoading(true)
    const { data } = await supabase.from('perizinan').select('*, profiles(nama, nim), jadwal_kegiatan(nama_kegiatan, tanggal)').order('created_at', { ascending: false })
    setPerizinan(data ?? [])
    setLoading(false)
  }
  useEffect(() => { fetchPerizinan() }, []) // eslint-disable-line

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
      <PageHeader title="Perizinan" description="Approve atau tolak perizinan mahasiswa" />
      <Card>
        <CardContent className="p-0">
          {loading ? <div className="space-y-3 p-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          : perizinan.length === 0 ? <p className="p-6 text-center text-muted-foreground">Tidak ada data perizinan.</p>
          : <div className="divide-y">{perizinan.map((izin: any) => (
            <div key={izin.id} className="flex items-center justify-between p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{izin.profiles?.nama ?? '-'}</p>
                  <Badge variant={izin.status === 'pending' ? 'warning' : izin.status === 'approved' ? 'success' : 'destructive'}>{izin.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{izin.profiles?.nim} · {izin.jenis_izin} · {formatDate(izin.created_at)}</p>
              </div>
              {izin.status === 'pending' && <Button size="sm" onClick={() => { setSelectedIzin(izin); setCatatan('') }}>Review</Button>}
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
                <p><span className="font-medium">Jenis:</span> {selectedIzin.jenis_izin}</p>
                <p><span className="font-medium">Keterangan:</span> {selectedIzin.keterangan ?? '-'}</p>
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

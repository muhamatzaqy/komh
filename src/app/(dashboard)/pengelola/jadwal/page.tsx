'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { type JadwalKegiatan } from '@/types'
import { jadwalSchema, type JadwalFormData } from '@/lib/validations/jadwal'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { JENIS_KEGIATAN_OPTIONS, UNIT_OPTIONS } from '@/lib/constants'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function JadwalPage() {
  const [jadwals, setJadwals] = useState<JadwalKegiatan[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingJadwal, setEditingJadwal] = useState<JadwalKegiatan | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()
  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<JadwalFormData>({ resolver: zodResolver(jadwalSchema), defaultValues: { wajib_foto: false } })
  const wajibFoto = watch('wajib_foto')

  const fetchJadwals = async () => {
    setLoading(true)
    const { data } = await supabase.from('jadwal_kegiatan').select('*').order('tanggal', { ascending: false })
    setJadwals(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchJadwals() }, []) // eslint-disable-line

  const onSubmit = async (data: JadwalFormData) => {
    setSubmitting(true)
    try {
      const payload = { ...data, batas_absen: data.batas_absen || null, updated_at: new Date().toISOString() }
      if (editingJadwal) {
        const { error } = await supabase.from('jadwal_kegiatan').update(payload).eq('id', editingJadwal.id)
        if (error) throw error
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        const { error } = await supabase.from('jadwal_kegiatan').insert({ ...payload, created_by: user?.id })
        if (error) throw error
      }
      toast({ title: 'Berhasil', description: 'Jadwal tersimpan', variant: 'success' })
      setDialogOpen(false); fetchJadwals()
    } catch { toast({ title: 'Error', description: 'Gagal menyimpan', variant: 'destructive' }) }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin hapus jadwal ini?')) return
    await supabase.from('jadwal_kegiatan').delete().eq('id', id)
    fetchJadwals()
    toast({ title: 'Berhasil', description: 'Jadwal dihapus', variant: 'success' })
  }

  const openCreate = () => { setEditingJadwal(null); reset({ wajib_foto: false }); setDialogOpen(true) }
  const openEdit = (j: JadwalKegiatan) => {
    setEditingJadwal(j)
    reset({ nama_kegiatan: j.nama_kegiatan, jenis: j.jenis, target_unit: j.target_unit, tanggal: j.tanggal, jam_mulai: j.jam_mulai, jam_selesai: j.jam_selesai, batas_absen: j.batas_absen ?? '', wajib_foto: j.wajib_foto })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Jadwal Kegiatan" description="Kelola jadwal ngaji dan kegiatan">
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Tambah Jadwal</Button>
      </PageHeader>
      <Card>
        <CardContent className="p-0">
          {loading ? <div className="space-y-3 p-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          : jadwals.length === 0 ? <p className="p-6 text-center text-muted-foreground">Belum ada jadwal.</p>
          : <div className="divide-y">{jadwals.map(j => (
            <div key={j.id} className="flex items-center justify-between p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{j.nama_kegiatan}</p>
                  <Badge variant="secondary">{j.jenis}</Badge>
                  {j.wajib_foto && <Badge variant="info">Foto Wajib</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{formatDate(j.tanggal)} · {j.jam_mulai}–{j.jam_selesai} · {j.target_unit}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => openEdit(j)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(j.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}</div>}
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingJadwal ? 'Edit Jadwal' : 'Tambah Jadwal'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2"><Label>Nama Kegiatan</Label><Input {...register('nama_kegiatan')} placeholder="Ngaji Kitab Kuning" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Jenis</Label>
                <Select onValueChange={v => setValue('jenis', v as JadwalFormData['jenis'])} defaultValue={editingJadwal?.jenis}>
                  <SelectTrigger><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
                  <SelectContent>{JENIS_KEGIATAN_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Target Unit</Label>
                <Select onValueChange={v => setValue('target_unit', v as JadwalFormData['target_unit'])} defaultValue={editingJadwal?.target_unit}>
                  <SelectTrigger><SelectValue placeholder="Pilih unit" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gabungan">Gabungan</SelectItem>
                    {UNIT_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Tanggal</Label><Input {...register('tanggal')} type="date" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Jam Mulai</Label><Input {...register('jam_mulai')} type="time" /></div>
              <div className="space-y-2"><Label>Jam Selesai</Label><Input {...register('jam_selesai')} type="time" /></div>
              <div className="space-y-2"><Label>Batas Absen</Label><Input {...register('batas_absen')} type="time" /></div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <input type="checkbox" id="wajib_foto" checked={wajibFoto} onChange={e => setValue('wajib_foto', e.target.checked)} className="h-4 w-4" />
              <Label htmlFor="wajib_foto" className="cursor-pointer">Wajib Foto Selfie</Label>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingJadwal ? 'Simpan Perubahan' : 'Tambah Jadwal'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export const dynamic = 'force-dynamic'

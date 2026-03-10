'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { JENIS_KEGIATAN_OPTIONS, UNIT_OPTIONS } from '@/lib/constants'
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

export default function LaporanPage() {
  const [exportType, setExportType] = useState<'presensi' | 'keuangan'>('presensi')
  const [filterJenis, setFilterJenis] = useState<string>('all')
  const [filterBulan, setFilterBulan] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [filterUnit, setFilterUnit] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const getMonthRange = (bulan: string) => {
    const [year, month] = bulan.split('-').map(Number)
    const start = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const end = new Date(year, month, 0).toISOString().split('T')[0]
    return { start, end }
  }

  const fetchPresensiData = useCallback(async () => {
    const { start, end } = getMonthRange(filterBulan)

    let jadwalQuery = supabase.from('jadwal_kegiatan').select('id').gte('tanggal', start).lte('tanggal', end)
    if (filterJenis !== 'all') jadwalQuery = jadwalQuery.eq('jenis', filterJenis)
    const { data: jadwals } = await jadwalQuery
    const jadwalIds = (jadwals ?? []).map((j: any) => j.id)

    if (jadwalIds.length === 0) return []

    let query = supabase.from('presensi').select('*, profiles(nama, nim, unit), jadwal_kegiatan(nama_kegiatan, tanggal, jenis)').in('jadwal_id', jadwalIds).order('created_at', { ascending: false })

    if (filterUnit !== 'all') {
      const { data: profiles } = await supabase.from('profiles').select('id').eq('unit', filterUnit)
      const profileIds = (profiles ?? []).map((p: any) => p.id)
      if (profileIds.length === 0) return []
      query = query.in('mahasiswa_id', profileIds)
    }

    const { data } = await query
    return data ?? []
  }, [filterBulan, filterJenis, filterUnit])

  const fetchKeuanganData = useCallback(async () => {
    const { start, end } = getMonthRange(filterBulan)
    const endDateTime = `${end}T23:59:59`
    let query = supabase.from('pembayaran_spp').select('*, profiles(nama, nim, unit)').gte('created_at', start).lte('created_at', endDateTime).order('created_at', { ascending: false })

    if (filterUnit !== 'all') {
      const { data: profiles } = await supabase.from('profiles').select('id').eq('unit', filterUnit)
      const profileIds = (profiles ?? []).map((p: any) => p.id)
      if (profileIds.length === 0) return []
      query = query.in('mahasiswa_id', profileIds)
    }

    const { data } = await query
    return data ?? []
  }, [filterBulan, filterUnit])

  const loadPreview = useCallback(async () => {
    setPreviewLoading(true)
    try {
      if (exportType === 'presensi') {
        const data = await fetchPresensiData()
        setPreviewData(data.slice(0, 10))
      } else {
        const data = await fetchKeuanganData()
        setPreviewData(data.slice(0, 10))
      }
    } finally {
      setPreviewLoading(false)
    }
  }, [exportType, fetchPresensiData, fetchKeuanganData])

  useEffect(() => { loadPreview() }, [loadPreview])

  const calcPersentase = (data: any[]) => {
    const mahasiswaMap: Record<string, { nama: string; nim: string; hadir: number; izin: number; alpha: number; total: number }> = {}
    data.forEach((p: any) => {
      const id = p.mahasiswa_id
      if (!mahasiswaMap[id]) mahasiswaMap[id] = { nama: p.profiles?.nama ?? '-', nim: p.profiles?.nim ?? '-', hadir: 0, izin: 0, alpha: 0, total: 0 }
      mahasiswaMap[id].total++
      if (p.status === 'hadir') mahasiswaMap[id].hadir++
      else if (p.status === 'izin') mahasiswaMap[id].izin++
      else mahasiswaMap[id].alpha++
    })
    return mahasiswaMap
  }

  const exportExcel = async () => {
    setLoading(true)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()

      if (exportType === 'presensi') {
        const data = await fetchPresensiData()
        const rows = data.map((p: any) => ({
          Nama: p.profiles?.nama,
          NIM: p.profiles?.nim,
          Unit: p.profiles?.unit,
          Kegiatan: p.jadwal_kegiatan?.nama_kegiatan,
          Jenis: p.jadwal_kegiatan?.jenis,
          Tanggal: p.jadwal_kegiatan?.tanggal ? formatDate(p.jadwal_kegiatan.tanggal) : '',
          Status: p.status,
        }))
        const ws = XLSX.utils.json_to_sheet(rows)
        XLSX.utils.book_append_sheet(wb, ws, 'Presensi')

        // Persentase kehadiran sheet
        const mahasiswaMap = calcPersentase(data)
        const summaryRows = Object.values(mahasiswaMap).map(m => ({
          Nama: m.nama,
          NIM: m.nim,
          'Total Kegiatan': m.total,
          Hadir: m.hadir,
          Izin: m.izin,
          Alpha: m.alpha,
          'Persentase Hadir (%)': m.total > 0 ? ((m.hadir / m.total) * 100).toFixed(1) : '0.0',
        }))
        const wsSummary = XLSX.utils.json_to_sheet(summaryRows)
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Persentase Kehadiran')
      } else {
        const data = await fetchKeuanganData()
        const rows = data.map((s: any) => ({
          Nama: s.profiles?.nama,
          NIM: s.profiles?.nim,
          Unit: s.profiles?.unit,
          Semester: s.semester,
          Nominal: s.nominal,
          Status: s.status,
        }))
        const ws = XLSX.utils.json_to_sheet(rows)
        XLSX.utils.book_append_sheet(wb, ws, 'Keuangan')
      }

      XLSX.writeFile(wb, `laporan-${exportType}-${filterBulan}.xlsx`)
      toast({ title: 'Berhasil', description: 'File Excel diunduh', variant: 'success' })
    } catch { toast({ title: 'Error', description: 'Gagal export', variant: 'destructive' }) }
    finally { setLoading(false) }
  }

  const exportPDF = async () => {
    setLoading(true)
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF()
      const bulanLabel = new Date(filterBulan + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      doc.setFontSize(16)
      doc.text(exportType === 'presensi' ? 'Laporan Presensi' : 'Laporan Keuangan SPP', 14, 20)
      doc.setFontSize(10)
      doc.text(`Bulan: ${bulanLabel}`, 14, 28)
      if (filterJenis !== 'all' && exportType === 'presensi') doc.text(`Jenis Kegiatan: ${filterJenis}`, 14, 34)
      if (filterUnit !== 'all') doc.text(`Unit: ${filterUnit}`, 14, filterJenis !== 'all' && exportType === 'presensi' ? 40 : 34)
      doc.text(`Dicetak: ${formatDate(new Date())}`, 14, 46)

      if (exportType === 'presensi') {
        const data = await fetchPresensiData()
        autoTable(doc, {
          startY: 52,
          head: [['Nama', 'NIM', 'Kegiatan', 'Tanggal', 'Status']],
          body: data.map((p: any) => [p.profiles?.nama, p.profiles?.nim, p.jadwal_kegiatan?.nama_kegiatan, p.jadwal_kegiatan?.tanggal ? formatDate(p.jadwal_kegiatan.tanggal) : '', p.status])
        })

        // Persentase kehadiran summary
        const mahasiswaMap = calcPersentase(data)
        const summaryRows = Object.values(mahasiswaMap).map(m => [
          m.nama, m.nim,
          String(m.total), String(m.hadir), String(m.izin), String(m.alpha),
          m.total > 0 ? `${((m.hadir / m.total) * 100).toFixed(1)}%` : '0.0%',
        ])
        doc.addPage()
        doc.setFontSize(13)
        doc.text('Persentase Kehadiran per Mahasiswa', 14, 20)
        autoTable(doc, {
          startY: 26,
          head: [['Nama', 'NIM', 'Total', 'Hadir', 'Izin', 'Alpha', 'Persentase']],
          body: summaryRows,
        })
      } else {
        const data = await fetchKeuanganData()
        autoTable(doc, {
          startY: 52,
          head: [['Nama', 'NIM', 'Semester', 'Nominal', 'Status']],
          body: data.map((s: any) => [s.profiles?.nama, s.profiles?.nim, s.semester, formatCurrency(s.nominal), s.status])
        })
      }

      doc.save(`laporan-${exportType}-${filterBulan}.pdf`)
      toast({ title: 'Berhasil', description: 'File PDF diunduh', variant: 'success' })
    } catch { toast({ title: 'Error', description: 'Gagal export', variant: 'destructive' }) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Export Laporan" description="Unduh laporan dalam format Excel atau PDF" />
      <Card>
        <CardHeader><CardTitle>Pengaturan Laporan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2"><Label>Jenis Laporan</Label>
              <Select value={exportType} onValueChange={v => setExportType(v as 'presensi' | 'keuangan')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="presensi">Laporan Presensi</SelectItem><SelectItem value="keuangan">Laporan Keuangan SPP</SelectItem></SelectContent>
              </Select>
            </div>
            {exportType === 'presensi' && (
              <div className="space-y-2"><Label>Jenis Kegiatan</Label>
                <Select value={filterJenis} onValueChange={setFilterJenis}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kegiatan</SelectItem>
                    {JENIS_KEGIATAN_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2"><Label>Bulan</Label>
              <Input type="month" value={filterBulan} onChange={e => setFilterBulan(e.target.value)} />
            </div>
            <div className="space-y-2"><Label>Unit</Label>
              <Select value={filterUnit} onValueChange={setFilterUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Unit</SelectItem>
                  {UNIT_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-4">
            <Button onClick={exportExcel} disabled={loading} className="gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}Export Excel</Button>
            <Button onClick={exportPDF} disabled={loading} variant="outline" className="gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}Export PDF</Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Table */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-semibold">Preview Data (10 baris pertama)</CardTitle></CardHeader>
        <CardContent className="p-0">
          {previewLoading ? (
            <div className="space-y-2 p-4">{[...Array(3)].map((_, i) => <div key={i} className="h-8 w-full animate-pulse rounded bg-muted" />)}</div>
          ) : previewData.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Tidak ada data untuk filter yang dipilih.</p>
          ) : exportType === 'presensi' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">{['Nama', 'NIM', 'Kegiatan', 'Tanggal', 'Status'].map(h => <th key={h} className="px-4 py-2 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {previewData.map((p: any) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2">{p.profiles?.nama ?? '-'}</td>
                      <td className="px-4 py-2">{p.profiles?.nim ?? '-'}</td>
                      <td className="px-4 py-2">{p.jadwal_kegiatan?.nama_kegiatan ?? '-'}</td>
                      <td className="px-4 py-2">{p.jadwal_kegiatan?.tanggal ? formatDate(p.jadwal_kegiatan.tanggal) : '-'}</td>
                      <td className="px-4 py-2"><Badge variant={p.status === 'hadir' ? 'success' : p.status === 'izin' ? 'warning' : 'destructive'}>{p.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">{['Nama', 'NIM', 'Semester', 'Nominal', 'Status'].map(h => <th key={h} className="px-4 py-2 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {previewData.map((s: any) => (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2">{s.profiles?.nama ?? '-'}</td>
                      <td className="px-4 py-2">{s.profiles?.nim ?? '-'}</td>
                      <td className="px-4 py-2">{s.semester}</td>
                      <td className="px-4 py-2">{formatCurrency(s.nominal)}</td>
                      <td className="px-4 py-2"><Badge variant={s.status === 'lunas' ? 'success' : s.status === 'menunggu_verifikasi' ? 'warning' : 'secondary'}>{s.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
export const dynamic = 'force-dynamic'

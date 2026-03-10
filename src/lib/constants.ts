export const UNIT_OPTIONS = [
  { value: 'mahad_aly', label: "Ma'had Aly" },
  { value: 'lkim', label: 'LKIM' },
] as const

export const ROLE_OPTIONS = [
  { value: 'mahasiswa', label: 'Mahasiswa' },
  { value: 'pengurus', label: 'Pengurus' },
  { value: 'pengelola', label: 'Pengelola' },
] as const

export const JENIS_KEGIATAN_OPTIONS = [
  { value: 'ngaji', label: 'Ngaji' },
  { value: 'rapat', label: 'Rapat' },
  { value: 'roan', label: 'Roan' },
  { value: 'minat_bakat', label: 'Minat Bakat' },
  { value: 'lainnya', label: 'Lainnya' },
] as const

export const JENIS_IZIN_OPTIONS = [
  { value: 'sakit', label: 'Sakit' },
  { value: 'keperluan_keluarga', label: 'Keperluan Keluarga' },
  { value: 'akademik', label: 'Akademik' },
  { value: 'lainnya', label: 'Lainnya' },
] as const

export const SPP_NOMINAL: Record<string, number> = { mahad_aly: 500000, lkim: 600000 }
export const CURRENT_SEMESTER = '2024/2025 Ganjil'
export const IMAGE_COMPRESSION_OPTIONS = { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true }

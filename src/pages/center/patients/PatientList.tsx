import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search, User, Phone, Edit } from 'lucide-react'
import api from '../../../services/api'
import { Patient, PageResponse } from '../../../types'
import { fmtDateTime } from '../../../utils/date'

export default function PatientList() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading } = useQuery<PageResponse<Patient>>({
    queryKey: ['patients', debouncedSearch, page],
    queryFn: () => api.get('/patients', { params: { search: debouncedSearch || undefined, page, size: 20 } }).then(r => r.data),
  })

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Patients</h1>
        <Link to="/center/patients/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New Patient
        </Link>
      </div>

      {/* Search */}
      <div className="card p-4 mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input pl-10" placeholder="Search by name, mobile, or patient ID..." />
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {['Patient ID', 'Name', 'Age/Gender', 'Mobile', 'Referring Doctor', 'Registered', 'Actions'].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="td">
                    <div className="animate-pulse h-4 bg-gray-100 rounded" />
                  </td></tr>
                ))
              ) : data?.content.length === 0 ? (
                <tr><td colSpan={7} className="td text-center py-10 text-gray-400">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No patients found
                </td></tr>
              ) : data?.content.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="td font-mono text-xs">{p.patientCode}</td>
                  <td className="td font-medium">{p.fullName}</td>
                  <td className="td text-gray-500">
                    {[p.age ? `${p.age}Y` : null, p.gender].filter(Boolean).join(' / ') || '—'}
                  </td>
                  <td className="td">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-400" /> {p.mobile}
                    </span>
                  </td>
                  <td className="td text-gray-500">{p.referringDoctor ?? '—'}</td>
                  <td className="td text-gray-500 text-xs">{fmtDateTime(p.createdAt)}</td>
                  <td className="td">
                    <Link to={`/center/patients/${p.id}/edit`} className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 text-xs font-medium">
                      <Edit className="w-3 h-3" /> Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-gray-500">
              {data.totalElements} patients total
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className="btn-secondary text-xs py-1.5">Previous</button>
              <span className="px-3 py-1.5 text-sm text-gray-600">Page {page + 1} / {data.totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages - 1} className="btn-secondary text-xs py-1.5">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

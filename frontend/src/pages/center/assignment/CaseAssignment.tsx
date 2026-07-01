import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserCheck, Loader2, Stethoscope } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../services/api'
import { Study, Doctor, PageResponse, StudyStatus } from '../../../types'
import StatusBadge from '../../../components/common/StatusBadge'
import Modal from '../../../components/common/Modal'

const ASSIGNABLE: StudyStatus[] = ['IMAGE_AVAILABLE', 'SCAN_COMPLETED', 'READY_FOR_SCAN']

export default function CaseAssignment() {
  const qc = useQueryClient()
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null)

  const { data: studiesData } = useQuery<PageResponse<Study>>({
    queryKey: ['assignable-studies'],
    queryFn: () => api.get('/studies', { params: { size: 50 } }).then(r => r.data),
  })

  const { data: doctors } = useQuery<Doctor[]>({
    queryKey: ['doctors'],
    queryFn: () => api.get('/assignments/doctors').then(r => r.data),
  })

  const assignMutation = useMutation({
    mutationFn: ({ studyId, doctorId }: { studyId: number; doctorId: number }) =>
      api.post('/assignments', { studyId, doctorId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignable-studies'] })
      toast.success('Case assigned successfully')
      setSelectedStudy(null)
      setSelectedDoctor(null)
    },
    onError: () => toast.error('Assignment failed'),
  })

  const assignableStudies = (studiesData?.content ?? []).filter(s =>
    ASSIGNABLE.includes(s.status) || s.status === 'REGISTERED' || s.status === 'BILLED'
  )

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Case Assignment</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Studies list */}
        <div className="card">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold text-gray-800">Studies Awaiting Assignment</h2>
          </div>
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {assignableStudies.length === 0 ? (
              <p className="text-center py-10 text-gray-400">
                <Stethoscope className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No studies pending assignment
              </p>
            ) : assignableStudies.map(s => (
              <div key={s.id} className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                selectedStudy?.id === s.id ? 'bg-primary-50 border-l-4 border-primary-500' : ''
              }`} onClick={() => setSelectedStudy(s)}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded">{s.labNo}</span>
                    <div className="font-medium mt-1">{s.patientName}</div>
                    <div className="text-sm text-gray-500">{s.studyDescription} · {s.modality}</div>
                    {s.assignedDoctorName && (
                      <div className="text-xs text-green-600 mt-1">Assigned: {s.assignedDoctorName}</div>
                    )}
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Doctors */}
        <div className="card">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold text-gray-800">Available Radiologists</h2>
          </div>
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {(doctors ?? []).map(d => (
              <div key={d.id} className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                selectedDoctor === d.id ? 'bg-primary-50 border-l-4 border-primary-500' : ''
              }`} onClick={() => setSelectedDoctor(d.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                      {d.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium">{d.name}</div>
                      <div className="text-sm text-gray-500">{d.specialization ?? 'General Radiology'}</div>
                      {d.qualification && <div className="text-xs text-gray-400">{d.qualification}</div>}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    d.pendingCases === 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {d.pendingCases} pending
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Assignment action */}
      {selectedStudy && selectedDoctor && (
        <div className="mt-6 card p-6 border-2 border-primary-200 bg-primary-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800">Confirm Assignment</h3>
              <p className="text-sm text-gray-600 mt-1">
                Assign <strong>{selectedStudy.labNo}</strong> ({selectedStudy.patientName}) to{' '}
                <strong>{doctors?.find(d => d.id === selectedDoctor)?.name}</strong>
              </p>
            </div>
            <button onClick={() => assignMutation.mutate({ studyId: selectedStudy.id, doctorId: selectedDoctor })}
              disabled={assignMutation.isPending} className="btn-primary">
              {assignMutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Assigning...</>
                : <><UserCheck className="w-4 h-4" /> Assign Case</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

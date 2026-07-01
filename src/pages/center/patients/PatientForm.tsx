import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../services/api'
import { Patient } from '../../../types'

const schema = z.object({
  fullName:        z.string().min(2, 'Name must be at least 2 characters'),
  mobile:          z.string().min(10, 'Enter a valid mobile number'),
  age:             z.coerce.number().int().positive().optional().or(z.literal('')),
  gender:          z.string().optional(),
  dateOfBirth:     z.string().optional(),
  email:           z.string().email().optional().or(z.literal('')),
  address:         z.string().optional(),
  referringDoctor: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function PatientForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isEdit = Boolean(id)

  const { data: existing } = useQuery<Patient>({
    queryKey: ['patient', id],
    queryFn: () => api.get(`/patients/${id}`).then(r => r.data),
    enabled: isEdit,
  })

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: existing ? {
      fullName: existing.fullName,
      mobile: existing.mobile,
      age: existing.age ?? '',
      gender: existing.gender ?? '',
      dateOfBirth: existing.dateOfBirth ?? '',
      email: existing.email ?? '',
      address: existing.address ?? '',
      referringDoctor: existing.referringDoctor ?? '',
    } : undefined,
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => isEdit
      ? api.put(`/patients/${id}`, data)
      : api.post('/patients', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] })
      toast.success(isEdit ? 'Patient updated' : 'Patient registered')
      navigate('/center/patients')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Something went wrong')
    },
  })

  const onSubmit = (data: FormData) => mutation.mutate(data)

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary p-2">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="page-title">{isEdit ? 'Edit Patient' : 'Register New Patient'}</h1>
        </div>
      </div>

      <div className="card p-6 max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="label">Full Name *</label>
              <input {...register('fullName')} className="input" placeholder="Patient full name" />
              {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
            </div>

            <div>
              <label className="label">Mobile Number *</label>
              <input {...register('mobile')} className="input" placeholder="10-digit mobile" />
              {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile.message}</p>}
            </div>

            <div>
              <label className="label">Email</label>
              <input {...register('email')} type="email" className="input" placeholder="email@example.com" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Date of Birth</label>
              <input {...register('dateOfBirth')} type="date" className="input" />
            </div>

            <div>
              <label className="label">Age (years)</label>
              <input {...register('age')} type="number" className="input" placeholder="Age" />
              {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age.message}</p>}
            </div>

            <div>
              <label className="label">Gender</label>
              <select {...register('gender')} className="input">
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="label">Referring Doctor</label>
              <input {...register('referringDoctor')} className="input" placeholder="Dr. Name" />
            </div>

            <div className="md:col-span-2">
              <label className="label">Address</label>
              <textarea {...register('address')} className="input resize-none" rows={3} placeholder="Full address" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> {isEdit ? 'Update Patient' : 'Register Patient'}</>}
            </button>
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

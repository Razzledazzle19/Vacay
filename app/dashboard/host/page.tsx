'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Property, Job } from '@/types/database'

interface Cleaner {
  id: string
  full_name: string
}

interface PropertyWithJobs extends Property {
  pendingJobs: number
  jobs: Job[]
}

const emptyPropertyForm = { name: '', address: '' }
const emptyJobForm = { scheduled_date: '', cleaner_id: '', notes: '' }

export default function HostDashboard() {
  const [properties, setProperties] = useState<PropertyWithJobs[]>([])
  const [cleaners, setCleaners] = useState<Cleaner[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyPropertyForm)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function fetchCleaners() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'cleaner')
      .order('full_name')
    if (data) setCleaners(data)
  }

  async function fetchProperties() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        jobs(id, property_id, cleaner_id, status, scheduled_date, notes, created_at)
      `)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    if (error || !data) return

    const mapped: PropertyWithJobs[] = (data as (Property & { jobs: Job[] })[]).map((p) => ({
      id: p.id,
      owner_id: p.owner_id,
      name: p.name,
      address: p.address,
      created_at: p.created_at,
      jobs: p.jobs ?? [],
      pendingJobs: (p.jobs ?? []).filter((j) => j.status === 'pending').length,
    }))

    setProperties(mapped)
    setLoading(false)
  }

  useEffect(() => {
    fetchProperties()
    fetchCleaners()
  }, [])

  async function handleAddProperty(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setFormError('Not authenticated.')
      setSubmitting(false)
      return
    }

    const { error } = await supabase.from('properties').insert({
      owner_id: user.id,
      name: form.name.trim(),
      address: form.address.trim(),
    })

    if (error) {
      setFormError(error.message)
      setSubmitting(false)
      return
    }

    setForm(emptyPropertyForm)
    setShowForm(false)
    setSubmitting(false)
    fetchProperties()
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Host Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your properties</p>
          </div>
          <button
            onClick={() => {
              setShowForm((v) => !v)
              setForm(emptyPropertyForm)
              setFormError(null)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm
                       hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
          >
            {showForm ? (
              'Cancel'
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
                Add property
              </>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Inline add-property form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">New property</h2>
            <form onSubmit={handleAddProperty} noValidate className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="prop-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Property name
                  </label>
                  <input
                    id="prop-name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    disabled={submitting}
                    placeholder="Beach House"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               disabled:bg-gray-50 disabled:text-gray-400 transition"
                  />
                </div>
                <div>
                  <label htmlFor="prop-address" className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    id="prop-address"
                    type="text"
                    required
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    disabled={submitting}
                    placeholder="123 Ocean Drive, Miami FL"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               disabled:bg-gray-50 disabled:text-gray-400 transition"
                  />
                </div>
              </div>

              {formError && (
                <p role="alert" className="text-sm text-red-600">
                  {formError}
                </p>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !form.name.trim() || !form.address.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm
                             hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                             disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  {submitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save property'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Property grid */}
        {loading ? (
          <div className="flex justify-center py-24">
            <svg className="h-8 w-8 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none" aria-label="Loading">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
        ) : properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="rounded-full bg-gray-100 p-4 mb-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">No properties yet</p>
            <p className="text-sm text-gray-500 mt-1">Click &quot;Add property&quot; to get started.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                cleaners={cleaners}
                onJobCreated={fetchProperties}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
}

function PropertyCard({
  property,
  cleaners,
  onJobCreated,
}: {
  property: PropertyWithJobs
  cleaners: Cleaner[]
  onJobCreated: () => void
}) {
  const [showJobForm, setShowJobForm] = useState(false)
  const [jobForm, setJobForm] = useState(emptyJobForm)
  const [submitting, setSubmitting] = useState(false)
  const [jobError, setJobError] = useState<string | null>(null)

  async function handleScheduleClean(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setJobError(null)

    const { error } = await supabase.from('jobs').insert({
      property_id: property.id,
      cleaner_id: jobForm.cleaner_id || null,
      scheduled_date: jobForm.scheduled_date,
      notes: jobForm.notes.trim() || null,
      status: 'pending',
    })

    if (error) {
      setJobError(error.message)
      setSubmitting(false)
      return
    }

    setJobForm(emptyJobForm)
    setShowJobForm(false)
    setSubmitting(false)
    onJobCreated()
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
      {/* Card body */}
      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Name + address */}
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900 leading-snug">{property.name}</h3>
          <p className="text-sm text-gray-500 mt-1 flex items-start gap-1.5">
            <svg className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 15.23 17 12.977 17 10c0-3.866-3.134-7-7-7S3 6.134 3 10c0 2.977 1.698 5.23 3.354 6.585.83.799 1.654 1.38 2.274 1.764a9.24 9.24 0 00.757.434 5.74 5.74 0 00.282.14l.018.008.006.003zM10 11.25a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z" clipRule="evenodd" />
            </svg>
            {property.address}
          </p>
        </div>

        {/* Pending jobs badge + schedule button */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending</span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                property.pendingJobs > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {property.pendingJobs}
            </span>
          </div>
          <button
            onClick={() => {
              setShowJobForm((v) => !v)
              setJobForm(emptyJobForm)
              setJobError(null)
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700
                       hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition"
          >
            {showJobForm ? 'Cancel' : (
              <>
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
                Schedule clean
              </>
            )}
          </button>
        </div>

        {/* Inline schedule-clean form */}
        {showJobForm && (
          <form onSubmit={handleScheduleClean} noValidate className="border-t border-gray-100 pt-4 space-y-3">
            <div>
              <label htmlFor={`date-${property.id}`} className="block text-xs font-medium text-gray-700 mb-1">
                Scheduled date <span className="text-red-500">*</span>
              </label>
              <input
                id={`date-${property.id}`}
                type="date"
                required
                value={jobForm.scheduled_date}
                onChange={(e) => setJobForm((f) => ({ ...f, scheduled_date: e.target.value }))}
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                           disabled:bg-gray-50 disabled:text-gray-400 transition"
              />
            </div>

            <div>
              <label htmlFor={`cleaner-${property.id}`} className="block text-xs font-medium text-gray-700 mb-1">
                Assign cleaner
              </label>
              <select
                id={`cleaner-${property.id}`}
                value={jobForm.cleaner_id}
                onChange={(e) => setJobForm((f) => ({ ...f, cleaner_id: e.target.value }))}
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                           disabled:bg-gray-50 disabled:text-gray-400 transition"
              >
                <option value="">Unassigned</option>
                {cleaners.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={`notes-${property.id}`} className="block text-xs font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id={`notes-${property.id}`}
                rows={2}
                value={jobForm.notes}
                onChange={(e) => setJobForm((f) => ({ ...f, notes: e.target.value }))}
                disabled={submitting}
                placeholder="Any special instructions..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm resize-none
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                           disabled:bg-gray-50 disabled:text-gray-400 transition"
              />
            </div>

            {jobError && (
              <p role="alert" className="text-xs text-red-600">{jobError}</p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !jobForm.scheduled_date}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm
                           hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                           disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {submitting ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save job'
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Jobs list */}
      {property.jobs.length > 0 && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Jobs</p>
          {property.jobs
            .slice()
            .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime())
            .map((job) => (
              <div key={job.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  {new Date(job.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    STATUS_STYLES[job.status] ?? 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {STATUS_LABELS[job.status] ?? job.status}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

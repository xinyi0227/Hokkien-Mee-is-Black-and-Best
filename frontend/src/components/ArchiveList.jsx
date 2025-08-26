import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import Header from './header'
import { FiRotateCcw, FiTrash2 } from 'react-icons/fi'

const COLOR = {
  del:  'bg-[#c71f37] text-white hover:bg-[#f08080] hover:text-white',
  save: 'bg-[#aad576] text-white hover:bg-[#c1fba4] hover:text-white',
  edit: 'bg-[#8b2fc9] text-white hover:bg-[#d2b7e5] hover:text-white',
  other:'bg-[#1985a1] text-white hover:bg-[#89c2d9] hover:text-white',
}

const fmtDateShort = (isoOrYmd) => {
  if (!isoOrYmd) return '—'
  const d = new Date(isoOrYmd)
  if (Number.isNaN(d.getTime())) return isoOrYmd
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const ROW_COLS = 'grid grid-cols-[minmax(0,1fr)_220px_160px_140px_48px] items-center'
const FILTERS = { MINE: 'mine', DEPT: 'dept', ALL: 'all' }

const ArchiveList = ({ currentUser }) => {
  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  const [filter, setFilter] = useState(() =>
    currentUser?.role === 'boss' ? FILTERS.ALL : FILTERS.MINE
  )
  useEffect(() => {
    if (currentUser?.role === 'boss' && filter !== FILTERS.ALL) setFilter(FILTERS.ALL)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role])

  useEffect(() => {
    ;(async () => {
      try {
        const [{ data: tasksData, error: tErr }, { data: empData, error: eErr }] =
          await Promise.all([
            supabase
              .from('task')
              .select('*')
              .eq('status', 'archieve')
              .order('updated_at', { ascending: false }),
            supabase
              .from('employee')
              .select('employee_id, employee_name, department_id, role')
              .order('employee_name', { ascending: true }),
          ])
        if (tErr) throw tErr
        if (eErr) throw eErr
        setTasks(tasksData || [])
        setEmployees(empData || [])
      } catch (err) {
        console.error('Error loading archive:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const empMap = useMemo(() => {
    const m = new Map()
    for (const e of employees) m.set(String(e.employee_id), e)
    return m
  }, [employees])

  const filtered = useMemo(() => {
    if (!currentUser) return tasks
    if (filter === FILTERS.ALL) return tasks
    if (filter === FILTERS.MINE) {
      return tasks.filter((t) => String(t.assignee_id) === String(currentUser.employee_id))
    }
    return tasks.filter((t) => {
      const emp = empMap.get(String(t.assignee_id))
      return emp && emp.department_id === currentUser.department_id
    })
  }, [tasks, filter, currentUser, empMap])

  const restoreTask = useCallback(async (task) => {
    try {
      const now = new Date().toISOString()

      const { error: upErr } = await supabase
        .from('task')
        .update({ status: 'in progress', updated_at: now })
        .eq('task_id', task.task_id)
      if (upErr) throw upErr

      const auditRow = {
        task_id: task.task_id,
        actor_id: currentUser?.employee_id ?? null,
        field: 'status',
        old_value: 'archieve',
        new_value: 'in progress',
        created_at: now,
      }
      const { error: auditErr } = await supabase.from('task_audit').insert([auditRow])
      if (auditErr) console.error('audit insert failed:', auditErr)

      setTasks((prev) => prev.filter((t) => t.task_id !== task.task_id))
    } catch (err) {
      console.error('Restore failed:', err)
      alert('Restore failed.')
    }
  }, [currentUser?.employee_id])

  const deleteTask = useCallback(async (task_id) => {
    const ok = window.confirm(
      "Are you sure you want to permanently delete this task? This action cannot be undone."
    )
    if (!ok) return

    try {
      const { error } = await supabase.from('task').delete().eq('task_id', task_id)
      if (error) throw error
      setTasks((prev) => prev.filter((t) => t.task_id !== task_id))
    } catch (err) {
      console.error('Delete failed:', err)
      alert('Delete failed.')
    }
  }, [])

  const filterBtn = (active) =>
    `px-3 py-1.5 rounded-lg text-sm border transition ${
      active
        ? 'bg-[#1985a1] text-white border-[#1985a1]'
        : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-[#89c2d9] hover:border-[#89c2d9] hover:text-white'
    }`

  if (loading) return <div className="text-center py-10 text-gray-700 dark:text-gray-200">Loading…</div>

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto p-6 text-gray-900 dark:text-gray-100">
          <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Archived Tasks</h1>
            <div className="flex items-center gap-2">
              <button className={filterBtn(filter === FILTERS.MINE)} onClick={() => setFilter(FILTERS.MINE)}>My</button>
              <button className={filterBtn(filter === FILTERS.DEPT)} onClick={() => setFilter(FILTERS.DEPT)}>Department</button>
              {currentUser?.role === 'boss' && (
                <button className={filterBtn(filter === FILTERS.ALL)} onClick={() => setFilter(FILTERS.ALL)}>All</button>
              )}
            </div>
          </div>

          {/* Header row */}
          <div className={`${ROW_COLS} mb-2`}>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Task</div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Assignee</div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Due date</div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Archived at</div>
          </div>

          {/* Rows */}
          <div className="space-y-2">
            {filtered.map((t) => {
              const emp = empMap.get(String(t.assignee_id))
              return (
                <div
                  key={t.task_id}
                  className={`${ROW_COLS} bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-3`}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.task_title}</div>
                    {t.task_content ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{t.task_content}</div>
                    ) : null}
                  </div>
                  <div className="truncate text-sm text-gray-700 dark:text-gray-200">
                    {emp?.employee_name || 'Unassigned'}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {fmtDateShort(t.deadline)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {fmtDateShort(t.updated_at)}
                  </div>
                  <div className="justify-self-end flex items-center gap-2">
                    <button
                      onClick={() => restoreTask(t)}
                      className={`${COLOR.save} p-1.5 rounded-md inline-flex items-center justify-center`}
                      title="Restore to In Progress"
                    >
                      <FiRotateCcw size={16} />
                    </button>
                    <button
                      onClick={() => deleteTask(t.task_id)}
                      className={`${COLOR.del} p-1.5 rounded-md inline-flex items-center justify-center`}
                      title="Delete"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-900">
                No archived tasks.
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}

export default ArchiveList

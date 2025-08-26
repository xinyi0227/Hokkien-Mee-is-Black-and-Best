import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import Header from './header'
import { FiTrash2, FiX } from 'react-icons/fi'
import CalendarView from './CalendarView'

const COLOR = {
  del:  'bg-[#c71f37] text-white hover:bg-[#f08080] hover:text-white',
  save: 'bg-[#aad576] text-white hover:bg-[#c1fba4] hover:text-white',
  edit: 'bg-[#8b2fc9] text-white hover:bg-[#d2b7e5] hover:text-white',
  other:'bg-[#1985a1] text-white hover:bg-[#89c2d9] hover:text-white',
  otherOutline:
    'border border-[#1985a1] bg-[#1985a1] text-white hover:bg-[#89c2d9] hover:text-white',
}

const toDateOnly = (v) => {
  if (!v) return ''
  const s = String(v)
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  if (m) return m[1]
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}
const today = toDateOnly(new Date())
const VIEWS = { LIST: 'list', CAL: 'calendar' }

const fmtDateShort = (v) => {
  const ymd = toDateOnly(v)
  if (!ymd) return ''
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const CANON_STATUSES = ['pending', 'in progress', 'review', 'done', 'archieve']
const normalizeStatus = (s) => {
  const x = String(s || '').trim().toLowerCase()
  if (x === 'archived') return 'archieve'
  return CANON_STATUSES.includes(x) ? x : x
}
const normalizePriority = (p) => {
  const x = String(p || '').trim().toLowerCase()
  return ['low', 'medium', 'high'].includes(x) ? x : 'low'
}

const STATUS_GROUP_ORDER = ['done', 'review', 'in progress', 'pending']
const STATUS_OPTIONS_BASE = ['pending', 'in progress', 'review', 'done']
const STATUS_META = {
  pending: { label: 'PENDING', badge: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-100' },
  'in progress': { label: 'IN PROGRESS', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  review: { label: 'REVIEW', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  done: { label: 'DONE', badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  archieve: { label: 'ARCHIVED', badge: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300' },
}

const PRIORITY_PILL = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

const ROW_COLS =
  'grid grid-cols-[minmax(0,1fr)_220px_140px_160px_120px_48px] items-center'

const FILTERS = { MINE: 'mine', DEPT: 'dept', ALL: 'all' }

const canonTask = (t) => ({
  ...t,
  status: normalizeStatus(t.status),
  urgent_level: normalizePriority(t.urgent_level),
  deadline: toDateOnly(t.deadline),
  created_at: t.created_at,
  updated_at: t.updated_at,
})

const FIELD_LABEL = {
  status: 'Status',
  task_content: 'Description',
  urgent_level: 'Priority',
  assignee_id: 'Assignee',
  deadline: 'Due date',
  task_title: 'Title',
}

const TRACKED_FIELDS = ['status', 'task_content', 'urgent_level', 'assignee_id', 'deadline', 'task_title']

const trackedSnapshotOf = (obj = {}) => {
  const snap = {}
  for (const f of TRACKED_FIELDS) {
    let v = obj[f]
    if (f === 'status') v = normalizeStatus(v)
    if (f === 'urgent_level') v = normalizePriority(v)
    if (f === 'deadline') v = toDateOnly(v)
    snap[f] = String(v ?? '')
  }
  return snap
}

const computeDiffsFromSnapshot = (beforeSnap = {}, afterObj = {}) => {
  const afterSnap = trackedSnapshotOf(afterObj)
  const diffs = []
  for (const f of TRACKED_FIELDS) {
    const before = String(beforeSnap[f] ?? '')
    const after = String(afterSnap[f] ?? '')
    if (before !== after) {
      diffs.push({ field: f, old_value: before, new_value: after })
    }
  }
  return { diffs, afterSnap }
}

const TaskList = ({ currentUser }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [view, setView] = useState(VIEWS.LIST)

  const [meetings, setMeetings] = useState([])
  const [meetingFiles, setMeetingFiles] = useState([])
  const [departments, setDepartments] = useState([])
  const [selectedMeeting, setSelectedMeeting] = useState(null)

  const [newTask, setNewTask] = useState({
    task_title: '',
    task_content: '',
    urgent_level: 'low',
    deadline: '',
    status: 'pending',
    assignee_id: '',
    comment: '',
  })
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  const [showTaskModal, setShowTaskModal] = useState(false)
  const [currentTask, setCurrentTask] = useState(null)

  const [comments, setComments] = useState([])
  const [commentBackendEnabled, setCommentBackendEnabled] = useState(true)

  const [activities, setActivities] = useState([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [newCommentBody, setNewCommentBody] = useState('')
  const [addingComment, setAddingComment] = useState(false)

  const [filter, setFilter] = useState(() =>
    currentUser?.role === 'boss' ? FILTERS.ALL : FILTERS.MINE
  )

  const savingRef = useRef(false)
  const lastCommittedSnapRef = useRef(null)

  useEffect(() => {
    if (currentUser?.role === 'boss' && filter !== FILTERS.ALL) {
      setFilter(FILTERS.ALL)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role])

  useEffect(() => {
    fetchTasks()
    fetchEmployees()
    fetchDepartments()
    fetchMeetingsAll()
    fetchMeetingFiles()
  }, [])

  useEffect(() => {
    if (location.state?.view === 'calendar') {
      setView(VIEWS.CAL)
    }
  }, [location.state])

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('task')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setTasks((data || []).map(canonTask))
      setLoading(false)
    } catch (error) {
      console.error('Error fetching tasks:', error)
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employee')
        .select('employee_id, employee_name, department_id, role')
        .order('employee_name', { ascending: true })
      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const fetchDepartments = async () => {
    try {
      const r = await fetch('/api/departments')
      const d = await r.json()
      setDepartments(d || [])
    } catch (e) { console.error('fetch departments failed:', e) }
  }

  const fetchMeetingsAll = async () => {
    try {
      const [r1, r2, r3] = await Promise.all([
        fetch('/api/meetingsToday'),
        fetch('/api/meetingsFuture'),
        fetch('/api/meetingsPast'),
      ])
      const [a, b, c] = await Promise.all([r1.json(), r2.json(), r3.json()])
      const merged = [...(a || []), ...(b || []), ...(c || [])]
      setMeetings(merged)
    } catch (e) { console.error('fetch meetings failed:', e) }
  }

  const fetchMeetingFiles = async () => {
    try {
      const r = await fetch('/api/view_meeting_files')
      const d = await r.json()
      setMeetingFiles(d || [])
    } catch (e) { console.error('fetch meeting files failed:', e) }
  }

  const hasUploadedFiles = (meetingId) =>
    meetingFiles.some(f => f.meeting === meetingId)

  const getDeptName = (deptIds) => {
    if (!deptIds) return 'Unknown'
    return String(deptIds)
      .split(',')
      .map(id => id.trim())
      .map(id => departments.find(d => String(d.department_id) === id)?.department_name || 'Unknown')
      .join(', ')
  }

  const isParticipant = (m) => {
    const myId = String(currentUser?.employee_id ?? '')
    if (!myId) return false
    const participantIds = String(m.meeting_participant || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
    return participantIds.includes(myId)
  }

  const getEmployeeInfo = (employeeId) => {
    const emp = employees.find(e => String(e.employee_id) === String(employeeId))
    if (!emp) return `Unknown (ID: ${employeeId})`
    const deptName = departments.find(d => String(d.department_id) === String(emp.department_id))?.department_name || emp.department_id
    return `${emp.employee_name} (${deptName})`
  }

  const isMeetingOver = (m) => {
    if (!m?.meeting_date || !m?.meeting_time) return false
    const dt = new Date(`${m.meeting_date}T${m.meeting_time}`)
    return new Date() >= dt
  }

  const resetNewTask = () => {
    setNewTask({
      task_title: '',
      task_content: '',
      urgent_level: 'low',
      deadline: '',
      status: 'pending',
      assignee_id: '',
      comment: '',
    })
  }

  const departmentEmployees = useMemo(() => {
    if (!currentUser || currentUser.role !== 'manager') return []
    return employees.filter((e) => e.department_id === currentUser.department_id)
  }, [currentUser, employees])

  const availableAssigneesForAdd = useMemo(() => {
    if (!currentUser) return []
    if (currentUser.role === 'boss') return employees
    if (currentUser.role === 'manager') return departmentEmployees
    return []
  }, [currentUser, employees, departmentEmployees])

  const handleAddTask = async (e) => {
    e.preventDefault()
    if (!newTask.task_title.trim()) {
      alert('Please enter a task title.')
      return
    }
    if (!newTask.deadline) {
      alert('Please select a due date.')
      return
    }
    if (currentUser?.role !== 'employee' && !newTask.assignee_id) {
      alert('Please select an assignee.')
      return
    }

    try {
      const now = new Date().toISOString()
      const taskToInsert = {
        ...newTask,
        task_content: newTask.task_content ?? '',
        status: normalizeStatus('pending'),
        urgent_level: normalizePriority(newTask.urgent_level),
        deadline: `${newTask.deadline}T00:00:00`,
        created_at: now,
        updated_at: now,
      }

      if (currentUser?.role === 'employee') {
        taskToInsert.assignee_id = currentUser.employee_id
      } else if (currentUser?.role === 'manager') {
        const allowedIds = new Set(departmentEmployees.map(e => String(e.employee_id)))
        if (!allowedIds.has(String(taskToInsert.assignee_id))) {
          alert('You can only assign tasks to employees in your department.')
          return
        }
      }

      const { error } = await supabase.from('task').insert([taskToInsert])
      if (error) throw error
      setShowAddModal(false)
      resetNewTask()
      fetchTasks()
      alert('Task created!')
    } catch (error) {
      console.error('Error creating task:', error)
      alert('Create failed. Please try again.')
    }
  }

  const handleDeleteTask = async (task_id) => {
    const ok = window.confirm(
      "Are you sure you want to permanently delete this task? This action cannot be undone."
    )
    if (!ok) return

    try {
      const { error } = await supabase.from('task').delete().eq('task_id', task_id)
      if (error) throw error
      fetchTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
      alert('Delete failed.')
    }
  }

  const empMap = useMemo(() => {
    const m = new Map()
    for (const e of employees) m.set(String(e.employee_id), e)
    return m
  }, [employees])

  const labelValue = (field, value) => {
    if (field === 'assignee_id') {
      if (!value) return 'Unassigned'
      const emp = empMap.get(String(value))
      return emp?.employee_name || `#${value}`
    }
    if (field === 'status') {
      return STATUS_META[normalizeStatus(value)]?.label || value
    }
    if (field === 'urgent_level') {
      return String(value || '').toLowerCase()
    }
    if (field === 'deadline') {
      const d = toDateOnly(value)
      return d || '—'
    }
    if (field === 'task_content') {
      const s = String(value || '')
      if (!s) return '—'
      return s.length > 80 ? s.slice(0, 80) + '…' : s
    }
    if (field === 'task_title') {
      return String(value || '')
    }
    return String(value ?? '')
  }

  const openTaskModal = async (task) => {
    const normalized = {
      ...task,
      status: normalizeStatus(task.status),
      urgent_level: normalizePriority(task.urgent_level),
      deadline: toDateOnly(task.deadline),
      created_date_only: toDateOnly(task.created_at),
    }
    setCurrentTask(normalized)
    setShowTaskModal(true)

    lastCommittedSnapRef.current = trackedSnapshotOf(normalized)

    try {
      const { data, error } = await supabase
        .from('task_comment')
        .select('id, task_id, author, body, created_at')
        .eq('task_id', task.task_id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setComments(data || [])
      setCommentBackendEnabled(true)
    } catch {
      setComments([])
      setCommentBackendEnabled(false)
    }

    try {
      setActivityLoading(true)
      const { data, error } = await supabase
        .from('task_audit')
        .select('id, task_id, actor_id, field, old_value, new_value, created_at')
        .eq('task_id', task.task_id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setActivities(data || [])
    } catch (e) {
      console.error('Error fetching task_audit:', e)
      setActivities([])
    } finally {
      setActivityLoading(false)
    }
  }

  const closeTaskModal = () => {
    setShowTaskModal(false)
    setCurrentTask(null)
    setComments([])
    setActivities([])
    setNewCommentBody('')
    lastCommittedSnapRef.current = null
  }

  const handleTaskField = (field, value) => {
    setCurrentTask((prev) => {
      let v = value
      if (field === 'status') {
        v = normalizeStatus(value)
        const prevStatus = normalizeStatus(prev.status)
        if (v === 'archieve' && prevStatus !== 'done') {
          return prev
        }
      }
      if (field === 'urgent_level') v = normalizePriority(value)
      if (field === 'deadline') v = toDateOnly(value)
      return { ...prev, [field]: v }
    })
  }

  const assigneeObj = useMemo(() => {
    if (!currentTask?.assignee_id) return null
    return employees.find((e) => String(e.employee_id) === String(currentTask.assignee_id)) || null
  }, [currentTask?.assignee_id, employees])

  const selectableEmployeesForEdit = useMemo(() => {
    if (!currentUser) return []
    if (currentUser.role === 'boss') return employees
    if (currentUser.role === 'manager') return departmentEmployees
    return []
  }, [currentUser, employees, departmentEmployees])

  const canEditAssignee = useMemo(() => {
    if (!currentUser) return false
    if (currentUser.role === 'boss') return true
    if (currentUser.role === 'manager') {
      if (!assigneeObj) return true
      return assigneeObj.department_id === currentUser.department_id
    }
    return false
  }, [currentUser, assigneeObj])

  const assigneeName = useMemo(
    () => (assigneeObj ? assigneeObj.employee_name : 'Unassigned'),
    [assigneeObj]
  )

  const saveCurrentTask = useCallback(async () => {
    if (!currentTask) return
    if (savingRef.current) return
    try {
      const { task_id, created_at, created_date_only, ...updateDataRaw } = currentTask
      const updateData = {
        ...updateDataRaw,
        status: normalizeStatus(updateDataRaw.status),
        urgent_level: normalizePriority(updateDataRaw.urgent_level),
        deadline: updateDataRaw.deadline ? `${toDateOnly(updateDataRaw.deadline)}T00:00:00` : null,
      }

      const beforeSnap = lastCommittedSnapRef.current || trackedSnapshotOf(currentTask)
      const { diffs, afterSnap } = computeDiffsFromSnapshot(beforeSnap, updateData)
      if (diffs.length === 0) return

      const originalAssigneeId = String(beforeSnap.assignee_id ?? '')
      const isAssigneeChanged = String(updateData.assignee_id || '') !== originalAssigneeId
      if (isAssigneeChanged) {
        const role = currentUser?.role
        let canChange = false
        if (role === 'boss') {
          canChange = true
        } else if (role === 'manager') {
          const targetEmp = employees.find((e) => String(e.employee_id) === String(updateData.assignee_id)) || null
          canChange = !!(targetEmp && targetEmp.department_id === currentUser.department_id)
        }
        if (!canChange) updateData.assignee_id = originalAssigneeId
      }

      savingRef.current = true
      const nowIso = new Date().toISOString()

      const { error, data } = await supabase
        .from('task')
        .update({ ...updateData, updated_at: nowIso })
        .eq('task_id', task_id)
        .select('task_id, updated_at, deadline, status, urgent_level, assignee_id, task_content, task_title')
        .single()
      if (error) throw error

      if (diffs.length) {
        const rows = diffs.map(d => ({
          task_id,
          actor_id: currentUser?.employee_id ?? null,
          field: d.field,
          old_value: d.old_value,
          new_value: d.new_value,
          created_at: nowIso,
        }))
        const { error: auditErr } = await supabase.from('task_audit').insert(rows)
        if (auditErr) console.error('audit insert failed:', auditErr)
        setActivities(prev => [
          ...rows.map((r, i) => ({ id: `tmp-${nowIso}-${i}`, ...r })),
          ...prev,
        ])
      }

      const patched = canonTask({ ...currentTask, ...updateData, updated_at: data?.updated_at ?? nowIso })
      setTasks((prev) => prev.map((t) => (t.task_id === task_id ? patched : t)))
      setCurrentTask(patched)
      lastCommittedSnapRef.current = afterSnap
    } catch (error) {
      console.error('Error updating task:', error)
      throw error
    } finally {
      savingRef.current = false
    }
  }, [currentTask, currentUser, employees])

  const handleSaveClick = async () => {
    try {
      await saveCurrentTask()
      alert('Update successful!')
      closeTaskModal()
    } catch (e) {
      console.error('Save failed:', e)
      alert('Update failed. Please try again.')
    }
  }

  const addComment = async () => {
    if (!currentTask || !newCommentBody.trim()) return
    try {
      setAddingComment(true)
      const nowIso = new Date().toISOString()
      const payload = {
        task_id: currentTask.task_id,
        author: currentUser?.employee_id ?? null,
        body: newCommentBody.trim(),
        created_at: nowIso,
      }
      const { data, error } = await supabase.from('task_comment').insert([payload]).select('*').single()
      if (error) throw error
      setComments((prev) => [data, ...prev])
      setNewCommentBody('')
    } catch (e) {
      console.error('add comment failed:', e)
      alert('Add comment failed.')
    } finally {
      setAddingComment(false)
    }
  }

  const compareByPriorityThenDue = (a, b) => {
    const pa = PRIORITY_RANK[a.urgent_level] ?? 3
    const pb = PRIORITY_RANK[b.urgent_level] ?? 3
    if (pa !== pb) return pa - pb
    const da = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY
    const db = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY
    return da - db
  }

  const filteredTasks = useMemo(() => {
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

  const grouped = useMemo(() => {
    const res = Object.fromEntries(STATUS_GROUP_ORDER.map((s) => [s, []]))
    for (const t of filteredTasks) {
      const st = normalizeStatus(t.status)
      if (STATUS_GROUP_ORDER.includes(st)) res[st].push(t)
    }
    for (const k of STATUS_GROUP_ORDER) res[k].sort(compareByPriorityThenDue)
    return res
  }, [filteredTasks])

  const filteredMeetings = useMemo(() => {
    if (!currentUser) return []

    const list = meetings || []
    const myId = String(currentUser.employee_id ?? '')
    const myDeptId = String(currentUser.department_id ?? '')

    const inCsv = (csv, needle) =>
      String(csv || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .includes(String(needle || ''))

    switch (filter) {
      case FILTERS.MINE:
        return list.filter(m => inCsv(m.meeting_participant, myId))
      case FILTERS.DEPT:
        return list.filter(m => inCsv(m.meeting_department, myDeptId))
      case FILTERS.ALL:
      default:
        return list
    }
  }, [meetings, currentUser, filter])

  if (loading) return <div className="text-center text-gray-700 dark:text-gray-200">Loading...</div>

  const pill = (active) =>
    `px-3 py-1.5 rounded-lg text-sm border transition
    ${active
      ? 'bg-[#1985a1] text-white border-[#1985a1]'
      : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-[#89c2d9] hover:border-[#89c2d9] hover:text-white'}`

  const viewBtn = (active) =>
    `px-3 py-1.5 rounded-lg text-sm border transition ${
      active
        ? 'bg-[#1985a1] text-white border-[#1985a1] hover:bg-[#89c2d9] hover:border-[#89c2d9]'
        : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-[#89c2d9] hover:border-[#89c2d9] hover:text-white'
    }`

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto p-6 text-gray-900 dark:text-gray-100">
          <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Tasks List</h1>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button className={pill(filter === FILTERS.MINE)} onClick={() => setFilter(FILTERS.MINE)}>My</button>
                <button className={pill(filter === FILTERS.DEPT)} onClick={() => setFilter(FILTERS.DEPT)}>Department</button>
                {currentUser?.role === 'boss' && (
                  <button className={pill(filter === FILTERS.ALL)} onClick={() => setFilter(FILTERS.ALL)}>All</button>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button className={viewBtn(view === VIEWS.LIST)} onClick={() => setView(VIEWS.LIST)}>List</button>
                <button className={viewBtn(view === VIEWS.CAL)} onClick={() => setView(VIEWS.CAL)}>Calendar</button>
              </div>

              <button
                className={`${COLOR.other} px-4 py-2 rounded`}
                onClick={() => {
                  resetNewTask()
                  setShowAddModal(true)
                }}
              >
                Add Task
              </button>
            </div>
          </div>

          {view === VIEWS.CAL ? (
            <CalendarView
              tasks={filteredTasks}
              meetings={filteredMeetings}
              employees={employees}
              onOpenTask={openTaskModal}
              onOpenMeeting={setSelectedMeeting}
            />
          ) : (
            <div className="space-y-10">
              {STATUS_GROUP_ORDER.map((statusKey) => {
                const items = grouped[statusKey] || []
                const meta = STATUS_META[statusKey]

                return (
                  <section key={statusKey}>
                    <div className={`${ROW_COLS} mb-2`}>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${meta.badge}`}>
                          {meta.label}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{items.length} item(s)</span>
                      </div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Assignee</div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Due date</div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Status</div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Priority</div>
                      <div>{/* actions */}</div>
                    </div>

                    <div className="space-y-2">
                      {items.map((task) => {
                        const emp = employees.find((e) => String(e.employee_id) === String(task.assignee_id))
                        const priorityCls = PRIORITY_PILL[task.urgent_level || 'low'] || PRIORITY_PILL.low
                        return (
                          <div
                            key={task.task_id}
                            onClick={() => openTaskModal(task)}
                            className={`${ROW_COLS} bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-3 hover:shadow cursor-pointer`}
                          >
                            <div className="min-w-0">
                              <div className="font-medium truncate">{task.task_title}</div>
                              {task.task_content ? (
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{task.task_content}</div>
                              ) : null}
                            </div>

                            <div className="truncate text-sm text-gray-700 dark:text-gray-200">
                              {emp?.employee_name || 'Unassigned'}
                            </div>

                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              {task.deadline ? fmtDateShort(task.deadline) : '—'}
                            </div>

                            <div>
                              <span
                                className={`inline-block text-xs px-2 py-1 rounded-full ${
                                  STATUS_META[task.status]?.badge || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100'
                                }`}
                              >
                                {STATUS_META[task.status]?.label || String(task.status).toUpperCase()}
                              </span>
                            </div>

                            <div>
                              <span className={`text-xs px-2 py-1 rounded-full capitalize ${priorityCls}`}>
                                {task.urgent_level || 'low'}
                              </span>
                            </div>

                            <div className="justify-self-end">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteTask(task.task_id)
                                }}
                                className={`${COLOR.del} p-1.5 rounded-md`}
                                title="Delete"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                      {items.length === 0 && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-900">
                          No tasks in this group.
                        </div>
                      )}
                    </div>
                  </section>
                )
              })}
            </div>
          )}

          {/* Add Task Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 rounded-xl w-full max-w-md relative shadow-2xl">
                <button
                  className={`${COLOR.otherOutline} absolute top-3 right-3 p-1.5 rounded`}
                  onClick={() => {
                    setShowAddModal(false)
                    resetNewTask()
                  }}
                  aria-label="Close add task"
                  title="Close"
                >
                  <FiX size={18} />
                </button>
                <h2 className="text-xl font-semibold mb-4">Add New Task</h2>
                <form onSubmit={handleAddTask} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Task Title"
                    value={newTask.task_title}
                    onChange={(e) => setNewTask({ ...newTask, task_title: e.target.value })}
                    className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                    required
                  />
                  <textarea
                    placeholder="Task Content"
                    value={newTask.task_content}
                    onChange={(e) => setNewTask({ ...newTask, task_content: e.target.value })}
                    className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                    rows="3"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={newTask.urgent_level}
                      onChange={(e) => setNewTask({ ...newTask, urgent_level: e.target.value })}
                      className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    <input
                      type="date"
                      value={newTask.deadline}
                      onChange={(e) => setNewTask({ ...newTask, deadline: toDateOnly(e.target.value) })}
                      className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                      min={today}
                      required
                    />
                  </div>

                  {currentUser?.role !== 'employee' && (
                    <select
                      value={newTask.assignee_id}
                      onChange={(e) => setNewTask({ ...newTask, assignee_id: e.target.value })}
                      className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                      title={currentUser?.role === 'manager' ? 'Only employees in your department' : 'All employees'}
                      required
                    >
                      <option value="">Select Assignee</option>
                      {availableAssigneesForAdd.map((emp) => (
                        <option key={emp.employee_id} value={emp.employee_id}>
                          {emp.employee_name}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    type="submit"
                    className={`${COLOR.save} w-full px-6 py-2 rounded-lg`}
                  >
                    Add Task
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Task Modal */}
          {showTaskModal && currentTask && (
            <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 w-[95vw] max-w-6xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">

                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium text-gray-700 dark:text-gray-200">Task</span>
                    <span className="mx-2">•</span>
                    <span className="text-gray-400">ID {currentTask.task_id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveClick}
                      className={`${COLOR.save} px-3 py-1.5 text-sm rounded-lg`}
                    >
                      Save
                    </button>
                    <button
                      onClick={closeTaskModal}
                      className={`${COLOR.otherOutline} p-2 rounded-lg`}
                      aria-label="Close"
                      title="Close"
                    >
                      <FiX size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_360px] overflow-hidden">
                  <div className="p-6 overflow-y-auto">
                    <input
                      className="w-full text-2xl md:text-3xl font-bold outline-none border rounded-lg focus:ring-0 mb-4 bg-white dark:bg-gray-900 border-transparent dark:border-gray-700 text-gray-900 dark:text-gray-100"
                      value={currentTask.task_title || ''}
                      onChange={(e) => handleTaskField('task_title', e.target.value)}
                      placeholder="Task title"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="border rounded-xl p-4 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <div className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-2">Status</div>
                          <select
                            className="w-full p-2 border rounded-lg bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                            value={currentTask.status}
                            onChange={(e) => handleTaskField('status', e.target.value)}
                          >
                            { (normalizeStatus(currentTask?.status) === 'done'
                                ? [...STATUS_OPTIONS_BASE, 'archieve']
                                : STATUS_OPTIONS_BASE
                              ).map((s) => (
                                <option key={s} value={s}>
                                  {STATUS_META[s]?.label || s}
                                </option>
                            )) }
                          </select>
                      </div>

                      <div className="border rounded-xl p-4 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <div className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-2">Dates</div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400">Created At</label>
                            <input
                              type="date"
                              className="w-full p-2 border rounded-lg bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700"
                              value={currentTask.created_date_only || toDateOnly(currentTask.created_at) || ''}
                              readOnly
                              disabled
                              aria-readonly
                              title="Created At is set by the system"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400">Due</label>
                            <input
                              type="date"
                              className="w-full p-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
                              min={today}
                              value={currentTask.deadline || ''}
                              onChange={(e) => {
                                const newEnd = toDateOnly(e.target.value)
                                setCurrentTask({ ...currentTask, deadline: newEnd })
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-xl p-4 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <div className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-2">Assignee</div>

                        <div className="mb-2 text-sm">
                          <span className="text-gray-500 dark:text-gray-400 mr-1">Current:</span>
                          <span className="font-medium">{assigneeName}</span>
                          {!canEditAssignee && currentUser?.role === 'manager' && (
                            <span className="ml-2 inline-flex items-center text-xs text-gray-500 dark:text-gray-400">
                              (view only)
                            </span>
                          )}
                        </div>

                        <select
                          className={`w-full p-2 border rounded-lg ${
                            !canEditAssignee
                              ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                              : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100'
                          } border-gray-300 dark:border-gray-700`}
                          value={currentTask.assignee_id || ''}
                          onChange={(e) => handleTaskField('assignee_id', e.target.value)}
                          disabled={!canEditAssignee}
                          title={currentUser?.role === 'boss' ? 'Assign to anyone' : 'Reassign within your department'}
                        >
                          <option value="">Unassigned</option>
                          {selectableEmployeesForEdit.map((emp) => (
                            <option key={emp.employee_id} value={emp.employee_id}>
                              {emp.employee_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="border rounded-xl p-4 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <div className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-2">Priority</div>
                        <select
                          className="w-full p-2 border rounded-lg capitalize bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                          value={currentTask.urgent_level || 'low'}
                          onChange={(e) => handleTaskField('urgent_level', e.target.value)}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="text-sm font-semibold mb-2">Description</div>
                      <textarea
                        className="w-full min-h-[160px] p-4 border rounded-xl bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Add details"
                        value={currentTask.task_content || ''}
                        onChange={(e) => handleTaskField('task_content', e.target.value)}
                      />
                    </div>
                  </div>

                  <aside className="border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 overflow-y-auto space-y-6">
                    <div>
                      <div className="text-sm font-semibold mb-3">Activity</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Change log</div>
                      {activityLoading ? (
                        <div className="text-sm text-gray-500 dark:text-gray-400">Loading…</div>
                      ) : activities.length === 0 ? (
                        <div className="text-sm text-gray-500 dark:text-gray-400">No changes recorded</div>
                      ) : (
                        <ul className="space-y-2">
                          {activities.map((a) => {
                            const who = empMap.get(String(a.actor_id))?.employee_name || `#${a.actor_id || 'unknown'}`
                            const oldV = labelValue(a.field, a.old_value)
                            const newV = labelValue(a.field, a.new_value)
                            return (
                              <li key={a.id} className="text-sm">
                                <div className="text-gray-800 dark:text-gray-100">
                                  <span className="font-medium">{who}</span>{' '}
                                  changed <span className="font-medium">{FIELD_LABEL[a.field] || a.field}</span>
                                </div>
                                <div className="text-gray-600 dark:text-gray-300 text-xs">
                                  {oldV} → {newV}
                                </div>
                                <div className="text-gray-500 dark:text-gray-400 text-xs">
                                  {a.created_at ? new Date(a.created_at).toLocaleString() : ''}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>

                    <div>
                      <div className="text-sm font-semibold mb-3">Comments</div>
                      {commentBackendEnabled ? (
                        <>
                          <div className="flex gap-2 mb-3">
                            <input
                              type="text"
                              value={newCommentBody}
                              onChange={(e) => setNewCommentBody(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  addComment()
                                }
                              }}
                              placeholder="Write a comment"
                              className="flex-1 p-2 border rounded-lg bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                            />
                            <button
                              onClick={addComment}
                              disabled={addingComment || !newCommentBody.trim()}
                              className={`${COLOR.other} px-3 py-2 rounded-lg disabled:opacity-50`}
                            >
                              Post
                            </button>
                          </div>
                          {comments.length === 0 ? (
                            <div className="text-sm text-gray-500 dark:text-gray-400">No comments</div>
                          ) : (
                            <ul className="space-y-3">
                              {comments.map((c) => {
                                const who = empMap.get(String(c.author))?.employee_name || `#${c.author || 'unknown'}`
                                return (
                                  <li key={c.id} className="text-sm">
                                    <div className="font-medium text-gray-800 dark:text-gray-100">{who}</div>
                                    <div className="text-gray-700 dark:text-gray-200">{c.body}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {c.created_at ? new Date(c.created_at).toLocaleString() : ''}
                                    </div>
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-gray-500 dark:text-gray-400">Comments backend disabled</div>
                      )}
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          )}

          {selectedMeeting && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/55 z-50">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 max-w-lg w-full p-6 rounded-2xl relative">
                <button
                  onClick={() => setSelectedMeeting(null)}
                  className={`${COLOR.otherOutline} absolute top-3 right-3 p-1.5 rounded`}
                  aria-label="Close"
                >
                  <FiX />
                </button>

                <h2 className="text-2xl font-bold mb-4">{selectedMeeting.meeting_title}</h2>
                <p><strong>Date:</strong> {selectedMeeting.meeting_date}</p>
                <p><strong>Time:</strong> {selectedMeeting.meeting_time}</p>
                <p><strong>Department:</strong> {getDeptName(selectedMeeting.meeting_department)}</p>
                <p><strong>Location:</strong> {selectedMeeting.meeting_location}</p>
                <p>
                  <strong>Participants:</strong>{' '}
                  {String(selectedMeeting.meeting_participant || '')
                    .split(',').map(id => id.trim()).filter(Boolean)
                    .map(id => getEmployeeInfo(id)).join(', ')}
                </p>

                <div className="mt-6 flex justify-end gap-3">
                  {isMeetingOver(selectedMeeting) && isParticipant(selectedMeeting) && (
                    hasUploadedFiles(selectedMeeting.meeting_id) ? (
                      <button
                        onClick={() =>
                          navigate(`/meetingAttachments/${selectedMeeting.meeting_id}`, {
                            state: { from: 'calendar' }
                          })
                        }
                        className={`${COLOR.other} px-5 py-2 rounded-lg`}
                      >
                        📎 Attachment
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          navigate('/meetingGenerator', {
                            state: { meetingId: selectedMeeting.meeting_id, from: 'calendar' }
                          })
                        }
                        className={`${COLOR.other} px-5 py-2 rounded-lg`}
                      >
                        Upload Audios →
                      </button>
                    )
                  )}
                </div>

              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}

export default TaskList

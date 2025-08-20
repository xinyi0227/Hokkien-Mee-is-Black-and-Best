import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import Header from './header'
import { FiTrash2, FiX } from 'react-icons/fi'
import CalendarView from './CalendarView'

const toDateOnly = (iso) => (iso ? new Date(iso).toISOString().split('T')[0] : '')
const today = new Date().toISOString().split('T')[0]
const VIEWS = { LIST: 'list', CAL: 'calendar' }
const fmtDateShort = (isoOrYmd) => {
  if (!isoOrYmd) return ''
  const d = new Date(isoOrYmd)
  if (Number.isNaN(d.getTime())) return isoOrYmd
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const STATUS_ALL = ['pending', 'in progress', 'review', 'done', 'archieve']
const STATUS_GROUP_ORDER = ['done', 'review', 'in progress', 'pending']
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

const TaskList = ({ currentUser }) => {
  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [view, setView] = useState(VIEWS.LIST)

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

  const [filter, setFilter] = useState(() =>
    currentUser?.role === 'boss' ? FILTERS.ALL : FILTERS.MINE
  )
  useEffect(() => {
    if (currentUser?.role === 'boss' && filter !== FILTERS.ALL) {
      setFilter(FILTERS.ALL)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role])

  useEffect(() => {
    fetchTasks()
    fetchEmployees()
  }, [])

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('task')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setTasks(data || [])
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
    if (!newTask.task_title.trim()) return
    try {
      const now = new Date().toISOString()
      let taskToInsert = {
        ...newTask,
        status: 'pending',
        created_at: now,
        updated_at: now,
      }

      if (currentUser?.role === 'employee') {
        taskToInsert.assignee_id = currentUser.employee_id
      }
      if (currentUser?.role === 'manager') {
        const allowedIds = new Set(departmentEmployees.map((e) => String(e.employee_id)))
        if (taskToInsert.assignee_id && !allowedIds.has(String(taskToInsert.assignee_id))) {
          alert('You can only assign tasks to employees in your department. Assignee cleared.')
          taskToInsert.assignee_id = ''
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
    try {
      const { error } = await supabase.from('task').delete().eq('task_id', task_id)
      if (error) throw error
      fetchTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const openTaskModal = async (task) => {
    const normalized = {
      ...task,
      deadline: task.deadline ? task.deadline.split('T')[0] : '',
      created_date_only: toDateOnly(task.created_at),
    }
    setCurrentTask(normalized)
    setShowTaskModal(true)

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
  }

  const closeTaskModal = () => {
    setShowTaskModal(false)
    setCurrentTask(null)
    setComments([])
  }

  const handleTaskField = (field, value) => {
    setCurrentTask((prev) => ({ ...prev, [field]: value }))
  }

  const assigneeObj = useMemo(() => {
    if (!currentTask?.assignee_id) return null
    return employees.find((e) => e.employee_id === currentTask.assignee_id) || null
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
    try {
      const { task_id, created_at, created_date_only, ...updateData } = currentTask

      const original = tasks.find((t) => t.task_id === task_id)
      const originalAssigneeId = original?.assignee_id || ''
      const isAssigneeChanged = updateData.assignee_id !== originalAssigneeId
      if (isAssigneeChanged) {
        const role = currentUser?.role
        let canChange = false
        if (role === 'boss') {
          canChange = true
        } else if (role === 'manager') {
          const targetEmp = employees.find((e) => e.employee_id === updateData.assignee_id) || null
          canChange = !!(targetEmp && targetEmp.department_id === currentUser.department_id)
        }
        if (!canChange) updateData.assignee_id = originalAssigneeId
      }

      const nowIso = new Date().toISOString()
      const { error, data } = await supabase
        .from('task')
        .update({ ...updateData, updated_at: nowIso })
        .eq('task_id', task_id)
        .select('task_id, updated_at')
        .single()
      if (error) throw error

      const newUpdatedAt = data?.updated_at ?? nowIso
      setTasks((prev) =>
        prev.map((t) =>
          t.task_id === task_id ? { ...t, ...updateData, updated_at: newUpdatedAt } : t
        )
      )
      setCurrentTask((prev) =>
        prev && prev.task_id === task_id
          ? { ...prev, ...updateData, updated_at: newUpdatedAt }
          : prev
      )
    } catch (error) {
      console.error('Error updating task:', error)
      throw error
    }
  }, [currentTask, tasks, currentUser, employees])

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

  const onBlurSave = async () => {
    await saveCurrentTask()
  }

  const compareByPriorityThenDue = (a, b) => {
    const pa = PRIORITY_RANK[a.urgent_level] ?? 3
    const pb = PRIORITY_RANK[b.urgent_level] ?? 3
    if (pa !== pb) return pa - pb
    const da = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY
    const db = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY
    return da - db
  }

  const empMap = useMemo(() => {
    const m = new Map()
    for (const e of employees) m.set(String(e.employee_id), e)
    return m
  }, [employees])

  const filteredTasks = useMemo(() => {
    if (!currentUser) return tasks
    if (filter === FILTERS.ALL) return tasks
    if (filter === FILTERS.MINE) {
      return tasks.filter(
        (t) => String(t.assignee_id) === String(currentUser.employee_id)
      )
    }
    return tasks.filter((t) => {
      const emp = empMap.get(String(t.assignee_id))
      return emp && emp.department_id === currentUser.department_id
    })
  }, [tasks, filter, currentUser, empMap])

  const grouped = useMemo(() => {
    const res = Object.fromEntries(STATUS_GROUP_ORDER.map((s) => [s, []]))
    for (const t of filteredTasks) {
      if (STATUS_GROUP_ORDER.includes(t.status)) res[t.status].push(t)
    }
    for (const k of STATUS_GROUP_ORDER) res[k].sort(compareByPriorityThenDue)
    return res
  }, [filteredTasks])

  if (loading) return <div className="text-center text-gray-700 dark:text-gray-200">Loading...</div>

  const pill = (active) =>
    `px-3 py-1.5 rounded-full text-sm border transition ${
      active
        ? 'bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100'
        : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:border-gray-700'
    }`

  const viewBtn = (active) =>
    `px-3 py-1.5 rounded-lg text-sm border ${
      active
        ? 'bg-blue-600 text-white border-blue-600'
        : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
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
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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
              employees={employees}
              onOpenTask={openTaskModal}
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
                        const emp = employees.find((e) => e.employee_id === task.assignee_id)
                        const priorityCls =
                          PRIORITY_PILL[task.urgent_level || 'low'] || PRIORITY_PILL.low
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
                                {STATUS_META[task.status]?.label || task.status}
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
                                className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
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

          {showAddModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 rounded-xl w-full max-w-md relative shadow-2xl">
                <button
                  className="absolute top-3 right-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
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
                      onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                      className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                      min={today}
                    />
                  </div>

                  {currentUser?.role !== 'employee' && (
                    <select
                      value={newTask.assignee_id}
                      onChange={(e) => setNewTask({ ...newTask, assignee_id: e.target.value })}
                      className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                      title={
                        currentUser?.role === 'manager'
                          ? 'Only employees in your department'
                          : 'All employees'
                      }
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
                    className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Task
                  </button>
                </form>
              </div>
            </div>
          )}

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
                      className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={closeTaskModal}
                      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                      aria-label="Close"
                      title="Close"
                    >
                      <FiX size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_340px] overflow-hidden">
                  <div className="p-6 overflow-y-auto">
                    <input
                      className="w-full text-2xl md:text-3xl font-bold outline-none border rounded-lg focus:ring-0 mb-4 bg-white dark:bg-gray-900 border-transparent dark:border-gray-700 text-gray-900 dark:text-gray-100"
                      value={currentTask.task_title || ''}
                      onChange={(e) => handleTaskField('task_title', e.target.value)}
                      onBlur={onBlurSave}
                      placeholder="Task title"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="border rounded-xl p-4 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <div className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-2">Status</div>
                        <select
                          className="w-full p-2 border rounded-lg bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                          value={currentTask.status}
                          onChange={(e) => handleTaskField('status', e.target.value)}
                          onBlur={onBlurSave}
                        >
                          {STATUS_ALL.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_META[s]?.label || s}
                            </option>
                          ))}
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
                              value={
                                currentTask.created_date_only ||
                                toDateOnly(currentTask.created_at) ||
                                ''
                              }
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
                              min={(() => {
                                const created = currentTask.created_at
                                  ? toDateOnly(currentTask.created_at)
                                  : today
                                return created > today ? created : today
                              })()}
                              value={currentTask.deadline || ''}
                              onChange={(e) => {
                                const created = currentTask.created_at
                                  ? toDateOnly(currentTask.created_at)
                                  : today
                                const lowerBound = created > today ? created : today
                                let newEnd = e.target.value
                                if (newEnd < lowerBound) newEnd = lowerBound
                                if (newEnd === created) {
                                  const nextDay = new Date(
                                    new Date(newEnd).getTime() + 86400000
                                  )
                                    .toISOString()
                                    .split('T')[0]
                                  newEnd = nextDay
                                }
                                setCurrentTask({ ...currentTask, deadline: newEnd })
                              }}
                              onBlur={onBlurSave}
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
                              (view only — outside your department)
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
                          onChange={(e) =>
                            handleTaskField('assignee_id', e.target.value)
                          }
                          onBlur={onBlurSave}
                          disabled={!canEditAssignee}
                          title={
                            currentUser?.role === 'boss'
                              ? 'Assign to anyone'
                              : !canEditAssignee
                              ? 'You can only reassign within your department'
                              : 'Reassign within your department'
                          }
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
                          onChange={(e) =>
                            handleTaskField('urgent_level', e.target.value)
                          }
                          onBlur={onBlurSave}
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
                        placeholder="Add details…"
                        value={currentTask.task_content || ''}
                        onChange={(e) =>
                          handleTaskField('task_content', e.target.value)
                        }
                        onBlur={onBlurSave}
                      />
                    </div>
                  </div>

                  <aside className="border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 overflow-y-auto">
                    <div className="text-sm font-semibold mb-3">Activity</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">System</div>
                    <ul className="space-y-2 mb-6">
                      <li className="text-sm">
                        Created at:{' '}
                        <span className="text-gray-700 dark:text-gray-300">
                          {currentTask.created_at
                            ? new Date(currentTask.created_at).toLocaleString()
                            : '—'}
                        </span>
                      </li>
                      <li className="text-sm">
                        Last updated:{' '}
                        <span className="text-gray-700 dark:text-gray-300">
                          {currentTask.updated_at
                            ? new Date(currentTask.updated_at).toLocaleString()
                            : '—'}
                        </span>
                      </li>
                    </ul>
                  </aside>
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

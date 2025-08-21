import { useMemo, useState } from 'react'

const toDateOnly = (iso) => (iso ? new Date(iso).toISOString().split('T')[0] : '')
const WEEK_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const PRIORITY_BORDER = {
  high: 'border-l-4 border-red-500',
  medium: 'border-l-4 border-yellow-500',
  low: 'border-l-4 border-gray-400',
}

function sameDay(ymd, d) {
  const only = toDateOnly(ymd)
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return only === `${y}-${m}-${day}`
}

export default function CalendarView({ tasks, employees, onOpenTask }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const year = cursor.getFullYear()
  const month = cursor.getMonth()

  const days = useMemo(() => {
    const startOfMonth = new Date(year, month, 1)
    const startWeekday = startOfMonth.getDay()
    const gridStart = new Date(year, month, 1 - startWeekday)
    const arr = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart)
      d.setDate(gridStart.getDate() + i)
      arr.push(d)
    }
    return arr
  }, [year, month])

  const tasksByDay = useMemo(() => {
    const map = new Map()
    const rank = { high: 0, medium: 1, low: 2 }
    for (const t of tasks) {
      if (!t.deadline) continue
      for (const d of days) {
        if (sameDay(t.deadline, d)) {
          const key = d.toDateString()
          if (!map.has(key)) map.set(key, [])
          map.get(key).push(t)
          break
        }
      }
    }
    for (const [k, list] of map.entries()) {
      list.sort((a, b) => (rank[a.urgent_level] ?? 3) - (rank[b.urgent_level] ?? 3))
      map.set(k, list)
    }
    return map
  }, [tasks, days])

  const goPrev = () => setCursor(new Date(year, month - 1, 1))
  const goNext = () => setCursor(new Date(year, month + 1, 1))
  const goToday = () => {
    const d = new Date()
    setCursor(new Date(d.getFullYear(), d.getMonth(), 1))
  }
  const monthLabel = new Date(year, month, 1).toLocaleString(undefined, { year: 'numeric', month: 'long' })
  const isCurrentMonth = (d) => d.getMonth() === month

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700">Today</button>
          <button onClick={goPrev} className="px-2 py-1.5 text-lg rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700">‹</button>
          <button onClick={goNext} className="px-2 py-1.5 text-lg rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700">›</button>
        </div>
        <div className="text-lg font-semibold">{monthLabel}</div>
        <div className="w-[120px]" />
      </div>

      {/* Week headers */}
      <div className="grid grid-cols-7 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        {WEEK_LABELS.map((w) => <div key={w} className="px-3 py-2">{w}</div>)}
      </div>

      {/* Grid 6x7 */}
      <div className="grid grid-cols-7 grid-rows-6">
        {days.map((d) => {
          const key = d.toDateString()
          const list = tasksByDay.get(key) || []
          return (
            <div key={key}
              className={`min-h-[108px] border-r border-b border-gray-200 dark:border-gray-700 p-1 sm:p-2
                ${isCurrentMonth(d) ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-950/60'}`}>
              <div className={`text-xs mb-1 sm:mb-2 ${isCurrentMonth(d) ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>
                {d.getDate()}
              </div>
              <div className="space-y-1">
                {list.length ? list.map((t) => {
                  const emp = employees.find((e) => e.employee_id === t.assignee_id)
                  const cls = PRIORITY_BORDER[t.urgent_level || 'low'] || PRIORITY_BORDER.low
                  return (
                    <button key={t.task_id} onClick={() => onOpenTask(t)}
                      className={`w-full text-left ${cls} rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-2 py-1`}
                      title={t.task_title}>
                      <div className="truncate text-xs sm:text-[13px] font-medium">{t.task_title}</div>
                      {emp?.employee_name && (
                        <div className="truncate text-[11px] text-gray-500 dark:text-gray-400">{emp.employee_name}</div>
                      )}
                    </button>
                  )
                }) : <div className="text-[11px] text-gray-400 dark:text-gray-500 italic">—</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
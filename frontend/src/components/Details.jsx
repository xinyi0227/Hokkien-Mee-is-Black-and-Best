import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import Header from './header';
import { FiTrash2 } from 'react-icons/fi';

const TaskList = () => {
  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [newTask, setNewTask] = useState({
    task_title: '',
    task_content: '',
    urgent_level: 'low',
    deadline: '',
    status: 'pending',
    assignee_id: '',
    comment: ''
  })
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [currentTask, setCurrentTask] = useState(null)

  // Load current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const email = localStorage.getItem('user_email')
      if (!email) return

      try {
        const { data, error } = await supabase
          .from('employee')
          .select(`employee_id, email, role, department_id`)
          .eq('email', email)
          .single()
        if (error) throw error
        setCurrentUser(data)
      } catch (err) {
        console.error('Error fetching current user:', err)
      }
    }
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    if (!currentUser) return
    fetchTasks()
    fetchEmployees()
  }, [currentUser])

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('task')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setTasks(data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching tasks:', error)
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      let query = supabase.from('employee').select('employee_id, employee_name, department_id, role')
      if (currentUser.role === 'manager') {
        query = query.eq('department_id', currentUser.department_id)
      }
      const { data, error } = await query.order('employee_name', { ascending: true })
      if (error) throw error
      setEmployees(data)
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
      comment: ''
    })
  }

  const handleAddTask = async (e) => {
    e.preventDefault()
    if (!newTask.task_title.trim()) return

    try {
      const currentTime = new Date().toISOString()
      // employee 角色自己为 assignee
      const assignee_id =
        currentUser.role === 'employee' ? currentUser.employee_id : newTask.assignee_id

      const { error } = await supabase
        .from('task')
        .insert([{ ...newTask, assignee_id, created_at: currentTime, updated_at: currentTime }])
      if (error) throw error
      setShowAddModal(false)
      resetNewTask()
      fetchTasks()
    } catch (error) {
      console.error('Error creating task:', error)
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

  const openTaskModal = (task) => {
    setCurrentTask({
      ...task,
      deadline: task.deadline ? task.deadline.split('T')[0] : ''
    })
    setShowTaskModal(true)
  }

  const handleTaskChange = (field, value) => {
    setCurrentTask({ ...currentTask, [field]: value })
  }

  const handleUpdateTask = async (e) => {
    e.preventDefault()
    try {
      const { task_id, ...updateData } = currentTask
      const { error } = await supabase
        .from('task')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('task_id', task_id)
      if (error) throw error
      setShowTaskModal(false)
      fetchTasks()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  if (!currentUser || loading) return <div className="text-center">Loading user info...</div>

  return (
    <>
      <Header />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Task Manager</h1>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            onClick={() => {
              resetNewTask()
              setShowAddModal(true)
            }}
          >
            Add Task
          </button>
        </div>

        {/* Task Table */}
        <table className="w-full table-auto border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Title</th>
              <th className="border p-2 text-left">Urgent</th>
              <th className="border p-2 text-left">Deadline</th>
              <th className="border p-2 text-left">Status</th>
              <th className="border p-2 text-left">Assignee</th>
              <th className="border p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.task_id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => openTaskModal(task)}
              >
                <td className="border p-2">{task.task_title}</td>
                <td className="border p-2 capitalize">{task.urgent_level}</td>
                <td className="border p-2">{task.deadline ? task.deadline.split('T')[0] : ''}</td>
                <td className="border p-2 capitalize">{task.status}</td>
                <td className="border p-2">
                  {employees.find((emp) => emp.employee_id === task.assignee_id)?.employee_name || 'Unassigned'}
                </td>
                <td className="border p-2 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteTask(task.task_id)
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {tasks.length === 0 && (
          <p className="text-center text-gray-500 mt-6">No tasks yet. Click "Add Task" to create one!</p>
        )}

        {/* Add Task Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md relative">
              <button
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setShowAddModal(false)
                  resetNewTask()
                }}
              >
                ✕
              </button>
              <h2 className="text-xl font-semibold mb-4">Add New Task</h2>
              <form onSubmit={handleAddTask} className="space-y-3">
                <input
                  type="text"
                  placeholder="Task Title"
                  value={newTask.task_title}
                  onChange={(e) => setNewTask({ ...newTask, task_title: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  required
                />
                <textarea
                  placeholder="Task Content"
                  value={newTask.task_content}
                  onChange={(e) => setNewTask({ ...newTask, task_content: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  rows="3"
                />
                <select
                  value={newTask.urgent_level}
                  onChange={(e) => setNewTask({ ...newTask, urgent_level: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <input
                  type="date"
                  value={newTask.deadline}
                  onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  min={new Date().toISOString().split('T')[0]}
                />
                {/* Only show assignee select for manager/boss */}
                {currentUser.role !== 'employee' && (
                  <select
                    value={newTask.assignee_id}
                    onChange={(e) => setNewTask({ ...newTask, assignee_id: e.target.value })}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">Select Assignee</option>
                    {employees.map((emp) => (
                      <option key={emp.employee_id} value={emp.employee_id}>
                        {emp.employee_name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="submit"
                  className="w-full bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Add Task
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Task Detail & Edit Modal */}
        {showTaskModal && currentTask && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md relative">
              <button
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowTaskModal(false)}
              >
                ✕
              </button>
              <h2 className="text-xl font-semibold mb-4">Task Detail</h2>
              <form onSubmit={handleUpdateTask} className="space-y-3">
                <input
                  type="text"
                  value={currentTask.task_title}
                  onChange={(e) => handleTaskChange('task_title', e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  required
                />
                <textarea
                  value={currentTask.task_content}
                  onChange={(e) => handleTaskChange('task_content', e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  rows="4"
                />
                <select
                  value={currentTask.urgent_level}
                  onChange={(e) => handleTaskChange('urgent_level', e.target.value)}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <select
                  value={currentTask.status}
                  onChange={(e) => handleTaskChange('status', e.target.value)}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="pending">Pending</option>
                  <option value="in progress">In Progress</option>
                  <option value="review">Review</option>
                </select>
                <input
                  type="date"
                  value={currentTask.deadline}
                  onChange={(e) => handleTaskChange('deadline', e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  min={new Date().toISOString().split('T')[0]}
                />
                {/* Only show assignee select for manager/boss */}
                {currentUser.role !== 'employee' && (
                  <select
                    value={currentTask.assignee_id}
                    onChange={(e) => handleTaskChange('assignee_id', e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">Select Assignee</option>
                    {employees.map((emp) => (
                      <option key={emp.employee_id} value={emp.employee_id}>
                        {emp.employee_name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="submit"
                  className="w-full bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Save Changes
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default TaskList

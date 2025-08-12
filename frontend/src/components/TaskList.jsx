import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const TaskList = () => {
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState({ title: '', description: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('api_task') // Changed from 'tasks' to 'api_task'
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newTask.title.trim()) return

    try {
      const currentTime = new Date().toISOString()
      const { error } = await supabase
        .from('api_task')
        .insert([{ 
          title: newTask.title, 
          description: newTask.description,
          completed: false,
          created_at: currentTime,
          updated_at: currentTime 
        }])
      
      if (error) throw error
      setNewTask({ title: '', description: '' })
      fetchTasks()
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  const toggleComplete = async (task) => {
    try {
      const { error } = await supabase
        .from('api_task')
        .update({ 
          completed: !task.completed,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id)
      
      if (error) throw error
      fetchTasks()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const deleteTask = async (id) => {
    try {
      const { error } = await supabase
        .from('api_task') 
        .delete()
        .eq('id', id)
      
      if (error) throw error
      fetchTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }


  if (loading) return <div className="text-center">Loading...</div>

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Task Manager</h1>
      
      {/* Add Task Form */}
      <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Add New Task</h2>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Task title"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="mb-4">
          <textarea
            placeholder="Task description (optional)"
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Add Task
        </button>
      </form>

      {/* Task List */}
      <div className="space-y-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`p-4 border rounded-lg ${
              task.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3
                  className={`text-lg font-semibold ${
                    task.completed ? 'line-through text-gray-500' : ''
                  }`}
                >
                  {task.title}
                </h3>
                {task.description && (
                  <p
                    className={`text-gray-600 mt-1 ${
                      task.completed ? 'line-through' : ''
                    }`}
                  >
                    {task.description}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Created: {new Date(task.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => toggleComplete(task)}
                  className={`px-4 py-2 rounded ${
                    task.completed
                      ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {task.completed ? 'Undo' : 'Complete'}
                </button>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tasks.length === 0 && (
        <p className="text-center text-gray-500 mt-8">
          No tasks yet. Create your first task above!
        </p>
      )}
    </div>
  )
}

export default TaskList
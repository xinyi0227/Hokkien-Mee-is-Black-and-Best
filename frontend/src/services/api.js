import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const taskAPI = {
  // Get all tasks
  getTasks: () => api.get('/tasks/'),
  
  // Create a new task
  createTask: (task) => api.post('/tasks/', task),
  
  // Update a task
  updateTask: (id, task) => api.put(`/tasks/${id}/`, task),
  
  // Delete a task
  deleteTask: (id) => api.delete(`/tasks/${id}/`),
}

export default api

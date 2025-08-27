import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useNavigate } from 'react-router-dom'
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai'
import bcrypt from 'bcryptjs'

const Register = () => {
  const [employeeName, setEmployeeName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [role, setRole] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const navigate = useNavigate()

  const handleRegister = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    try {
      const hashedPassword = bcrypt.hashSync(password, 10) 

      const { data, error: insertError } = await supabase
        .from('employee')
        .insert([
          {
            employee_name: employeeName,
            email: email,
            password: hashedPassword,
            department_id: departmentId,
            role: role,
            created_at: new Date().toISOString()
          }
        ])

      if (insertError) {
        setError(insertError.message)
      } else {
        console.log('Employee registered:', data)
        setSuccess('Registration successful! You can now login.')
        setTimeout(() => {
          navigate('/')
        }, 1500)
      }
    } catch (err) {
      setError('Registration failed: ' + err.message)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form className="bg-white p-8 rounded shadow-md w-full max-w-md" onSubmit={handleRegister}>
        <h2 className="text-2xl font-bold mb-6 text-center">Register </h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {success && <p className="text-green-500 mb-4">{success}</p>}

        <input
          type="text"
          placeholder="Employee Name"
          value={employeeName}
          onChange={(e) => setEmployeeName(e.target.value)}
          className="w-full p-3 mb-4 border rounded"
          required
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 mb-4 border rounded"
          required
        />

        <div className="relative mb-4">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border rounded pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
          >
            {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
          </button>
        </div>

        <input
          type="number"
          placeholder="Department ID"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="w-full p-3 mb-4 border rounded"
          required
        />

        <input
          type="text"
          placeholder="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full p-3 mb-4 border rounded"
          required
        />

        <button
          type="submit"
          className="w-full bg-green-500 text-white p-3 rounded hover:bg-green-600"
        >
          Register
        </button>

        <p className="mt-4 text-center text-gray-600">
          Already have an account?{' '}
          <span
            className="text-blue-500 cursor-pointer hover:underline"
            onClick={() => navigate('/')}
          >
            Login here
          </span>
        </p>
      </form>
    </div>
  )
}

export default Register
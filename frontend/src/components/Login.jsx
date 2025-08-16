import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useNavigate } from 'react-router-dom'
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai'
import bcrypt from 'bcryptjs'

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)

    try {
      localStorage.removeItem('user_email')

      const { data, error: fetchError } = await supabase
        .from('employee')
        .select('*')
        .eq('email', email)
        .single()

      if (fetchError || !data) {
        setError('Email or password incorrect!')
        return
      }

      const isMatch = bcrypt.compareSync(password, data.password)
      if (!isMatch) {
        setError('Email or password incorrect!')
        return
      }

      localStorage.setItem('user_email', data.email)

      if (onLoginSuccess) onLoginSuccess(data)

      navigate('/tasks')
    } catch (err) {
      console.error('Login error:', err)
      setError('Login failed: ' + err.message)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        className="bg-white p-8 rounded shadow-md w-full max-w-md"
        onSubmit={handleLogin}
      >
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}

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

        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600"
        >
          Login
        </button>

        <p className="mt-4 text-center text-gray-600">
          Don't have an account?{' '}
          <span
            className="text-blue-500 cursor-pointer hover:underline"
            onClick={() => navigate('/register')}
          >
            Register here
          </span>
        </p>
      </form>
    </div>
  )
}

export default Login
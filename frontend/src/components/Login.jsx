import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useNavigate } from 'react-router-dom'
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)

    const { data, error } = await supabase
      .from('user')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single()

if (error) {
  setError('Login Failed. Please check your email and password.')
} else if (!data) {
  setError('Email or Password Incorrect!')
} else {
  console.log('Login success:', data)


  localStorage.setItem("user_email", data.email)

  navigate('/tasks') // if success, navigate to TaskList
}
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
                
        {/* Email */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 mb-4 border rounded"
            required
          />
        {/* Password */}
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
          {showPassword ? 
            <AiOutlineEyeInvisible onClick={() => setShowPassword(false)} /> :
            <AiOutlineEye onClick={() => setShowPassword(true)} />
          }
          </button>
        </div>
        <button type="submit" className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600">
          Login
        </button>
      </form>
    </div>
  )
}

export default Login

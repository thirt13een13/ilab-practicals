import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { FlaskConical, Mail, Lock, ArrowRight, Atom, Zap } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await signIn(email, password)
      if (error) throw error
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-screen flex overflow-hidden">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center p-12"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
        {/* Decorative blobs */}
        <div className="absolute top-[-100px] left-[-100px] w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-80px] right-[-80px] w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 right-1/4 w-56 h-56 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)' }} />

        {/* Floating cards */}
        <div className="absolute top-12 right-12 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 rotate-3">
          <Atom className="w-7 h-7 text-blue-300" />
        </div>
        <div className="absolute bottom-20 left-12 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 -rotate-3">
          <Zap className="w-7 h-7 text-yellow-300" />
        </div>
        <div className="absolute top-1/2 right-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-3">
          <FlaskConical className="w-6 h-6 text-indigo-300" />
        </div>

        {/* Main content */}
        <div className="relative z-10 text-center max-w-sm">
          <div className="flex items-center justify-center mb-8">
            <div className="bg-indigo-500/20 border border-indigo-400/30 p-5 rounded-3xl">
              <FlaskConical className="w-14 h-14 text-indigo-300" />
            </div>
          </div>
          <h1 className="text-6xl font-black text-white mb-3 tracking-tight">iLab</h1>
          <p className="text-lg text-indigo-200 font-medium mb-3">Virtual Science Laboratory</p>
          <p className="text-sm text-indigo-300/60 leading-relaxed">
            Explore interactive experiments in Physics, Chemistry, and Biology — from anywhere, anytime.
          </p>

          <div className="mt-10 flex gap-3 justify-center flex-wrap">
            {['Physics', 'Chemistry', 'Biology'].map((s) => (
              <span key={s} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-1.5 text-xs text-indigo-200 font-medium">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="flex justify-center mb-4">
              <div className="bg-indigo-100 p-4 rounded-2xl">
                <FlaskConical className="h-10 w-10 text-indigo-600" />
              </div>
            </div>
            <h1 className="text-3xl font-black text-gray-900">iLab</h1>
            <p className="text-sm text-gray-500 mt-1">Virtual Science Laboratory</p>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-1">Welcome back</h2>
            <p className="text-gray-500">Sign in to continue your experiments</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm shadow-sm"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm shadow-sm"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2 shadow-lg shadow-indigo-500/30"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-center text-sm text-gray-500 pt-1">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                Create one free
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

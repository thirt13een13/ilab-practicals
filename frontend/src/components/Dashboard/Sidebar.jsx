import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  FlaskConical,
  BookOpen,
  GraduationCap,
  School
} from 'lucide-react'

const levelMeta = [
  { color: 'text-emerald-400', bg: 'bg-emerald-500/15', activeBg: 'bg-emerald-500', dot: 'bg-emerald-400' },
  { color: 'text-blue-400', bg: 'bg-blue-500/15', activeBg: 'bg-blue-500', dot: 'bg-blue-400' },
  { color: 'text-violet-400', bg: 'bg-violet-500/15', activeBg: 'bg-violet-500', dot: 'bg-violet-400' },
]

export default function Sidebar({ isOpen, toggleSidebar }) {
  const [levels, setLevels] = useState([])
  const { signOut, user } = useAuth()
  const location = useLocation()

  useEffect(() => {
    fetchLevels()
  }, [])

  const fetchLevels = async () => {
    try {
      const { data, error } = await supabase.from('academic_levels').select('*').order('id')
      if (error) throw error
      setLevels(data || [])
    } catch {
      setLevels([
        { id: 1, name: 'Primary', slug: 'primary', description: 'Primary School Level' },
        { id: 2, name: 'O-Level', slug: 'o-level', description: 'Ordinary Level' },
        { id: 3, name: 'A-Level', slug: 'a-level', description: 'Advanced Level' },
      ])
    }
  }

  const getLevelIcon = (index) => {
    const icons = [School, BookOpen, GraduationCap]
    const Icon = icons[index] || BookOpen
    return <Icon className="w-5 h-5 flex-shrink-0" />
  }

  const handleLogout = async () => {
    await signOut()
  }

  const initials = user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <div
      className={`${isOpen ? 'w-64' : 'w-[72px]'} flex flex-col flex-shrink-0 h-full transition-all duration-300 ease-in-out`}
      style={{ background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Logo row */}
      <div className="flex items-center justify-between px-4 py-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="bg-indigo-500/20 border border-indigo-400/30 p-1.5 rounded-xl flex-shrink-0">
            <FlaskConical className="w-5 h-5 text-indigo-300" />
          </div>
          {isOpen && (
            <span className="text-white font-black text-lg tracking-tight whitespace-nowrap">iLab</span>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        {isOpen && (
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-5 mb-3">
            Academic Levels
          </p>
        )}

        <div className="flex flex-col gap-1 px-2">
          {levels.map((level, index) => {
            const isActive = location.pathname.includes(`/level/${level.slug}`) || location.pathname.includes(`/experiments/`)
              ? location.pathname.includes(level.slug) : location.pathname.includes(`/level/${level.slug}`)
            const meta = levelMeta[index] || levelMeta[0]

            return (
              <Link
                key={level.id}
                to={`/dashboard/level/${level.slug}`}
                title={!isOpen ? level.name : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 ${meta.dot} rounded-full -ml-2`} />
                )}

                <span className={`transition-colors ${isActive ? meta.color : 'text-gray-500 group-hover:text-gray-300'}`}>
                  {getLevelIcon(index)}
                </span>

                {isOpen && (
                  <span className="text-sm font-medium whitespace-nowrap">{level.name}</span>
                )}

                {isOpen && isActive && (
                  <span className={`ml-auto text-xs font-medium px-1.5 py-0.5 rounded-md ${meta.bg} ${meta.color}`}>
                    Active
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User section */}
      <div className="flex-shrink-0 p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {isOpen && (
          <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-xl bg-white/5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-white">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.email || 'User'}</p>
              <p className="text-xs text-gray-500">Student</p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          title={!isOpen ? 'Logout' : undefined}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {isOpen && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </div>
  )
}

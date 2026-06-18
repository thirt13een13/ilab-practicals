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

export default function Sidebar({ isOpen, toggleSidebar }) {
  const [levels, setLevels] = useState([])
  const { signOut, user } = useAuth()
  const location = useLocation()

  useEffect(() => {
    fetchLevels()
  }, [])

  const fetchLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('academic_levels')
        .select('*')
        .order('id')
      
      if (error) {
        setLevels([
          { id: 1, name: 'Primary', slug: 'primary', description: 'Primary School Level' },
          { id: 2, name: 'O-Level', slug: 'o-level', description: 'Ordinary Level' },
          { id: 3, name: 'A-Level', slug: 'a-level', description: 'Advanced Level' }
        ])
      } else {
        setLevels(data || [])
      }
    } catch (err) {
      setLevels([
        { id: 1, name: 'Primary', slug: 'primary', description: 'Primary School Level' },
        { id: 2, name: 'O-Level', slug: 'o-level', description: 'Ordinary Level' },
        { id: 3, name: 'A-Level', slug: 'a-level', description: 'Advanced Level' }
      ])
    }
  }

  const getLevelIcon = (index) => {
    switch(index) {
      case 0: return <School className="w-5 h-5" />;
      case 1: return <BookOpen className="w-5 h-5" />;
      case 2: return <GraduationCap className="w-5 h-5" />;
      default: return <BookOpen className="w-5 h-5" />;
    }
  }

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <div className={`${isOpen ? 'w-64' : 'w-20'} bg-gray-900 text-white transition-all duration-300 ease-in-out flex flex-col flex-shrink-0 h-full`}>
      {/* Logo and Toggle */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <FlaskConical className="w-6 h-6 text-blue-400" />
          {isOpen && <span className="text-xl font-bold text-white">iLab</span>}
        </div>
        <button 
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
        >
          {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="px-3 mb-2">
          {isOpen && <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">Academic Levels</h3>}
        </div>
        
        {levels.map((level, index) => {
          const isActive = location.pathname.includes(level.slug)
          
          return (
            <Link
              key={level.id}
              to={`/dashboard/level/${level.slug}`}
              className={`flex items-center px-3 py-3 mx-2 rounded-lg transition-colors mb-1 ${
                isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className={`${isActive ? 'text-white' : 'text-gray-400'}`}>
                {getLevelIcon(index)}
              </span>
              {isOpen && (
                <span className="ml-3 text-sm font-medium">{level.name}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Info and Logout */}
      <div className="border-t border-gray-700 p-4">
        {isOpen && (
          <div className="mb-3 px-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.email || 'User'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-600 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          {isOpen && <span className="ml-3">Logout</span>}
        </button>
      </div>
    </div>
  )
}
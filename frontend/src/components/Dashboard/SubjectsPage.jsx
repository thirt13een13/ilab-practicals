import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { ArrowLeft, Atom, FlaskConical, Leaf, Globe, ChevronRight } from 'lucide-react'

const subjectMeta = {
  physics: {
    icon: Atom,
    gradient: 'from-blue-500 to-cyan-500',
    lightBg: 'bg-blue-50',
    textColor: 'text-blue-700',
    badgeColor: 'bg-blue-100 text-blue-700',
    borderColor: 'border-blue-100',
    hoverGlow: 'hover:shadow-blue-100',
  },
  chemistry: {
    icon: FlaskConical,
    gradient: 'from-green-500 to-emerald-500',
    lightBg: 'bg-green-50',
    textColor: 'text-green-700',
    badgeColor: 'bg-green-100 text-green-700',
    borderColor: 'border-green-100',
    hoverGlow: 'hover:shadow-green-100',
  },
  biology: {
    icon: Leaf,
    gradient: 'from-teal-500 to-cyan-600',
    lightBg: 'bg-teal-50',
    textColor: 'text-teal-700',
    badgeColor: 'bg-teal-100 text-teal-700',
    borderColor: 'border-teal-100',
    hoverGlow: 'hover:shadow-teal-100',
  },
  'integrated-science': {
    icon: Globe,
    gradient: 'from-orange-500 to-amber-500',
    lightBg: 'bg-orange-50',
    textColor: 'text-orange-700',
    badgeColor: 'bg-orange-100 text-orange-700',
    borderColor: 'border-orange-100',
    hoverGlow: 'hover:shadow-orange-100',
  },
}

const defaultMeta = {
  icon: Atom,
  gradient: 'from-indigo-500 to-blue-500',
  lightBg: 'bg-indigo-50',
  textColor: 'text-indigo-700',
  badgeColor: 'bg-indigo-100 text-indigo-700',
  borderColor: 'border-indigo-100',
  hoverGlow: 'hover:shadow-indigo-100',
}

export default function SubjectsPage() {
  const { levelSlug } = useParams()
  const [subjects, setSubjects] = useState([])
  const [level, setLevel] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubjects()
  }, [levelSlug])

  const fetchSubjects = async () => {
    try {
      const { data: levelData, error: levelError } = await supabase
        .from('academic_levels').select('*').eq('slug', levelSlug).single()

      if (levelError) {
        setLevel({ name: levelSlug.replace('-', ' ').toUpperCase(), slug: levelSlug })

        if (levelSlug === 'primary') {
          setSubjects([{ id: 1, name: 'Integrated Science', slug: 'integrated-science', description: 'General science for primary level' }])
        } else {
          setSubjects([
            { id: 2, name: 'Physics', slug: 'physics', description: 'Study of matter, energy, and the fundamental forces of nature' },
            { id: 3, name: 'Chemistry', slug: 'chemistry', description: 'Study of substances, their properties, and how they interact' },
            { id: 4, name: 'Biology', slug: 'biology', description: 'Study of living organisms and their vital processes' },
          ])
        }
      } else {
        setLevel(levelData)
        const { data: subjectsData } = await supabase.from('subjects').select('*').eq('level_id', levelData.id)
        setSubjects(subjectsData || [])
      }
    } catch (err) {
      console.error('Error fetching subjects:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading subjects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      {/* Back link */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Page heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-1">
          {level?.name} <span className="text-indigo-600">Subjects</span>
        </h1>
        <p className="text-gray-500">Select a subject to view available experiments</p>
      </div>

      {subjects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="bg-gray-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Atom className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No subjects yet</h3>
          <p className="text-sm text-gray-500">Subjects will appear here once they are added</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {subjects.map((subject) => {
            const meta = subjectMeta[subject.slug] || defaultMeta
            const Icon = meta.icon

            return (
              <Link
                key={subject.id}
                to={`/dashboard/experiments/${levelSlug}/${subject.slug}`}
                className={`group bg-white rounded-2xl border shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden ${meta.borderColor}`}
              >
                <div className={`h-1.5 bg-gradient-to-r ${meta.gradient}`} />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div className={`${meta.lightBg} p-3.5 rounded-xl`}>
                      <Icon className={`w-7 h-7 ${meta.textColor}`} />
                    </div>
                    <div className={`opacity-0 group-hover:opacity-100 transition-all duration-200 ${meta.textColor}`}>
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{subject.name}</h2>
                  <p className="text-sm text-gray-500 leading-relaxed mb-5">{subject.description}</p>
                  <div className={`inline-flex items-center gap-1.5 text-sm font-semibold ${meta.textColor} group-hover:gap-2.5 transition-all`}>
                    View Experiments
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

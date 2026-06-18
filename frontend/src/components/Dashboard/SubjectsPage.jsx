import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { ArrowLeft, BookOpen } from 'lucide-react'

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
        .from('academic_levels')
        .select('*')
        .eq('slug', levelSlug)
        .single()
      
      if (levelError) {
        setLevel({ name: levelSlug.replace('-', ' ').toUpperCase(), slug: levelSlug })
        
        if (levelSlug === 'primary') {
          setSubjects([
            { id: 1, name: 'Integrated Science', slug: 'integrated-science', description: 'General science for primary level' }
          ])
        } else if (levelSlug === 'o-level' || levelSlug === 'a-level') {
          setSubjects([
            { id: 2, name: 'Physics', slug: 'physics', description: 'Study of matter and energy' },
            { id: 3, name: 'Chemistry', slug: 'chemistry', description: 'Study of substances and reactions' },
            { id: 4, name: 'Biology', slug: 'biology', description: 'Study of living organisms' }
          ])
        }
      } else {
        setLevel(levelData)
        const { data: subjectsData } = await supabase
          .from('subjects')
          .select('*')
          .eq('level_id', levelData.id)
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="w-full">
        <div className="mb-6">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-indigo-600"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{level?.name} Subjects</h1>
          <p className="mt-2 text-gray-600">Select a subject to view available experiments</p>
        </div>

        {subjects.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No subjects available</h3>
            <p className="text-gray-600 mt-1">Please check back later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((subject) => (
              <Link
                key={subject.id}
                to={`/dashboard/experiments/${subject.slug}`}
                className="block group bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-indigo-100 p-3 rounded-lg">
                      <BookOpen className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">{subject.name}</h2>
                  <p className="text-gray-600 text-sm">{subject.description}</p>
                  <div className="mt-4 flex items-center text-sm text-indigo-600 font-medium">
                    View Experiments
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { ArrowLeft, FlaskConical } from 'lucide-react'

export default function ExperimentsPage() {
  const { subjectSlug } = useParams()
  const [experiments, setExperiments] = useState([])
  const [subject, setSubject] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchExperiments()
  }, [subjectSlug])

  const fetchExperiments = async () => {
    try {
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .eq('slug', subjectSlug)
        .single()
      
      if (subjectError) {
        setSubject({ name: subjectSlug.charAt(0).toUpperCase() + subjectSlug.slice(1), slug: subjectSlug })
        
        const mockExperiments = {
          'physics': [
            { id: 1, title: "Ohm's Law", slug: 'ohms-law', description: 'Verify the relationship between voltage, current, and resistance' },
            { id: 2, title: 'Pendulum Motion', slug: 'pendulum-motion', description: 'Study simple harmonic motion and calculate gravity' },
            { id: 3, title: 'Circuit Analysis', slug: 'circuit-analysis', description: 'Analyze series and parallel circuits' }
          ],
          'chemistry': [
            { id: 4, title: 'Acid-Base Titration', slug: 'acid-base-titration', description: 'Determine concentration through titration' },
            { id: 5, title: 'Chemical Reactions', slug: 'chemical-reactions', description: 'Observe and analyze different types of reactions' }
          ],
          'biology': [
            { id: 6, title: 'Microscope Simulation', slug: 'microscope-simulation', description: 'Virtual microscope for studying cells' },
            { id: 7, title: 'Cell Structure', slug: 'cell-structure', description: 'Explore plant and animal cell structures' }
          ],
          'integrated-science': [
            { id: 8, title: 'Plant Growth', slug: 'plant-growth', description: 'Study factors affecting plant growth' },
            { id: 9, title: 'Water Cycle', slug: 'water-cycle', description: 'Understand the water cycle process' }
          ]
        }
        
        setExperiments(mockExperiments[subjectSlug] || [])
      } else {
        setSubject(subjectData)
        const { data: experimentsData } = await supabase
          .from('experiments')
          .select('*')
          .eq('subject_id', subjectData.id)
        setExperiments(experimentsData || [])
      }
    } catch (err) {
      console.error('Error fetching experiments:', err)
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

  const getLevelSlug = () => {
    if (subjectSlug === 'integrated-science') return 'primary'
    return 'o-level'
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="w-full">
        <div className="mb-6">
          <Link 
            to={`/dashboard/level/${getLevelSlug()}`}
            className="inline-flex items-center text-sm text-gray-600 hover:text-indigo-600"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Subjects
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{subject?.name} Experiments</h1>
          <p className="mt-2 text-gray-600">Select an experiment to launch</p>
        </div>

        {experiments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <FlaskConical className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No experiments available</h3>
            <p className="text-gray-600 mt-1">Experiments are coming soon</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {experiments.map((experiment) => (
              <Link
                key={experiment.id}
                to={`/dashboard/experiment/${experiment.slug}`}
                className="block group bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-green-100 p-3 rounded-lg">
                      <FlaskConical className="w-6 h-6 text-green-600" />
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Available
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">{experiment.title}</h2>
                  <p className="text-gray-600 text-sm mb-4">{experiment.description}</p>
                  <div className="flex items-center text-sm text-indigo-600 font-medium">
                    Launch Experiment
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
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
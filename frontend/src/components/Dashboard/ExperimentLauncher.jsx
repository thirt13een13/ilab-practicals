import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { ArrowLeft, FlaskConical, Loader2, Maximize2, Minimize2, X } from 'lucide-react'

export default function ExperimentLauncher() {
  const { experimentSlug } = useParams()
  const [experiment, setExperiment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const allExperiments = {
    'pendulum': {
      title: 'Pendulum Bob',
      slug: 'pendulum',
      description: 'Study simple harmonic motion and determine the acceleration due to gravity',
      docker_image: 'ilab-physics-pendulum',
      port: 3001,
      subject: 'Physics',
      level: 'o-level',
    },
  }

  useEffect(() => {
    loadExperiment()
  }, [experimentSlug])

  const loadExperiment = async () => {
    setLoading(true)
    setError('')
    
    console.log('Loading experiment:', experimentSlug)
    
    // Get experiment from fallback data
    const fallbackExperiment = allExperiments[experimentSlug]
    
    if (fallbackExperiment) {
      setExperiment(fallbackExperiment)
    } else {
      // Try Supabase
      try {
        const { data } = await supabase
          .from('experiments')
          .select('*')
          .eq('slug', experimentSlug)
          .single()
        
        if (data) {
          setExperiment(data)
        } else {
          setError('Experiment not found')
        }
      } catch (err) {
        setError('Failed to load experiment')
      }
    }
    
    setLoading(false)
  }

  const closeExperiment = () => {
    // Navigate back to experiments list
    window.location.href = getBackLink()
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const getBackLink = () => {
    if (!experiment) return '/dashboard'
    const subjectSlugMap = {
      'Physics': 'physics',
      'Chemistry': 'chemistry',
      'Biology': 'biology',
      'Integrated Science': 'integrated-science',
    }
    const subject = subjectSlugMap[experiment.subject] || 'physics'
    const level = experiment.level || 'o-level'
    return `/dashboard/experiments/${level}/${subject}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading experiment...</p>
        </div>
      </div>
    )
  }

  if (!experiment) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || 'Experiment not found'}</p>
          <Link to="/dashboard" className="text-indigo-600 mt-4 inline-block">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  // Fullscreen mode
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <div className="bg-gray-900 text-white px-4 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2">
            <FlaskConical className="w-5 h-5 text-blue-400" />
            <span className="font-medium">{experiment?.title}</span>
            <span className="text-xs bg-green-600 px-2 py-0.5 rounded-full">Running</span>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={toggleFullscreen} className="p-1.5 hover:bg-gray-700 rounded" title="Exit Fullscreen">
              <Minimize2 className="w-4 h-4" />
            </button>
            <button onClick={closeExperiment} className="p-1.5 hover:bg-red-600 rounded" title="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <iframe
          src={`http://localhost:${experiment?.port}`}
          className="flex-1 w-full border-0"
          title={experiment?.title}
        />
      </div>
    )
  }

  // Normal mode - SHOW IFRAME DIRECTLY
  return (
    <div className="h-full flex flex-col">
      <div className="bg-gray-900 text-white px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <Link to={getBackLink()} className="inline-flex items-center text-sm text-gray-300 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
          <span className="text-gray-600">|</span>
          <div className="flex items-center space-x-2">
            <FlaskConical className="w-4 h-4 text-blue-400" />
            <span className="font-medium text-sm">{experiment?.title}</span>
            <span className="text-xs bg-green-600 px-2 py-0.5 rounded-full">Running</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={toggleFullscreen} className="p-1.5 hover:bg-gray-700 rounded" title="Fullscreen">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button onClick={closeExperiment} className="p-1.5 hover:bg-red-600 rounded" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <iframe
        src={`http://localhost:${experiment?.port}`}
        className="flex-1 w-full border-0"
        title={experiment?.title}
      />
    </div>
  )
}
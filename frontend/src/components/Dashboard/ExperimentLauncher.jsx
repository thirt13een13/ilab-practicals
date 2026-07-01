import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { ArrowLeft, FlaskConical, Loader2, Maximize2, Minimize2, X } from 'lucide-react'

const DOCKER_MANAGER = 'http://localhost:3000'

export default function ExperimentLauncher() {
  const { experimentSlug } = useParams()
  const [experiment, setExperiment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [containerStatus, setContainerStatus] = useState('idle') // idle | starting | ready | error
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
    'focal-length': {
      title: 'Focal Length',
      slug: 'focal-length',
      description: 'Determine the focal length of a converging lens using the lens equation and ray diagrams',
      docker_image: 'focal-length',
      port: 3002,
      subject: 'Physics',
      level: 'o-level',
    },
    'pendulum-bob': {
      title: 'Pendulum Bob',
      slug: 'pendulum-bob',
      description: 'Investigate the relationship between pendulum length and period to precisely determine g',
      docker_image: 'ilab-physics-pendulum',
      port: 3001,
      subject: 'Physics',
      level: 'a-level',
    },
    'acid-base-titration': {
      title: 'Acid-Base Titration',
      slug: 'acid-base-titration',
      description: 'Determine the concentration of an unknown solution through careful titration',
      docker_image: 'acid-base-titration',
      port: 3003,
      subject: 'Chemistry',
      level: 'o-level',
    },
    'current-electricity': {
      title: 'Current Electricity',
      slug: 'current-electricity',
      description: 'Investigate Ohm\'s Law, resistance, series/parallel circuits, EMF, and more using a virtual circuit board',
      docker_image: 'current-electricity',
      port: 3004,
      subject: 'Physics',
      level: 'o-level',
    },
    'water-retention': {
      title: 'Soil Water Retention',
      slug: 'water-retention',
      description: 'Compare how sandy, loamy, and clay soils retain water by setting up filtration funnels and measuring drainage',
      docker_image: 'water-retention',
      port: 3005,
      subject: 'Integrated Science',
      level: 'primary',
    },
    'heat-conduction': {
      title: 'Heat Conduction',
      slug: 'heat-conduction',
      description: 'Investigate conductors and insulators by observing how heat travels along copper, wood, and plastic rods',
      docker_image: 'heat-conduction',
      port: 3006,
      subject: 'Integrated Science',
      level: 'primary',
    },
    'magnets': {
      title: 'Magnets',
      slug: 'magnets',
      description: 'Explore magnetic attraction and repulsion, poles, and magnetic fields using bar magnets and everyday objects',
      docker_image: 'magnets',
      port: 3007,
      subject: 'Integrated Science',
      level: 'primary',
    },
    'magnets-o-level': {
      title: 'Magnets',
      slug: 'magnets-o-level',
      description: 'Explore magnetic attraction and repulsion, poles, and magnetic fields using bar magnets and everyday objects',
      docker_image: 'magnets',
      port: 3007,
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

    let exp = allExperiments[experimentSlug]

    if (!exp) {
      try {
        const { data } = await supabase
          .from('experiments')
          .select('*')
          .eq('slug', experimentSlug)
          .single()
        if (data) exp = data
      } catch (_) {}
    }

    if (!exp) {
      setError('Experiment not found')
      setLoading(false)
      return
    }

    setExperiment(exp)
    setLoading(false)
    await startContainer(exp)
  }

  const startContainer = async (exp) => {
    setContainerStatus('starting')
    try {
      const res = await fetch(`${DOCKER_MANAGER}/api/start-experiment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: exp.docker_image, port: exp.port }),
      })
      const data = await res.json()
      if (data.success) {
        setContainerStatus('ready')
      } else {
        setError(data.error || 'Failed to start experiment container')
        setContainerStatus('error')
      }
    } catch (err) {
      setError('Could not reach the Docker Manager. Make sure it is running on port 3000.')
      setContainerStatus('error')
    }
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
      'integrated-science': 'integrated-science',
    }
    const subject = subjectSlugMap[experiment.subject] || 'physics'
    const level = experiment.level || 'o-level'
    return `/dashboard/experiments/${level}/${subject}`
  }

  if (loading || containerStatus === 'starting') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-700 font-medium">
            {loading ? 'Loading experiment...' : `Starting ${experiment?.title}...`}
          </p>
          {containerStatus === 'starting' && (
            <p className="mt-1 text-sm text-gray-400">Launching Docker container, please wait</p>
          )}
        </div>
      </div>
    )
  }

  if (!experiment || containerStatus === 'error') {
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
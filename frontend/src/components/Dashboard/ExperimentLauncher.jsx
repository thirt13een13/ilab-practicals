import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { ArrowLeft, FlaskConical, Loader2, Play, Maximize2, Minimize2, X } from 'lucide-react'

export default function ExperimentLauncher() {
  const { experimentSlug } = useParams()
  const [experiment, setExperiment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState(false)
  const [error, setError] = useState('')
  const [containerStatus, setContainerStatus] = useState('stopped')
  const [showIframe, setShowIframe] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const DOCKER_MANAGER_URL = 'http://localhost:3000'

  useEffect(() => {
    fetchExperimentDetails()
  }, [experimentSlug])

  const fetchExperimentDetails = async () => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('experiments')
        .select('*')
        .eq('slug', experimentSlug)
        .single()
      
      if (data && !supabaseError) {
        setExperiment(data)
        checkContainerStatus(data.port)
      } else {
        setExperiment({
          title: experimentSlug.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' '),
          slug: experimentSlug,
          description: 'Interactive science experiment',
          docker_image: `ilab-physics-${experimentSlug}`,
          port: 3001
        })
        checkContainerStatus(3001)
      }
    } catch (err) {
      console.error('Error fetching experiment:', err)
      setError('Failed to load experiment details')
    } finally {
      setLoading(false)
    }
  }

  const checkContainerStatus = async (port) => {
    try {
      const response = await fetch(`http://localhost:${port}/health`)
      if (response.ok) {
        setContainerStatus('running')
        setShowIframe(true)
      }
    } catch (err) {
      setContainerStatus('stopped')
    }
  }

  const launchExperiment = async () => {
    if (!experiment) return
    
    setLaunching(true)
    setError('')

    try {
      const response = await fetch(`${DOCKER_MANAGER_URL}/api/start-experiment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: experiment.docker_image, 
          port: experiment.port 
        })
      })

      const data = await response.json()

      if (data.success) {
        setContainerStatus('running')
        setTimeout(() => {
          setShowIframe(true)
        }, 1500)
      } else {
        throw new Error(data.error || 'Failed to start container')
      }
    } catch (err) {
      console.error('Launch error:', err)
      setError(`Failed to launch experiment: ${err.message}`)
    } finally {
      setLaunching(false)
    }
  }

  const closeExperiment = () => {
    setShowIframe(false)
    setIsFullscreen(false)
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  // Fullscreen mode - covers everything
  if (showIframe && isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        {/* Toolbar */}
        <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2">
            <FlaskConical className="w-5 h-5 text-indigo-600" />
            <span className="font-medium text-gray-700">{experiment?.title}</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Running</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleFullscreen}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
              title="Exit Fullscreen"
            >
              <Minimize2 className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={closeExperiment}
              className="p-1.5 hover:bg-red-100 rounded transition-colors"
              title="Close Experiment"
            >
              <X className="w-4 h-4 text-red-600" />
            </button>
          </div>
        </div>
        
        {/* Iframe takes remaining space */}
        <iframe
          src={`http://localhost:${experiment?.port}`}
          className="flex-1 w-full border-0"
          title={experiment?.title}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    )
  }

  // Experiment running in normal mode - takes full content area
  if (showIframe) {
    return (
      <div className="h-full flex flex-col">
        {/* Breadcrumb & Toolbar */}
        <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <Link 
              to="/dashboard/experiments/physics"
              className="inline-flex items-center text-sm text-gray-600 hover:text-indigo-600"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Experiments
            </Link>
            <span className="text-gray-400">|</span>
            <div className="flex items-center space-x-2">
              <FlaskConical className="w-4 h-4 text-indigo-600" />
              <span className="font-medium text-gray-700 text-sm">{experiment?.title}</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Running</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleFullscreen}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={closeExperiment}
              className="p-1.5 hover:bg-red-100 rounded transition-colors"
              title="Close Experiment"
            >
              <X className="w-4 h-4 text-red-600" />
            </button>
          </div>
        </div>
        
        {/* Iframe takes remaining height */}
        <iframe
          src={`http://localhost:${experiment?.port}`}
          className="flex-1 w-full border-0"
          title={experiment?.title}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    )
  }

  // Experiment details page (not launched yet)
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6">
        <Link 
          to="/dashboard/experiments/physics"
          className="inline-flex items-center text-sm text-gray-600 hover:text-indigo-600"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Experiments
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{experiment?.title}</h1>
              <p className="text-gray-600 text-lg">{experiment?.description}</p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-lg">
              <FlaskConical className="w-8 h-8 text-indigo-600" />
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${
                containerStatus === 'running' ? 'bg-green-500' : 'bg-gray-300'
              }`}></div>
              <span className="text-sm text-gray-600">
                Status: {containerStatus === 'running' ? 'Running' : 'Stopped'}
              </span>
            </div>

            <button
              onClick={launchExperiment}
              disabled={launching}
              className="w-full flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {launching ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Starting Experiment...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Launch Experiment
                </>
              )}
            </button>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold mb-3">Experiment Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Subject</p>
                <p className="font-medium">Physics</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Level</p>
                <p className="font-medium">O-Level</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Type</p>
                <p className="font-medium">Interactive Simulation</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Duration</p>
                <p className="font-medium">Self-paced</p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Click the "Launch Experiment" button to start</li>
              <li>The experiment will open and fill the workspace area</li>
              <li>Use the fullscreen button (⛶) to expand even further</li>
              <li>Click "X" to close the experiment and return here</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
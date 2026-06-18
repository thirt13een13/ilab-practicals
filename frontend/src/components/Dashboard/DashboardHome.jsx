import { useAuth } from '../../contexts/AuthContext'
import { FlaskConical, BookOpen, GraduationCap, School } from 'lucide-react'

export default function DashboardHome() {
  const { user } = useAuth()

  const levels = [
    {
      name: 'Primary',
      description: 'Integrated Science for Primary School',
      icon: School,
      color: 'bg-green-500',
      slug: 'primary'
    },
    {
      name: 'O-Level',
      description: 'Physics, Chemistry, Biology',
      icon: BookOpen,
      color: 'bg-blue-500',
      slug: 'o-level'
    },
    {
      name: 'A-Level',
      description: 'Advanced Sciences',
      icon: GraduationCap,
      color: 'bg-purple-500',
      slug: 'a-level'
    }
  ]

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="w-full">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-100 p-3 rounded-full">
                <FlaskConical className="w-8 h-8 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome to iLab Dashboard
                </h1>
                <p className="text-gray-600 mt-1">
                  Select an academic level from the sidebar to start exploring experiments
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Level Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {levels.map((level) => {
            const Icon = level.icon
            return (
              <div
                key={level.name}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  window.location.href = `/dashboard/level/${level.slug}`
                }}
              >
                <div className={`${level.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{level.name}</h3>
                <p className="text-gray-600 text-sm">{level.description}</p>
                <div className="mt-4 flex items-center text-indigo-600 text-sm font-medium">
                  Browse Experiments
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            )
          })}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500">Available Subjects</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">7</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Experiments</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">15</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500">Active Sessions</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">0</p>
          </div>
        </div>

        {/* Getting Started Guide */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-sm p-6 text-white">
          <h2 className="text-xl font-bold mb-3">Getting Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start space-x-3">
              <div className="bg-white bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-semibold">Choose Level</h3>
                <p className="text-sm text-white text-opacity-90">Select your academic level from the sidebar</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-white bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-semibold">Pick Subject</h3>
                <p className="text-sm text-white text-opacity-90">Browse available subjects and experiments</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-white bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-semibold">Launch Experiment</h3>
                <p className="text-sm text-white text-opacity-90">Click to start interactive experiments</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
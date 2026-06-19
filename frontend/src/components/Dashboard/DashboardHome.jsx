import { useAuth } from '../../contexts/AuthContext'
import { FlaskConical, BookOpen, GraduationCap, School, ArrowRight, Atom, Microscope, Zap, BookMarked } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const levels = [
  {
    name: 'Primary',
    description: 'Integrated Science for Primary School students',
    icon: School,
    slug: 'primary',
    gradient: 'from-emerald-500 to-teal-600',
    lightBg: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    subjects: ['Integrated Science'],
  },
  {
    name: 'O-Level',
    description: 'Physics, Chemistry and Biology at ordinary level',
    icon: BookOpen,
    slug: 'o-level',
    gradient: 'from-blue-500 to-indigo-600',
    lightBg: 'bg-blue-50',
    textColor: 'text-blue-700',
    badgeColor: 'bg-blue-100 text-blue-700',
    subjects: ['Physics', 'Chemistry', 'Biology'],
  },
  {
    name: 'A-Level',
    description: 'Advanced Sciences with deeper theoretical concepts',
    icon: GraduationCap,
    slug: 'a-level',
    gradient: 'from-violet-500 to-purple-600',
    lightBg: 'bg-violet-50',
    textColor: 'text-violet-700',
    badgeColor: 'bg-violet-100 text-violet-700',
    subjects: ['Physics', 'Chemistry', 'Biology'],
  },
]

const stats = [
  { label: 'Available Subjects', value: '7', icon: BookMarked, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Total Experiments', value: '10', icon: FlaskConical, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { label: 'Active Sessions', value: '0', icon: Atom, color: 'text-emerald-600', bg: 'bg-emerald-50' },
]

const steps = [
  { n: '1', title: 'Choose Level', desc: 'Select your academic level — Primary, O-Level, or A-Level', icon: School },
  { n: '2', title: 'Pick a Subject', desc: 'Browse available subjects like Physics, Chemistry, or Biology', icon: BookOpen },
  { n: '3', title: 'Launch Experiment', desc: 'Click any experiment to start an interactive virtual session', icon: Zap },
]

export default function DashboardHome() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Student'

  return (
    <div className="h-full overflow-y-auto">
      {/* Hero banner */}
      <div className="relative overflow-hidden px-8 py-10"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #1d4ed8 100%)' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-60px] right-[-60px] w-64 h-64 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)' }} />
          <div className="absolute bottom-[-40px] left-1/3 w-48 h-48 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)' }} />
        </div>
        <div className="absolute top-6 right-8 opacity-10">
          <Atom className="w-32 h-32 text-white" />
        </div>
        <div className="absolute bottom-4 right-32 opacity-10">
          <Microscope className="w-20 h-20 text-white" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-indigo-200" />
              <span className="text-xs font-semibold text-indigo-200">Virtual Lab</span>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2 leading-tight">
            Welcome back, {firstName}!
          </h1>
          <p className="text-indigo-200 text-base max-w-lg">
            Your virtual science laboratory is ready. Choose an academic level below to start exploring experiments.
          </p>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                <div className={`${stat.bg} p-3 rounded-xl`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">{stat.label}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Level Cards */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Academic Levels</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {levels.map((level) => {
              const Icon = level.icon
              return (
                <div
                  key={level.name}
                  onClick={() => navigate(`/dashboard/level/${level.slug}`)}
                  className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  {/* Gradient top */}
                  <div className={`h-2 bg-gradient-to-r ${level.gradient}`} />
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`${level.lightBg} p-3 rounded-xl`}>
                        <Icon className={`w-6 h-6 ${level.textColor}`} />
                      </div>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {level.subjects.slice(0, 2).map((s) => (
                          <span key={s} className={`text-xs font-medium px-2 py-0.5 rounded-lg ${level.badgeColor}`}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{level.name}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed mb-4">{level.description}</p>
                    <div className={`flex items-center gap-1 text-sm font-semibold ${level.textColor} group-hover:gap-2 transition-all`}>
                      Browse Experiments
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Getting Started */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-lg font-bold text-gray-900 mb-1">How to get started</h2>
            <p className="text-sm text-gray-500">Follow these three steps to run your first experiment</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            {steps.map((step) => {
              const Icon = step.icon
              return (
                <div key={step.n} className="px-6 py-5 flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-black text-sm">{step.n}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <h3 className="text-sm font-bold text-gray-900">{step.title}</h3>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { ArrowLeft, FlaskConical, Play, Clock, Atom, Leaf, Globe } from 'lucide-react'

const subjectMeta = {
  physics: {
    icon: Atom,
    gradient: 'from-blue-500 to-cyan-500',
    lightBg: 'bg-blue-50',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-600',
    badgeBg: 'bg-blue-100',
    dotColor: 'bg-blue-400',
  },
  chemistry: {
    icon: FlaskConical,
    gradient: 'from-green-500 to-emerald-500',
    lightBg: 'bg-green-50',
    textColor: 'text-green-700',
    iconColor: 'text-green-600',
    badgeBg: 'bg-green-100',
    dotColor: 'bg-green-400',
  },
  biology: {
    icon: Leaf,
    gradient: 'from-teal-500 to-cyan-600',
    lightBg: 'bg-teal-50',
    textColor: 'text-teal-700',
    iconColor: 'text-teal-600',
    badgeBg: 'bg-teal-100',
    dotColor: 'bg-teal-400',
  },
  'integrated-science': {
    icon: Globe,
    gradient: 'from-orange-500 to-amber-500',
    lightBg: 'bg-orange-50',
    textColor: 'text-orange-700',
    iconColor: 'text-orange-600',
    badgeBg: 'bg-orange-100',
    dotColor: 'bg-orange-400',
  },
}

const defaultMeta = {
  icon: FlaskConical,
  gradient: 'from-indigo-500 to-blue-500',
  lightBg: 'bg-indigo-50',
  textColor: 'text-indigo-700',
  iconColor: 'text-indigo-600',
  badgeBg: 'bg-indigo-100',
  dotColor: 'bg-indigo-400',
}

const mockExperiments = {
  'primary-integrated-science': [
    { id: 1, title: 'Seed Germination', slug: 'seed-germination', description: 'Investigate the conditions required for seed germination and observe early growth stages', duration: '25 min' },
  ],
  'o-level-physics': [
    { id: 2, title: 'Current Electricity', slug: 'current-electricity', description: 'Investigate Ohm\'s Law, resistance, series/parallel circuits, EMF, and more using a virtual circuit board', duration: '20 min' },
    { id: 3, title: 'Pendulum Bob', slug: 'pendulum', description: 'Study simple harmonic motion and determine the acceleration due to gravity using a pendulum', duration: '25 min' },
    { id: 4, title: 'Focal Length', slug: 'focal-length', description: 'Determine the focal length of a converging lens using the lens equation and ray diagrams', duration: '20 min' },
  ],
  'o-level-chemistry': [
    { id: 5, title: 'Acid-Base Titration', slug: 'acid-base-titration', description: 'Determine the concentration of an unknown solution through careful titration', duration: '35 min' },
  ],
  'o-level-biology': [],
  'a-level-physics': [
    { id: 6, title: 'Pendulum Bob', slug: 'pendulum-bob', description: 'Investigate the relationship between pendulum length and period to precisely determine g', duration: '30 min' },
  ],
  'a-level-chemistry': [
    { id: 7, title: 'Quantitative Analysis for Inorganic', slug: 'quantitative-analysis-inorganic', description: 'Determine the composition of inorganic compounds through systematic gravimetric and volumetric techniques', duration: '45 min' },
    { id: 8, title: 'Quantitative Analysis for Organic', slug: 'quantitative-analysis-organic', description: 'Determine the composition of organic compounds through gravimetric analysis and combustion methods', duration: '45 min' },
  ],
  'a-level-biology': [
    { id: 9, title: 'Food Test', slug: 'food-test', description: 'Identify the presence of carbohydrates, proteins, and lipids in food samples using standard biochemical tests', duration: '30 min' },
    { id: 10, title: 'Cockroach Dissection', slug: 'cockroach-dissection', description: 'Explore the internal anatomy of a cockroach and identify major organ systems in a virtual dissection', duration: '35 min' },
  ],
}

export default function ExperimentsPage() {
  const { levelSlug, subjectSlug } = useParams()
  const [experiments, setExperiments] = useState([])
  const [subject, setSubject] = useState(null)
  const [loading, setLoading] = useState(true)

  const meta = subjectMeta[subjectSlug] || defaultMeta
  const SubjectIcon = meta.icon

  useEffect(() => {
    fetchExperiments()
  }, [levelSlug, subjectSlug])

  const fetchExperiments = async () => {
    try {
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects').select('*').eq('slug', subjectSlug).single()

      if (subjectError) {
        setSubject({ name: subjectSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), slug: subjectSlug })
        setExperiments(mockExperiments[`${levelSlug}-${subjectSlug}`] || [])
      } else {
        setSubject(subjectData)
        const { data: experimentsData } = await supabase.from('experiments').select('*').eq('subject_id', subjectData.id)
        setExperiments(experimentsData || [])
      }
    } catch (err) {
      console.error('Error fetching experiments:', err)
    } finally {
      setLoading(false)
    }
  }

  const getLevelSlug = () => levelSlug

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading experiments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      {/* Back link */}
      <Link
        to={`/dashboard/level/${getLevelSlug()}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Subjects
      </Link>

      {/* Page header */}
      <div className="flex items-start gap-4 mb-8">
        <div className={`${meta.lightBg} p-4 rounded-2xl`}>
          <SubjectIcon className={`w-8 h-8 ${meta.iconColor}`} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-1">
            {subject?.name} <span className={meta.textColor}>Experiments</span>
          </h1>
          <p className="text-gray-500 text-sm">{experiments.length} experiment{experiments.length !== 1 ? 's' : ''} available — click any to launch</p>
        </div>
      </div>

      {experiments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className={`${meta.lightBg} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
            <FlaskConical className={`w-8 h-8 ${meta.iconColor}`} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No experiments yet</h3>
          <p className="text-sm text-gray-500">Experiments for this subject are coming soon</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {experiments.map((experiment) => (
            <Link
              key={experiment.id}
              to={`/dashboard/experiment/${experiment.slug}`}
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
            >
              {/* Gradient bar */}
              <div className={`h-1.5 bg-gradient-to-r ${meta.gradient}`} />

              <div className="p-6">
                {/* Top row */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`${meta.lightBg} p-2.5 rounded-xl`}>
                    <FlaskConical className={`w-5 h-5 ${meta.iconColor}`} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${meta.dotColor}`} />
                    <span className={`text-xs font-semibold ${meta.textColor}`}>Available</span>
                  </div>
                </div>

                <h2 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors">
                  {experiment.title}
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed mb-5">
                  {experiment.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  {experiment.duration && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      {experiment.duration}
                    </div>
                  )}
                  <div className={`flex items-center gap-1.5 text-sm font-semibold ${meta.textColor} ml-auto group-hover:gap-2.5 transition-all`}>
                    <Play className="w-3.5 h-3.5" />
                    Launch
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

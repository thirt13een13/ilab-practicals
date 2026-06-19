import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { FlaskConical } from 'lucide-react'

const getBreadcrumb = (pathname) => {
  if (pathname === '/dashboard' || pathname === '/dashboard/') return 'Home'
  if (pathname.includes('/level/')) {
    const slug = pathname.split('/level/')[1]?.split('/')[0] || ''
    return slug.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
  if (pathname.includes('/experiments/')) {
    const parts = pathname.split('/experiments/')[1]?.split('/') || []
    const slug = parts[1] || parts[0] || ''
    return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
  if (pathname.includes('/experiment/')) {
    const slug = pathname.split('/experiment/')[1]?.split('/')[0] || ''
    return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return 'Dashboard'
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()
  const breadcrumb = getBreadcrumb(location.pathname)

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#f8fafc' }}>
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 bg-white border-b border-gray-100 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400 font-medium">iLab</span>
            <span className="text-gray-300">/</span>
            <span className="text-gray-800 font-semibold">{breadcrumb}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-xs font-semibold text-indigo-600">Virtual Lab</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

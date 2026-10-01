import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import RoleGuard from './components/RoleGuard'
import Login from './pages/Login'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Lessons from './pages/Lessons'
import DrawingsLibrary from './pages/DrawingsLibrary'
import PdfMaterials from './pages/PdfMaterials'
import VideoActivities from './pages/VideoActivities'
import Practice from './pages/Practice'
import MySubmissions from './pages/MySubmissions'
import Assessments from './pages/Assessments'
import Survey from './pages/Survey'
import ReviewQueue from './pages/ReviewQueue'
import Gradebook from './pages/Gradebook'
import Analytics from './pages/Analytics'
import ResearchData from './pages/ResearchData'
import Announcements from './pages/Announcements'
import Users from './pages/Users'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

const ALL = ['student', 'teacher', 'admin']
const STAFF = ['teacher', 'admin']
const ADMIN_ONLY = ['admin']

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <RoleGuard>
            <AppLayout />
          </RoleGuard>
        }
      >
        <Route index element={<Home />} />
        <Route path="dashboard" element={<Dashboard />} />

        <Route path="lessons" element={<RoleGuard allow={['student']}><Lessons /></RoleGuard>} />
        <Route path="practice" element={<RoleGuard allow={['student']}><Practice /></RoleGuard>} />
        <Route path="submissions" element={<RoleGuard allow={['student']}><MySubmissions /></RoleGuard>} />
        <Route path="assessments" element={<RoleGuard allow={['student']}><Assessments /></RoleGuard>} />
        <Route path="survey" element={<RoleGuard allow={['student']}><Survey /></RoleGuard>} />

        <Route path="drawings" element={<RoleGuard allow={ALL}><DrawingsLibrary /></RoleGuard>} />
        <Route path="materials" element={<RoleGuard allow={ALL}><PdfMaterials /></RoleGuard>} />
        <Route path="videos" element={<RoleGuard allow={ALL}><VideoActivities /></RoleGuard>} />
        <Route path="announcements" element={<RoleGuard allow={ALL}><Announcements /></RoleGuard>} />

        <Route path="review" element={<RoleGuard allow={STAFF}><ReviewQueue /></RoleGuard>} />
        <Route path="gradebook" element={<RoleGuard allow={STAFF}><Gradebook /></RoleGuard>} />

        <Route path="analytics" element={<RoleGuard allow={ADMIN_ONLY}><Analytics /></RoleGuard>} />
        <Route path="research" element={<RoleGuard allow={ADMIN_ONLY}><ResearchData /></RoleGuard>} />
        <Route path="users" element={<RoleGuard allow={ADMIN_ONLY}><Users /></RoleGuard>} />
        <Route path="settings" element={<RoleGuard allow={ADMIN_ONLY}><Settings /></RoleGuard>} />

        <Route path="home" element={<Navigate to="/dashboard" replace />} />
        <Route path="video-activities" element={<Navigate to="/videos" replace />} />
        <Route path="video-activities/:id" element={<Navigate to="/videos" replace />} />
        <Route path="sketch-pad" element={<Navigate to="/practice" replace />} />
        <Route path="lesson/:id" element={<Navigate to="/materials" replace />} />
        <Route path="lessons/:id" element={<Navigate to="/materials" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

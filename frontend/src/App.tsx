import { Navigate, Route, Routes } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { DashboardPage } from './pages/DashboardPage'
import { AssistantPage } from './pages/AssistantPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { DocumentViewerPage } from './pages/DocumentViewerPage'
import { EvaluationPage } from './pages/EvaluationPage'
import { HowItWorksPage } from './pages/HowItWorksPage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { ProtectedRoute } from './components/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistant"
        element={
          <ProtectedRoute>
            <AssistantPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <DocumentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/:documentId"
        element={
          <ProtectedRoute>
            <DocumentViewerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/evaluation"
        element={
          <ProtectedRoute>
            <EvaluationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/how-it-works"
        element={
          <ProtectedRoute>
            <HowItWorksPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

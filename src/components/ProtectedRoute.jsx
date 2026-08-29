import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ session, profile, allowedRoles, children }) {
  if (!session) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(profile?.role)) return <Navigate to="/" replace />
  return children
}

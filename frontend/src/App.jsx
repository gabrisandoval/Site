import './sessionGuard' // must be loaded first: it watches every request for an expired login
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ServicesManager from './pages/ServicesManager'
import StaffBookings from './pages/StaffBookings'
import AdminUsers from './pages/AdminUsers'
import BookService from './pages/BookService'
import MyBookings from './pages/MyBookings'
import Profile from './pages/Profile'
import SessionNotice from './components/SessionNotice'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SessionNotice />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registrati" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={['admin', 'employee']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/servizi"
            element={
              <ProtectedRoute roles={['admin', 'employee']}>
                <ServicesManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/prenotazioni"
            element={
              <ProtectedRoute roles={['admin', 'employee']}>
                <StaffBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/utenti"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prenota/:serviceId"
            element={
              <ProtectedRoute roles={['customer']}>
                <BookService />
              </ProtectedRoute>
            }
          />
          <Route
            path="/le-mie-prenotazioni"
            element={
              <ProtectedRoute roles={['customer']}>
                <MyBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profilo"
            element={
              <ProtectedRoute roles={['employee', 'customer']}>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
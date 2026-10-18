import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import StaffBookings from './pages/StaffBookings'
import AdminUsers from './pages/AdminUsers'
import BookService from './pages/BookService'
import MyBookings from './pages/MyBookings'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
import React from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { DashboardProvider } from './context/DashboardContext'
import Layout from './layouts/layout'
import Dashboard from './pages/Dashboard'

export default function App() {
  return (
    <DashboardProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DashboardProvider>
  )
}

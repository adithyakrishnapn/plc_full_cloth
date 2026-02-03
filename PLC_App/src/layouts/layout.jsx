import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function Layout() {
	return (
		<div className="min-h-screen bg-[#0b0f1a] text-slate-100">
			<div className="flex">
				<Sidebar />
				<div className="flex min-h-screen flex-1 flex-col">
					<Navbar />
					<main className="flex-1 bg-[#0b0f1a] px-6 pb-10 pt-6">
						<Outlet />
					</main>
					<Footer />
				</div>
			</div>
		</div>
	)
}

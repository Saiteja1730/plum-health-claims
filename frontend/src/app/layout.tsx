import "./globals.css";
import Sidebar from "../components/Sidebar";
import { ReactNode } from "react";

export const metadata = {
  title: "Plum OPD Claim Adjudication",
  description:
    "AI Powered Insurance Claim Processing"
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {

  return (

    <html lang="en" className="h-full">

      <body
        className="
        bg-slate-950
        text-slate-100
        min-h-screen
        flex
        h-full
        overflow-hidden
        "
      >

        <Sidebar />

        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          {/* Top Navigation Bar */}
          <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm z-10 shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-slate-400 font-medium text-xs font-mono select-none">SYSTEM // ACTIVE</span>
            </div>
            
            <div className="flex items-center gap-6">
              {/* Notifications */}
              <button className="relative text-slate-400 hover:text-slate-700 transition">
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              
              <div className="w-[1px] h-6 bg-slate-200"></div>

              {/* User Profile */}
              <div className="flex items-center gap-3 select-none">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900 leading-tight">Auditor Admin</p>
                  <p className="text-[10px] text-slate-400 leading-none">Operations Level 3</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-600 flex items-center justify-center font-bold text-white shadow-sm shadow-teal-500/10 text-sm">
                  AA
                </div>
              </div>
            </div>
          </header>

          {/* Main scrollable viewport */}
          <main className="flex-1 overflow-y-auto bg-slate-50 p-8">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>

      </body>

    </html>

  );
}
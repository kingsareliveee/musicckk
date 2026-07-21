import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { BottomPlayer } from "../components/BottomPlayer";
import { BottomNavBar } from "../components/BottomNavBar";
import { MobileProfile } from "../components/MobileProfile";

export const MainLayout: React.FC = () => {
  const location = useLocation();
  const isSongDetailPage = location.pathname.startsWith("/song/");

  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ background: "#000000" }}
    >
      {/* Desktop Sidebar — 280px as per spec */}
      <aside
        className="w-[280px] flex-shrink-0 hidden md:flex flex-col h-full glass-sidebar relative z-40"
      >
        <Sidebar />
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile sticky header */}
        <div
          className="md:hidden sticky top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-4"
          style={{
            background: "rgba(0,0,0,0.92)",
            backdropFilter: "blur(24px)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {/* MUSICK Logo (mobile) */}
          <div className="flex items-center gap-2.5">
            <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="rgba(255,255,255,0.20)" strokeWidth="1.5"/>
              <circle cx="24" cy="24" r="14" stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>
              <circle cx="24" cy="24" r="4" fill="var(--accent)"/>
              <line x1="24" y1="2" x2="24" y2="10" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="24" y1="38" x2="24" y2="46" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="2" y1="24" x2="10" y2="24" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="38" y1="24" x2="46" y2="24" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span
              className="font-bold tracking-[0.15em] text-white uppercase"
              style={{ fontSize: 15, fontFamily: "'Outfit', sans-serif" }}
            >
              MUSICK
            </span>
          </div>
          <MobileProfile />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar pb-40 md:pb-32">
          <div className="px-5 md:px-8 py-6 md:py-8 max-w-7xl mx-auto min-h-full">
            <Outlet />
          </div>
        </div>

        {/* Floating Bottom Player */}
        {!isSongDetailPage && (
          <div className="fixed bottom-[72px] md:bottom-5 left-3 right-3 md:left-[296px] md:right-5 z-[60] pointer-events-none">
            <div className="pointer-events-auto">
              <BottomPlayer />
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNavBar />
    </div>
  );
};

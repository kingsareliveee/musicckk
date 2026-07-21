import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AnimatePresence } from "framer-motion";
import { MainLayout } from "./layouts/MainLayout";
import { Home } from "./pages/Home";
import { Search } from "./pages/Search";
import { Library } from "./pages/Library";
import { SongDetail } from "./pages/SongDetail";
import { LikedSongs } from "./pages/LikedSongs";
import { PlaylistDetail } from "./pages/PlaylistDetail";
import { Login, GUEST_MODE_KEY } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { ForgotPassword } from "./pages/ForgotPassword";
import { useAuth } from "./hooks/useAuth";
import { AudioProvider } from "./components/AudioProvider";
import { SplashScreen } from "./components/SplashScreen";
import { ThemeProvider } from "./contexts/ThemeContext";
import { OnboardingTastePicker } from "./pages/OnboardingTastePicker";
import { supabase } from "./lib/supabase";

const SPLASH_KEY = "musick-splash-shown";

const LoadingVisualizer = React.memo(() => (
  <div className="flex items-end gap-[3px]" style={{ height: 32 }}>
    {Array.from({ length: 16 }).map((_, i) => (
      <div
        key={i}
        className="waveform-bar"
        style={{
          width: 3,
          height: `${40 + Math.abs(Math.sin(i * 0.5)) * 50}%`,
          animationDelay: `${i * 0.07}s`,
        }}
      />
    ))}
  </div>
));
LoadingVisualizer.displayName = "LoadingVisualizer";

function AppInner() {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    try {
      return !sessionStorage.getItem(SPLASH_KEY);
    } catch {
      return true;
    }
  });
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    try { return !!sessionStorage.getItem(GUEST_MODE_KEY); } catch { return false; }
  });

  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  const handleSplashComplete = () => {
    try { sessionStorage.setItem(SPLASH_KEY, "1"); } catch {}
    setShowSplash(false);
  };

  // Sync guest state whenever sessionStorage changes (e.g. after navigating back)
  useEffect(() => {
    const syncGuest = () => {
      setIsGuest(!!sessionStorage.getItem(GUEST_MODE_KEY));
    };
    window.addEventListener('storage', syncGuest);
    return () => window.removeEventListener('storage', syncGuest);
  }, []);

  // When user logs in, clear guest mode
  useEffect(() => {
    if (user) {
      sessionStorage.removeItem(GUEST_MODE_KEY);
      setIsGuest(false);
    }
  }, [user]);

  // Check if logged in user has preferences
  useEffect(() => {
    if (loading) return;
    if (!user) {
      setNeedsOnboarding(false);
      setCheckingOnboarding(false);
      return;
    }

    const checkPreferences = async () => {
      setCheckingOnboarding(true);
      try {
        const { data, error } = await supabase
          .from("artist_preferences")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (!error && (!data || data.length === 0)) {
          setNeedsOnboarding(true);
        } else {
          setNeedsOnboarding(false);
        }
      } catch (err) {
        console.error("Failed to check onboarding state:", err);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkPreferences();
  }, [user, loading]);

  const canAccess = !!user || isGuest;
  const showLoading = !showSplash && (loading || (user && checkingOnboarding));

  return (
    <>
      {/* Toaster */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#141414",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
            fontSize: "14px",
            fontFamily: "'Inter', sans-serif",
          },
          duration: 3000,
        }}
      />

      {/* Splash screen (once per session) */}
      <AnimatePresence mode="wait">
        {showSplash && (
          <SplashScreen key="splash" onComplete={handleSplashComplete} />
        )}
      </AnimatePresence>

      {/* Loading state */}
      {showLoading && (
        <div className="h-screen w-screen flex items-center justify-center" style={{ background: "#000000" }}>
          <LoadingVisualizer />
        </div>
      )}

      {/* Onboarding Taste Picker overlay — only for logged-in users, not guests */}
      {!showSplash && !loading && !checkingOnboarding && needsOnboarding && user && (
        <OnboardingTastePicker onComplete={() => setNeedsOnboarding(false)} />
      )}

      {/* Router */}
      {!showSplash && !loading && (
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Main app — accessible by authed users OR guests */}
          {canAccess ? (
            <>
              {/* Logged-in user who needs onboarding */}
              {user && needsOnboarding && !checkingOnboarding && (
                <Route path="*" element={<Navigate to="/" replace />} />
              )}

              {/* Main app routes */}
              {(!user || (!checkingOnboarding && !needsOnboarding)) && (
                <Route path="/" element={<AudioProvider><MainLayout /></AudioProvider>}>
                  <Route index element={<Home />} />
                  <Route path="search" element={<Search />} />
                  <Route path="library" element={<Library />} />
                  <Route path="library/liked" element={<LikedSongs />} />
                  <Route path="playlist/:id" element={<PlaylistDetail />} />
                  <Route path="song/:videoId" element={<SongDetail />} />
                  <Route path="home" element={<Navigate to="/" replace />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              )}
            </>
          ) : (
            <Route path="*" element={<Navigate to="/login" replace />} />
          )}
        </Routes>
      )}
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

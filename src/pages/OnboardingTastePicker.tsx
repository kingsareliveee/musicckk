import React, { useState, useEffect } from "react";
import {
  Search,
  LogOut,
  Loader2,
  ArrowRight,
  ArrowLeft,
  User,
  Music,
  Languages,
  Volume2,
  Heart,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";
import { searchArtists } from "../lib/jiosaavn";

interface Artist {
  name: string;
  genre: string;
  language: string;
  image: string;
}

const ARTIST_SEEDS: Artist[] = [
  {
    name: "Arijit Singh",
    genre: "Bollywood",
    language: "Hindi",
    image: "https://yt3.googleusercontent.com/DcEzZrPCQRSSs47rMbdJ3UJkQUCN3X8SKf8aCnvOgd2BmPihAz-0jBGJgEVh9_P8EiSBVNyixDs=s88-c-k-c0x00ffffff-no-rj-mo",
  },
  {
    name: "Karan Aujla",
    genre: "Punjabi",
    language: "Punjabi",
    image: "https://yt3.googleusercontent.com/Da4zbrS4XLxzb3xVNT14aKr22aBg1blJCuCBppbYglO_uDmElYopgoDk7XV6UWNxthI96XOYrw=s88-c-k-c0x00ffffff-no-rj-mo",
  },
  {
    name: "AP Dhillon",
    genre: "Punjabi",
    language: "Punjabi",
    image: "https://yt3.googleusercontent.com/Xu6Ve0v8QGPKbg5M0r6OplEBIYsrJFP26yhs-fYxlYgrrQMG9SYAPeMVqnBs_6ZBzaKGLJZh0A=s88-c-k-c0x00ffffff-no-rj-mo",
  },
  {
    name: "Shubh",
    genre: "Punjabi",
    language: "Punjabi",
    image: "https://yt3.googleusercontent.com/97CgNnarowX8Nr0wpZCNg4x--k63vT2NZSNLpjTtBvNlYgFJJIAbiLUrABnok6sM8zk2bUIJ=s88-c-k-c0x00ffffff-no-rj-mo",
  },
  {
    name: "Sidhu Moosewala",
    genre: "Punjabi",
    language: "Punjabi",
    image: "https://yt3.ggpht.com/ytc/AIdro_kiQJ0Hhp0O-tdaY1dy81-gSNujjccUlWstnpFr686ZlMk=s88-c-k-c0x00ffffff-no-rj-mo",
  },
  {
    name: "Diljit Dosanjh",
    genre: "Punjabi",
    language: "Punjabi",
    image: "https://yt3.googleusercontent.com/7EYXXMXY594V8y4sZT2aawmdKgDAGTu5jNm9C-HpR3jY9cZJ0NMxS__nZKBdWZ1PUpJPjc2BAA=s88-c-k-c0x00ffffff-no-rj-mo",
  },
  {
    name: "Atif Aslam",
    genre: "Bollywood",
    language: "Hindi",
    image: "https://yt3.ggpht.com/ytc/AIdro_kiQJ0Hhp0O-tdaY1dy81-gSNujjccUlWstnpFr686ZlMk=s88-c-k-c0x00ffffff-no-rj-mo",
  },
  {
    name: "The Weeknd",
    genre: "Pop",
    language: "English",
    image: "https://yt3.googleusercontent.com/WHvw1ak1FcJaHeEiTmG2iN0dqEjjPxAtT_tA8ruJ3MlNr9I-RHsAur1iAenYeQN_d6LNPH2Z8Ic=s88-c-k-c0x00ffffff-no-rj-mo",
  },
  {
    name: "Drake",
    genre: "Hip-Hop",
    language: "English",
    image: "https://yt3.ggpht.com/ytc/AIdro_lCPp6jFXJWIVHM0fIK5HofL3nyLOsmhu1Ek2OwyppYlOM=s88-c-k-c0x00ffffff-no-rj-mo",
  },
  {
    name: "A.R. Rahman",
    genre: "Composer",
    language: "Tamil",
    image: "https://yt3.ggpht.com/ytc/AIdro_lfa_HP-vAmKA1j5Q2CBioDqVyClEr6sXREMMM-E7zYFU8=s88-c-k-c0x00ffffff-no-rj-mo",
  },
  {
    name: "Anirudh Ravichander",
    genre: "Composer",
    language: "Tamil",
    image: "https://yt3.googleusercontent.com/WHvw1ak1FcJaHeEiTmG2iN0dqEjjPxAtT_tA8ruJ3MlNr9I-RHsAur1iAenYeQN_d6LNPH2Z8Ic=s88-c-k-c0x00ffffff-no-rj-mo",
  }
];

const LANGUAGES = [
  "Hindi",
  "English",
  "Punjabi",
  "Tamil",
  "Telugu",
  "Marathi",
  "Gujarati",
  "Malayalam",
  "Bengali",
];

export const OnboardingTastePicker: React.FC<{ onComplete: () => void }> = ({
  onComplete,
}) => {
  const { user, logout } = useAuth();
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [selectedArtists, setSelectedArtists] = useState<Artist[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  
  // Playback Preferences
  const [autoplay, setAutoplay] = useState(true);
  const [highQuality, setHighQuality] = useState(true);
  const [explicitContent, setExplicitContent] = useState(true);

  // Artist search states
  const [visibleArtists] = useState<Artist[]>(ARTIST_SEEDS);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Artist[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setDisplayName(user.user_metadata.full_name);
    }
  }, [user]);

  const handleArtistSearch = async (val: string) => {
    setQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    const localMatches = ARTIST_SEEDS.filter((a) =>
      a.name.toLowerCase().includes(val.toLowerCase())
    );
    if (val.trim().length > 2) {
      setSearching(true);
      try {
        const apiArtists = await searchArtists(val, 8);
        const online: Artist[] = apiArtists.map((a) => ({
          name: a.name,
          genre: "Pop",
          language: "English",
          image: a.thumbnail || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop",
        }));
        const combined = [...localMatches];
        online.forEach((o) => {
          if (!combined.some((c) => c.name.toLowerCase() === o.name.toLowerCase())) {
            combined.push(o);
          }
        });
        setSearchResults(combined);
      } catch (err) {
        console.error("Onboarding artist search failed:", err);
        setSearchResults(localMatches);
      } finally {
        setSearching(false);
      }
    } else {
      setSearchResults(localMatches);
    }
  };

  const toggleSelectArtist = (artist: Artist) => {
    const isSelected = selectedArtists.some((a) => a.name === artist.name);
    if (isSelected) {
      setSelectedArtists(selectedArtists.filter((a) => a.name !== artist.name));
    } else {
      setSelectedArtists([...selectedArtists, artist]);
    }
  };

  const nextStep = () => {
    if (step === 1 && !displayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }
    if (step === 2 && selectedArtists.length < 3) {
      toast.error("Please select at least 3 artists");
      return;
    }
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      // 1. Update Display Name and onboarding_completed flag in Supabase Auth Metadata
      const { error: profileError } = await supabase.auth.updateUser({
        data: {
          full_name: displayName,
          onboarding_completed: true,
        }
      });

      if (profileError) {
        console.error("Auth metadata update error:", profileError);
      }

      // 2. Upsert profile with onboarding_completed flag
      try {
        await supabase.from("profiles").upsert({
          id: user.id,
          onboarding_completed: true,
        }, { onConflict: 'id' });
      } catch (pErr) {
        console.error("Profile onboarding flag upsert error:", pErr);
      }

      // 3. Save Artist Preferences
      const artistPayload = selectedArtists.map((a) => ({
        user_id: user.id,
        artist_name: a.name,
        score: 1,
      }));
      const { error: artistError } = await supabase
        .from("artist_preferences")
        .upsert(artistPayload, { onConflict: 'user_id,artist_name' });

      if (artistError) {
        console.error("Artist preferences save error:", artistError);
      }

      // 4. Save User Settings
      const { error: settingsError } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          language: selectedLanguage,
          autoplay: autoplay,
        });

      if (settingsError) {
        console.error("Settings update error:", settingsError);
      }

      // Store preferences and permanent completion flag in localStorage
      try {
        localStorage.setItem(`musick-onboarding-completed-${user.id}`, 'true');
        localStorage.setItem('musick-explicit-content', String(explicitContent));
        localStorage.setItem('musick-hq-audio', String(highQuality));
        localStorage.setItem('musick-pref-artists', selectedArtists.map(a => a.name).join(','));
      } catch {}

      toast.success("Welcome to Musick!");
      onComplete();
    } catch (err: any) {
      console.error("Onboarding failed:", err);
      toast.error("An error occurred. Please try again.");
      onComplete();
    } finally {
      setSubmitting(false);
    }
  };

  const displayArtists = query ? searchResults : visibleArtists;

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col h-screen w-screen bg-[#000000] text-white overflow-hidden font-sans">
      {/* Glow Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#7CFF5B]/5 filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#B084FF]/5 filter blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-center justify-between w-full max-w-6xl mx-auto px-6 py-6 z-10">
        <div className="flex items-center gap-3">
          <span className="font-extrabold tracking-[0.2em] text-white uppercase text-base font-display">
            MUSICK
          </span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs font-bold text-white/55 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-full border border-white/5"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>

      {/* Progress Line */}
      <div className="w-full max-w-xl mx-auto px-6 mb-8 z-10">
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#7CFF5B]"
            initial={{ width: "20%" }}
            animate={{ width: `${(step / 5) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] uppercase tracking-wider text-white/40 font-bold">
          <span>Profile</span>
          <span>Taste</span>
          <span>Language</span>
          <span>Playback</span>
          <span>Ready</span>
        </div>
      </div>

      {/* Step Contents */}
      <div className="flex-1 w-full max-w-2xl mx-auto px-6 overflow-y-auto z-10 pb-28">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 text-center"
            >
              <div className="inline-flex p-4 rounded-full bg-white/5 border border-white/10 text-[#7CFF5B]">
                <User className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-extrabold font-display">What should we call you?</h2>
              <p className="text-white/60 text-sm max-w-md mx-auto">
                Choose a display name for your profile. You can change this at any time in settings.
              </p>
              <div className="max-w-md mx-auto pt-4">
                <input
                  type="text"
                  placeholder="Your display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-center text-lg focus:outline-none focus:border-[#7CFF5B] transition-colors"
                />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 text-center"
            >
              <div className="inline-flex p-4 rounded-full bg-white/5 border border-white/10 text-[#7CFF5B]">
                <Music className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-extrabold font-display">Your favorite artists</h2>
              <p className="text-white/60 text-sm max-w-md mx-auto">
                Select at least <span className="text-[#7CFF5B] font-bold">3 artists</span> to personalize your home feed.
              </p>

              {/* Search Bar */}
              <div className="max-w-md mx-auto relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search artists..."
                  value={query}
                  onChange={(e) => handleArtistSearch(e.target.value)}
                  className="w-full pl-11 pr-10 py-3.5 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-[#7CFF5B] transition-colors text-sm"
                />
                {searching && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7CFF5B] animate-spin" />
                )}
              </div>

              {/* Grid */}
              <div className="grid grid-cols-3 gap-4 pt-4 max-h-[320px] overflow-y-auto pr-2">
                {displayArtists.map((artist) => {
                  const isSelected = selectedArtists.some((a) => a.name === artist.name);
                  return (
                    <div
                      key={artist.name}
                      onClick={() => toggleSelectArtist(artist)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-white/10 border-[#7CFF5B]"
                          : "bg-white/5 border-white/5 hover:bg-white/8"
                      }`}
                    >
                      <img
                        src={artist.image}
                        alt={artist.name}
                        className="w-16 h-16 rounded-full object-cover border border-white/10"
                      />
                      <span className="text-xs font-semibold text-center line-clamp-1">
                        {artist.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 text-center"
            >
              <div className="inline-flex p-4 rounded-full bg-white/5 border border-white/10 text-[#7CFF5B]">
                <Languages className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-extrabold font-display">Preferred language</h2>
              <p className="text-white/60 text-sm max-w-md mx-auto">
                Choose your primary language for music recommendations.
              </p>
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-4">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    className={`py-3.5 rounded-xl border text-sm font-semibold transition-all ${
                      selectedLanguage === lang
                        ? "bg-[#7CFF5B] text-black border-[#7CFF5B] font-bold"
                        : "bg-white/5 border-white/5 text-white/80 hover:bg-white/10"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 text-center"
            >
              <div className="inline-flex p-4 rounded-full bg-white/5 border border-white/10 text-[#7CFF5B]">
                <Volume2 className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-extrabold font-display">Playback preferences</h2>
              <p className="text-white/60 text-sm max-w-md mx-auto">
                Configure your music playback behavior. You can always change this later in settings.
              </p>
              <div className="max-w-md mx-auto space-y-4 pt-4 text-left">
                {/* Autoplay */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div>
                    <h4 className="font-semibold text-sm">Autoplay</h4>
                    <p className="text-xs text-white/50">Keep playing similar songs when music ends</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoplay}
                    onChange={(e) => setAutoplay(e.target.checked)}
                    className="w-5 h-5 accent-[#7CFF5B]"
                  />
                </div>
                {/* High Quality */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div>
                    <h4 className="font-semibold text-sm">High Quality Audio</h4>
                    <p className="text-xs text-white/50">Stream music at 320kbps resolution</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={highQuality}
                    onChange={(e) => setHighQuality(e.target.checked)}
                    className="w-5 h-5 accent-[#7CFF5B]"
                  />
                </div>
                {/* Explicit Content */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div>
                    <h4 className="font-semibold text-sm">Allow Explicit Content</h4>
                    <p className="text-xs text-white/50">Show and play songs with explicit lyrics</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={explicitContent}
                    onChange={(e) => setExplicitContent(e.target.checked)}
                    className="w-5 h-5 accent-[#7CFF5B]"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 text-center py-8"
            >
              <div className="inline-flex p-5 rounded-full bg-white/5 border border-white/10 text-[#7CFF5B] animate-bounce">
                <Heart className="w-10 h-10" />
              </div>
              <h2 className="text-4xl font-extrabold font-display">You're all set!</h2>
              <p className="text-white/60 text-base max-w-md mx-auto">
                We've customized your experience. Get ready to stream your favorite tunes.
              </p>
              <div className="pt-6 max-w-xs mx-auto">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-4 rounded-full bg-[#7CFF5B] text-black font-extrabold text-lg flex items-center justify-center gap-3 shadow-lg shadow-[#7CFF5B]/20 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  {submitting ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      Enter App
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Bottom Nav Controls */}
      {step < 5 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0d0d0d]/90 backdrop-blur-md px-6 py-4 rounded-full border border-white/10 shadow-2xl flex items-center gap-6 min-w-[320px] justify-between max-w-[90vw]">
          <button
            onClick={prevStep}
            disabled={step === 1}
            className="flex items-center gap-2 text-xs font-bold text-white/50 disabled:opacity-20 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          
          <span className="text-xs font-bold text-white/40">
            Step {step} of 5
          </span>

          <button
            onClick={nextStep}
            className="flex items-center gap-2 px-6 py-3 rounded-full text-xs font-extrabold text-black bg-[#7CFF5B] shadow-lg shadow-[#7CFF5B]/10 hover:scale-[1.02] transition-transform font-inter"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

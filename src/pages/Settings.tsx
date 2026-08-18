import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Trash2,
  Play,
  Music,
  Zap,
  Volume2,
  Timer,
  Sparkles,
  Compass,
  History,
  Layers,
  RotateCcw,
  FileText,
  Languages,
  AlignLeft,
  Type,
  Download,
  Wifi,
  HardDrive,
  Trash,
  Eye,
  Clock,
  Search,
  Upload,
  Palette,
  MonitorSmartphone,
  Info,
  Shield,
  BookOpen,
  Bug,
  Check,
  Edit3,
  Repeat,
  Gauge,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useTheme, THEMES, type ThemeKey } from "../contexts/ThemeContext";
import { SettingsSection } from "../components/settings/SettingsSection";
import { SettingsToggle } from "../components/settings/SettingsToggle";
import { SettingsSelect } from "../components/settings/SettingsSelect";
import { SettingsSlider } from "../components/settings/SettingsSlider";
import { SettingsNavigationRow } from "../components/settings/SettingsNavigationRow";
import { SettingsDangerRow } from "../components/settings/SettingsDangerRow";
import { SettingsBottomSheet } from "../components/settings/SettingsBottomSheet";
import { SettingsRow } from "../components/settings/SettingsRow";
import toast from "react-hot-toast";

// ─── Types ───────────────────────────────────────────────────
type SheetType = "sleepTimer" | "audioQuality" | "lyricsMode" | "downloadQuality" | null;

type SleepTimerOption = "Off" | "5 min" | "10 min" | "15 min" | "30 min" | "60 min" | "End of current song";
type AudioQualityOption = "Data Saver" | "Normal" | "High";
type LyricsModeOption = "Original" | "English" | "Both";
type DownloadQualityOption = "Normal" | "High" | "Very High";

// ─── Settings Page ───────────────────────────────────────────
export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  // ── Active bottom sheet
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);

  // ── Section 2: Playback
  const [autoplay, setAutoplay] = useState(true);
  const [audioQuality, setAudioQuality] = useState<AudioQualityOption>("High");
  const [crossfade, setCrossfade] = useState(3);
  const [volumeNorm, setVolumeNorm] = useState(true);
  const [gapless, setGapless] = useState(false);
  const [sleepTimer, setSleepTimer] = useState<SleepTimerOption>("Off");

  // ── Section 3: Recommendations
  const [personalised, setPersonalised] = useState(true);
  const [discoverMode, setDiscoverMode] = useState(false);
  const [useHistory, setUseHistory] = useState(true);
  const [preferSimilar, setPreferSimilar] = useState(true);
  const [avoidRecent, setAvoidRecent] = useState(false);

  // ── Section 4: Lyrics
  const [autoLyrics, setAutoLyrics] = useState(true);
  const [engTranslation, setEngTranslation] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [lyricsMode, setLyricsMode] = useState<LyricsModeOption>("Original");

  // ── Section 5: Downloads & Storage
  const [offlineMusic, setOfflineMusic] = useState(false);
  const [downloadQuality, setDownloadQuality] = useState<DownloadQualityOption>("High");
  const [wifiOnly, setWifiOnly] = useState(true);
  const [wifiOnlyHighQuality, setWifiOnlyHighQuality] = useState(true);

  // ── Section 6: Privacy
  const [listeningHistory, setListeningHistory] = useState(true);
  const [recentlyPlayed, setRecentlyPlayed] = useState(true);
  const [searchHistory, setSearchHistory] = useState(true);

  // ── Section 7: Appearance
  const [animations, setAnimations] = useState(true);
  const [compactPlayer, setCompactPlayer] = useState(false);

  const fullName = user?.user_metadata?.full_name || "User";
  const email = user?.email || "guest@musick.app";
  const avatarUrl = user?.user_metadata?.avatar_url;

  const handlePlaceholder = (label: string) => {
    toast(`${label} — coming soon`, {
      icon: "✦",
      style: {
        background: "#141414",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "12px",
      },
    });
  };

  return (
    <>
      {/* ─── Page ─── */}
      <div className="min-h-full pb-4">
        {/* Sticky Header */}
        <div
          className="sticky top-0 z-40 flex items-center gap-3 px-0 py-4 mb-2"
          style={{
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(24px)",
            marginLeft: "-20px",
            marginRight: "-20px",
            paddingLeft: "20px",
            paddingRight: "20px",
          }}
        >
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <ArrowLeft className="w-4 h-4 text-white/70" />
          </motion.button>
          <h1
            className="text-lg font-bold text-white"
            style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: "0.01em" }}
          >
            Settings
          </h1>
        </div>

        <div className="flex flex-col gap-6">
          {/* ══════════════════════════════════════════════════════
              1 · ACCOUNT
          ══════════════════════════════════════════════════════ */}
          <SettingsSection title="Account" index={0}>
            {/* Profile card */}
            <div
              className="flex items-center gap-4 px-4 py-4 border-b"
              style={{ borderColor: "rgba(255,255,255,0.05)" }}
            >
              {/* Avatar */}
              <div
                className="w-14 h-14 rounded-2xl flex-shrink-0 overflow-hidden"
                style={{ border: "2px solid var(--accent)", boxShadow: "0 0 16px var(--accent-glow)" }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-black text-xl font-bold"
                    style={{ background: "var(--accent)" }}
                  >
                    {fullName[0]?.toUpperCase() ?? "U"}
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-white truncate">{fullName}</p>
                <p className="text-xs truncate mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>
                  {email}
                </p>
                {!user && (
                  <span
                    className="inline-block mt-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}
                  >
                    Guest
                  </span>
                )}
              </div>
              {/* Edit icon */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handlePlaceholder("Edit Profile")}
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <Edit3 className="w-3.5 h-3.5 text-white/50" />
              </motion.button>
            </div>

            <SettingsNavigationRow
              icon={<User />}
              title="Edit Display Name"
              description="Change how your name appears"
              onClick={() => handlePlaceholder("Edit Display Name")}
            />
            <SettingsRow
              icon={<Mail />}
              title="Email Address"
              description={email}
              trailing={
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.30)" }}>
                  Verified
                </span>
              }
            />
            <SettingsNavigationRow
              icon={<Lock />}
              title="Change Password"
              description="Update your account password"
              onClick={() => handlePlaceholder("Change Password")}
            />
            <SettingsDangerRow
              icon={<Trash2 />}
              title="Delete Account"
              description="Permanently delete your account and data"
              onClick={() => handlePlaceholder("Delete Account")}
              isLast
            />
          </SettingsSection>

          {/* ══════════════════════════════════════════════════════
              2 · PLAYBACK
          ══════════════════════════════════════════════════════ */}
          <SettingsSection title="Playback" index={1}>
            <SettingsToggle
              icon={<Play />}
              title="Autoplay"
              description="Continue playing similar music automatically"
              value={autoplay}
              onChange={setAutoplay}
            />
            <SettingsSelect
              icon={<Gauge />}
              title="Audio Quality"
              description="Set streaming quality"
              value={audioQuality}
              onClick={() => setActiveSheet("audioQuality")}
            />
            <SettingsSlider
              icon={<Zap />}
              title="Crossfade"
              description="Smooth transition between songs"
              value={crossfade}
              min={0}
              max={12}
              step={1}
              unit="s"
              onChange={setCrossfade}
            />
            <SettingsToggle
              icon={<Volume2 />}
              title="Volume Normalisation"
              description="Keep consistent loudness across tracks"
              value={volumeNorm}
              onChange={setVolumeNorm}
            />
            <SettingsToggle
              icon={<Repeat />}
              title="Gapless Playback"
              description="Remove silence between tracks"
              value={gapless}
              onChange={setGapless}
            />
            <SettingsSelect
              icon={<Timer />}
              title="Sleep Timer"
              description="Automatically pause music after a set time"
              value={sleepTimer}
              onClick={() => setActiveSheet("sleepTimer")}
              isLast
            />
          </SettingsSection>

          {/* ══════════════════════════════════════════════════════
              3 · RECOMMENDATIONS
          ══════════════════════════════════════════════════════ */}
          <SettingsSection title="Recommendations" index={2}>
            <SettingsToggle
              icon={<Sparkles />}
              title="Personalised Recommendations"
              description="Tailor music suggestions to your taste"
              value={personalised}
              onChange={setPersonalised}
            />
            <SettingsToggle
              icon={<Compass />}
              title="Discover Mode"
              description="Surface new artists and genres"
              value={discoverMode}
              onChange={setDiscoverMode}
            />
            <SettingsToggle
              icon={<History />}
              title="Use Listening History"
              description="Improve suggestions based on what you play"
              value={useHistory}
              onChange={setUseHistory}
            />
            <SettingsToggle
              icon={<Layers />}
              title="Prefer Similar Genres"
              description="Stay close to your favourite genres"
              value={preferSimilar}
              onChange={setPreferSimilar}
            />
            <SettingsToggle
              icon={<RotateCcw />}
              title="Avoid Recently Played"
              description="Reduce repeating songs you've heard lately"
              value={avoidRecent}
              onChange={setAvoidRecent}
            />
            <SettingsDangerRow
              icon={<RotateCcw />}
              title="Reset Music Taste"
              description="Start fresh with your recommendations"
              onClick={() => handlePlaceholder("Reset Music Taste")}
              isLast
            />
          </SettingsSection>

          {/* ══════════════════════════════════════════════════════
              4 · LYRICS
          ══════════════════════════════════════════════════════ */}
          <SettingsSection title="Lyrics" index={3}>
            <SettingsToggle
              icon={<FileText />}
              title="Show Lyrics Automatically"
              description="Display lyrics when a song starts"
              value={autoLyrics}
              onChange={setAutoLyrics}
            />
            <SettingsToggle
              icon={<Languages />}
              title="English Translation"
              description="Show translated lyrics when available"
              value={engTranslation}
              onChange={setEngTranslation}
            />
            <SettingsToggle
              icon={<AlignLeft />}
              title="Auto Scroll"
              description="Lyrics scroll with the song automatically"
              value={autoScroll}
              onChange={setAutoScroll}
            />
            <SettingsSelect
              icon={<Type />}
              title="Lyrics Display Mode"
              description="Choose which lyrics version to show"
              value={lyricsMode}
              onClick={() => setActiveSheet("lyricsMode")}
              isLast
            />
          </SettingsSection>

          {/* ══════════════════════════════════════════════════════
              5 · DOWNLOADS & STORAGE
          ══════════════════════════════════════════════════════ */}
          <SettingsSection title="Downloads & Storage" index={4}>
            <SettingsToggle
              icon={<Download />}
              title="Offline Music"
              description="Save music for offline playback"
              value={offlineMusic}
              onChange={setOfflineMusic}
            />
            <SettingsSelect
              icon={<Music />}
              title="Download Quality"
              description="Quality of downloaded tracks"
              value={downloadQuality}
              onClick={() => setActiveSheet("downloadQuality")}
            />
            <SettingsToggle
              icon={<Wifi />}
              title="Wi-Fi Only Downloads"
              description="Only download over Wi-Fi"
              value={wifiOnly}
              onChange={setWifiOnly}
            />
            <SettingsRow
              icon={<HardDrive />}
              title="Storage Used"
              description="Cached audio and artwork"
              trailing={
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                  142 MB
                </span>
              }
            />
            <SettingsNavigationRow
              icon={<Trash />}
              title="Clear Cache"
              description="Free up space from temporary files"
              onClick={() => handlePlaceholder("Clear Cache")}
              isLast
            />
          </SettingsSection>

          {/* ══════════════════════════════════════════════════════
              6 · PRIVACY & DATA
          ══════════════════════════════════════════════════════ */}
          <SettingsSection title="Privacy & Data" index={5}>
            <SettingsToggle
              icon={<Eye />}
              title="Listening History"
              description="Track what you've listened to"
              value={listeningHistory}
              onChange={setListeningHistory}
            />
            <SettingsToggle
              icon={<Clock />}
              title="Recently Played"
              description="Show your recent listening activity"
              value={recentlyPlayed}
              onChange={setRecentlyPlayed}
            />
            <SettingsToggle
              icon={<Search />}
              title="Search History"
              description="Save your past searches"
              value={searchHistory}
              onChange={setSearchHistory}
            />
            <SettingsNavigationRow
              icon={<Upload />}
              title="Export My Data"
              description="Download a copy of your Musick data"
              onClick={() => handlePlaceholder("Export My Data")}
            />
            <SettingsDangerRow
              icon={<Trash2 />}
              title="Clear Personalisation Data"
              description="Reset your taste profile and history"
              onClick={() => handlePlaceholder("Clear Personalisation Data")}
              isLast
            />
          </SettingsSection>

          {/* ══════════════════════════════════════════════════════
              7 · APPEARANCE
          ══════════════════════════════════════════════════════ */}
          <SettingsSection title="Appearance" index={6}>
            {/* Theme / Accent Colour */}
            <div
              className="px-4 py-3.5 border-b"
              style={{ borderColor: "rgba(255,255,255,0.05)" }}
            >
              <div className="flex items-center gap-3.5 mb-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <Palette className="w-4 h-4 text-white/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white leading-snug">Accent Colour</p>
                  <p className="text-xs mt-0.5 leading-snug" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Choose your theme colour
                  </p>
                </div>
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--accent)" }}
                >
                  {theme.label}
                </span>
              </div>
              <div className="pl-[44px] flex items-center gap-3">
                {THEMES.map((t) => (
                  <motion.button
                    key={t.key}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.90 }}
                    onClick={() => setTheme(t.key as ThemeKey)}
                    title={t.label}
                    className="relative w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{
                      background: t.color,
                      boxShadow: theme.key === t.key ? `0 0 0 3px rgba(255,255,255,0.15), 0 0 12px ${t.glow}` : "none",
                    }}
                  >
                    {theme.key === t.key && (
                      <motion.div
                        layoutId="settings-theme-ring"
                        className="absolute inset-0 rounded-full border-2 border-white/50"
                      />
                    )}
                    {theme.key === t.key && (
                      <Check className="w-4 h-4 text-black relative z-10" strokeWidth={3} />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            <SettingsToggle
              icon={<Zap />}
              title="Animations"
              description="Enable motion effects and transitions"
              value={animations}
              onChange={setAnimations}
            />
            <SettingsToggle
              icon={<MonitorSmartphone />}
              title="Compact Player"
              description="Reduce the size of the mini player bar"
              value={compactPlayer}
              onChange={setCompactPlayer}
              isLast
            />
          </SettingsSection>

          {/* ══════════════════════════════════════════════════════
              8 · ABOUT
          ══════════════════════════════════════════════════════ */}
          <SettingsSection title="About" index={7}>
            <SettingsRow
              icon={<Info />}
              title="App Version"
              description="Musick for Web"
              isLast={false}
              trailing={
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.40)",
                  }}
                >
                  v1.0.0
                </span>
              }
            />
            <SettingsNavigationRow
              icon={<Shield />}
              title="Privacy Policy"
              onClick={() => handlePlaceholder("Privacy Policy")}
            />
            <SettingsNavigationRow
              icon={<FileText />}
              title="Terms of Service"
              onClick={() => handlePlaceholder("Terms of Service")}
            />
            <SettingsNavigationRow
              icon={<Bug />}
              title="Report a Problem"
              description="Help us improve Musick"
              onClick={() => handlePlaceholder("Report a Problem")}
            />
            <SettingsNavigationRow
              icon={<BookOpen />}
              title="Open Source Licences"
              onClick={() => handlePlaceholder("Open Source Licences")}
              isLast
            />
          </SettingsSection>

          {/* Spacer for mini player */}
          <div className="h-4" />
        </div>
      </div>

      {/* ─── Bottom Sheets ─── */}

      {/* Sleep Timer */}
      <SettingsBottomSheet
        isOpen={activeSheet === "sleepTimer"}
        onClose={() => setActiveSheet(null)}
        title="Sleep Timer"
      >
        <SleepTimerSheet
          value={sleepTimer}
          onChange={(v) => { setSleepTimer(v); setActiveSheet(null); }}
        />
      </SettingsBottomSheet>

      {/* Audio Quality */}
      <SettingsBottomSheet
        isOpen={activeSheet === "audioQuality"}
        onClose={() => setActiveSheet(null)}
        title="Streaming Quality"
      >
        <AudioQualitySheet
          value={audioQuality}
          wifiOnly={wifiOnlyHighQuality}
          onWifiOnlyChange={setWifiOnlyHighQuality}
          onChange={(v) => { setAudioQuality(v); setActiveSheet(null); }}
        />
      </SettingsBottomSheet>

      {/* Lyrics Mode */}
      <SettingsBottomSheet
        isOpen={activeSheet === "lyricsMode"}
        onClose={() => setActiveSheet(null)}
        title="Lyrics Display Mode"
      >
        <LyricsModeSheet
          value={lyricsMode}
          onChange={(v) => { setLyricsMode(v); setActiveSheet(null); }}
        />
      </SettingsBottomSheet>

      {/* Download Quality */}
      <SettingsBottomSheet
        isOpen={activeSheet === "downloadQuality"}
        onClose={() => setActiveSheet(null)}
        title="Download Quality"
      >
        <DownloadQualitySheet
          value={downloadQuality}
          onChange={(v) => { setDownloadQuality(v); setActiveSheet(null); }}
        />
      </SettingsBottomSheet>
    </>
  );
};

// ─── Sleep Timer Sheet ────────────────────────────────────────
const SLEEP_OPTIONS: SleepTimerOption[] = [
  "Off", "5 min", "10 min", "15 min", "30 min", "60 min", "End of current song",
];

const SleepTimerSheet: React.FC<{
  value: SleepTimerOption;
  onChange: (v: SleepTimerOption) => void;
}> = ({ value, onChange }) => (
  <div className="flex flex-col gap-1 pb-2">
    {SLEEP_OPTIONS.map((opt) => (
      <SheetOption
        key={opt}
        label={opt}
        selected={value === opt}
        onClick={() => onChange(opt)}
      />
    ))}
  </div>
);

// ─── Audio Quality Sheet ──────────────────────────────────────
const AUDIO_OPTIONS: AudioQualityOption[] = ["Data Saver", "Normal", "High"];
const AUDIO_DESCRIPTIONS: Record<AudioQualityOption, string> = {
  "Data Saver": "Lower bitrate, uses less data",
  "Normal": "Balanced quality and data use",
  "High": "Best quality, uses more data",
};

const AudioQualitySheet: React.FC<{
  value: AudioQualityOption;
  wifiOnly: boolean;
  onWifiOnlyChange: (v: boolean) => void;
  onChange: (v: AudioQualityOption) => void;
}> = ({ value, wifiOnly, onWifiOnlyChange, onChange }) => (
  <div className="flex flex-col gap-1 pb-2">
    {AUDIO_OPTIONS.map((opt) => (
      <SheetOption
        key={opt}
        label={opt}
        description={AUDIO_DESCRIPTIONS[opt]}
        selected={value === opt}
        onClick={() => onChange(opt)}
      />
    ))}

    {/* Wi-Fi toggle inside sheet */}
    <div
      className="flex items-center justify-between mt-3 pt-3"
      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div>
        <p className="text-sm font-medium text-white">Wi-Fi Only High Quality</p>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
          Use High quality only when on Wi-Fi
        </p>
      </div>
      <SheetToggle value={wifiOnly} onChange={onWifiOnlyChange} />
    </div>
  </div>
);

// ─── Lyrics Mode Sheet ────────────────────────────────────────
const LYRICS_OPTIONS: LyricsModeOption[] = ["Original", "English", "Both"];
const LYRICS_DESCRIPTIONS: Record<LyricsModeOption, string> = {
  "Original": "Show lyrics in the original language",
  "English": "Show English translation only",
  "Both": "Show original and translation side by side",
};

const LyricsModeSheet: React.FC<{
  value: LyricsModeOption;
  onChange: (v: LyricsModeOption) => void;
}> = ({ value, onChange }) => (
  <div className="flex flex-col gap-1 pb-2">
    {LYRICS_OPTIONS.map((opt) => (
      <SheetOption
        key={opt}
        label={opt}
        description={LYRICS_DESCRIPTIONS[opt]}
        selected={value === opt}
        onClick={() => onChange(opt)}
      />
    ))}
  </div>
);

// ─── Download Quality Sheet ───────────────────────────────────
const DOWNLOAD_OPTIONS: DownloadQualityOption[] = ["Normal", "High", "Very High"];
const DOWNLOAD_DESCRIPTIONS: Record<DownloadQualityOption, string> = {
  "Normal": "Smaller file sizes, lower quality",
  "High": "Good quality, moderate file sizes",
  "Very High": "Best quality, largest file sizes",
};

const DownloadQualitySheet: React.FC<{
  value: DownloadQualityOption;
  onChange: (v: DownloadQualityOption) => void;
}> = ({ value, onChange }) => (
  <div className="flex flex-col gap-1 pb-2">
    {DOWNLOAD_OPTIONS.map((opt) => (
      <SheetOption
        key={opt}
        label={opt}
        description={DOWNLOAD_DESCRIPTIONS[opt]}
        selected={value === opt}
        onClick={() => onChange(opt)}
      />
    ))}
  </div>
);

// ─── Shared Sheet Option Row ─────────────────────────────────
const SheetOption: React.FC<{
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
}> = ({ label, description, selected, onClick }) => (
  <motion.button
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-left transition-colors"
    style={{
      background: selected ? "rgba(var(--accent-rgb),0.10)" : "rgba(255,255,255,0.03)",
      border: selected ? "1px solid rgba(var(--accent-rgb),0.25)" : "1px solid rgba(255,255,255,0.05)",
    }}
    onMouseEnter={(e) => {
      if (!selected) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
    }}
    onMouseLeave={(e) => {
      if (!selected) e.currentTarget.style.background = "rgba(255,255,255,0.03)";
    }}
  >
    <div>
      <p
        className="text-sm font-medium"
        style={{ color: selected ? "var(--accent)" : "rgba(255,255,255,0.85)" }}
      >
        {label}
      </p>
      {description && (
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
          {description}
        </p>
      )}
    </div>
    <AnimatePresence>
      {selected && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ml-3"
          style={{ background: "var(--accent)" }}
        >
          <Check className="w-3 h-3 text-black" strokeWidth={3} />
        </motion.div>
      )}
      {!selected && (
        <div
          className="w-5 h-5 rounded-full flex-shrink-0 ml-3"
          style={{ border: "1.5px solid rgba(255,255,255,0.15)" }}
        />
      )}
    </AnimatePresence>
  </motion.button>
);

// ─── Inline Sheet Toggle ─────────────────────────────────────
const SheetToggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({
  value,
  onChange,
}) => (
  <button
    onClick={() => onChange(!value)}
    className="relative flex-shrink-0"
    style={{
      width: 44,
      height: 26,
      borderRadius: 13,
      background: value ? "var(--accent)" : "rgba(255,255,255,0.12)",
      transition: "background 0.25s ease",
      boxShadow: value ? "0 0 12px var(--accent-glow)" : "none",
    }}
  >
    <motion.div
      className="absolute top-[3px] left-[3px] w-5 h-5 rounded-full"
      style={{ background: "#ffffff", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }}
      animate={{ x: value ? 18 : 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
    />
  </button>
);

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface SettingsBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const SettingsBottomSheet: React.FC<SettingsBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[90]"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            className="fixed bottom-0 left-0 right-0 z-[95] rounded-t-3xl overflow-hidden"
            style={{
              background: "rgba(10,10,10,0.98)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderBottom: "none",
              boxShadow: "0 -8px 48px rgba(0,0,0,0.7)",
              backdropFilter: "blur(40px)",
              paddingBottom: "env(safe-area-inset-bottom, 16px)",
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div
                className="w-9 h-1 rounded-full"
                style={{ background: "rgba(255,255,255,0.15)" }}
              />
            </div>

            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3 border-b"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              <h2
                className="text-base font-semibold text-white"
                style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: "0.01em" }}
              >
                {title}
              </h2>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.07)" }}
              >
                <X className="w-4 h-4 text-white/60" />
              </motion.button>
            </div>

            {/* Content */}
            <div className="px-5 py-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

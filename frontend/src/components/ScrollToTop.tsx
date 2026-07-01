import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const container = document.querySelector("main") as HTMLElement | null;
    if (!container) return;
    const onScroll = () => setVisible(container.scrollTop > 300);
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    const container = document.querySelector("main") as HTMLElement | null;
    container?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 12 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-[500] h-10 w-10 flex items-center justify-center rounded-2xl glass btn-press"
          style={{
            border: "1px solid var(--border-glow)",
            color: "var(--accent)",
            boxShadow: "0 4px 20px rgba(var(--accent-rgb),0.18)",
          }}
          aria-label="Scroll to top"
        >
          <ArrowUp size={16} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

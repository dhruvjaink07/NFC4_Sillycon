"use client"

import { motion } from "framer-motion"
import { Moon, Sun } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useTheme } from "@/components/providers/theme-provider"

export function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useTheme()

  return (
    <motion.div
      className="fixed top-6 right-6 z-40"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.5 }}
    >
      <motion.div
        className="flex items-center gap-3 p-3 rounded-full shadow-lg backdrop-blur-sm border transition-all duration-300 bg-white/90 border-gray-200 text-gray-700 dark:bg-gray-800/90 dark:border-gray-700 dark:text-white"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div animate={{ rotate: isDarkMode ? 180 : 0 }} transition={{ duration: 0.5, ease: "easeInOut" }}>
          {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </motion.div>
        <Switch checked={isDarkMode} onCheckedChange={toggleTheme} className="data-[state=checked]:bg-blue-600" />
      </motion.div>
    </motion.div>
  )
}

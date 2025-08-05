"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Scan } from "lucide-react"

interface ProcessingOverlayProps {
  isVisible: boolean
}

export function ProcessingOverlay({ isVisible }: ProcessingOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl transition-colors duration-300 bg-white text-gray-900 dark:bg-gray-800 dark:text-white"
          >
            <div className="mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="mx-auto w-16 h-16 border-4 rounded-full mb-4 border-blue-200 border-t-blue-600 dark:border-blue-800 dark:border-t-blue-400"
              />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Processing Document</h3>
            <p className="mb-4 text-gray-600 dark:text-gray-300">Analyzing for PII and sensitive information...</p>
            <div className="flex items-center justify-center gap-2 text-sm text-blue-500">
              <Scan className="w-4 h-4 animate-pulse" />
              <span>AI Agents are working...</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { Loader2 } from "lucide-react"

export function Footer() {
  const footerRef = useRef(null)
  const isFooterInView = useInView(footerRef, { once: true })

  return (
    <motion.footer
      ref={footerRef}
      className="mt-20 pt-12 border-t transition-colors duration-300 border-gray-200 dark:border-gray-700"
      initial={{ opacity: 0, y: 30 }}
      animate={isFooterInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <div className="text-center space-y-6">
        <motion.div
          className="flex items-center justify-center gap-3 mb-4"
          initial={{ y: 20 }}
          animate={isFooterInView ? { y: 0 } : { y: 20 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="p-2 rounded-lg transition-colors duration-300 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900">
            <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-lg font-semibold transition-colors duration-300 text-gray-700 dark:text-gray-300">
            Powered by AI Agents
          </span>
        </motion.div>

        <motion.p
          className="text-sm max-w-4xl mx-auto leading-relaxed transition-colors duration-300 text-gray-600 dark:text-gray-400"
          initial={{ y: 20 }}
          animate={isFooterInView ? { y: 0 } : { y: 20 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <strong>Legal Disclaimer:</strong> This tool is designed to assist with data privacy compliance but does not
          guarantee complete removal of all sensitive information. Users are responsible for reviewing redacted
          documents and ensuring compliance with applicable regulations. Always consult with legal professionals for
          compliance requirements.
        </motion.p>

        <motion.p
          className="text-xs transition-colors duration-300 text-gray-500"
          initial={{ y: 20 }}
          animate={isFooterInView ? { y: 0 } : { y: 20 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          © 2024 Data Privacy Redaction Tool. All rights reserved. |
          <span className="mx-2 cursor-pointer transition-colors hover:text-blue-600 dark:hover:text-blue-400">
            Privacy Policy
          </span>{" "}
          |
          <span className="mx-2 cursor-pointer transition-colors hover:text-blue-600 dark:hover:text-blue-400">
            Terms of Service
          </span>
        </motion.p>
      </div>
    </motion.footer>
  )
}

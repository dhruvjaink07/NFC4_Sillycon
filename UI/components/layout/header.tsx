"use client"

import { motion } from "framer-motion"
import { Shield } from "lucide-react"
import { ThemeToggle } from "@/components/ui/theme-toggle"

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" },
}

export function Header() {
  return (
    <>
      <ThemeToggle />

      <motion.div className="text-center mb-16" {...fadeInUp}>
        <motion.div
          className="flex items-center justify-center gap-4 mb-6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        >
          <motion.div
            className="p-4 rounded-2xl shadow-lg transition-colors duration-300 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ duration: 0.3 }}
          >
            <Shield className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </motion.div>
          <h1 className="text-5xl font-bold tracking-tight transition-colors duration-300 text-gray-900 dark:text-white">
            Data Privacy Redaction Tool
          </h1>
        </motion.div>

        <motion.p
          className="text-2xl font-medium mb-6 transition-colors duration-300 text-blue-600 dark:text-blue-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          Securely redact sensitive information to stay compliant
        </motion.p>

        <motion.p
          className="text-lg max-w-3xl mx-auto leading-relaxed transition-colors duration-300 text-gray-600 dark:text-gray-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          Our advanced AI-powered redaction tool automatically identifies and removes sensitive information from your
          documents, ensuring compliance with GDPR, HIPAA, and DPDP regulations while maintaining document readability
          and context. Powered by intelligent agents that understand privacy requirements.
        </motion.p>
      </motion.div>
    </>
  )
}

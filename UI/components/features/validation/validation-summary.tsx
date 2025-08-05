"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import CountUp from "react-countup"
import { CheckCircle, ShieldCheck, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface ValidationSummaryProps {
  validationComplete: boolean
  redactionCoverage?: number
  readabilityScore?: number
  readabilityLabel?: string
  complianceStatus?: string
  warnings?: string[]
}

export function ValidationSummary({ 
  validationComplete,
  redactionCoverage = 10,
  readabilityScore = 60,
  readabilityLabel, // Remove the default value here
  complianceStatus = "GDPR",
  warnings = ["High redaction rate detected"]
}: ValidationSummaryProps) {
  const validationRef = useRef(null)
  const isValidationInView = useInView(validationRef, { once: true })

  // Helper function to get readability label based on score
  const getReadabilityLabel = (score: number): string => {
    if (score >= 80) return "Excellent"
    if (score >= 70) return "Good"
    if (score >= 60) return "Fair"
    if (score >= 50) return "Poor"
    return "Very Poor"
  }

  // Helper function to get readability color
  const getReadabilityColor = (score: number): string => {
    if (score >= 80) return "text-green-600 dark:text-green-400"
    if (score >= 70) return "text-green-600 dark:text-green-400"
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400"
    if (score >= 50) return "text-orange-600 dark:text-orange-400"
    return "text-red-600 dark:text-red-400"
  }

  // Helper function to get coverage color
  const getCoverageColor = (coverage: number): string => {
    if (coverage >= 90) return "text-green-600 dark:text-green-400"
    if (coverage >= 70) return "text-blue-600 dark:text-blue-400"
    if (coverage >= 50) return "text-yellow-600 dark:text-yellow-400"
    return "text-red-600 dark:text-red-400"
  }

  // Use dynamic calculation if no label is provided
  const actualReadabilityLabel = readabilityLabel || getReadabilityLabel(readabilityScore)

  return (
    <motion.div
      ref={validationRef}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 1.2 }}
    >
      <Card className="shadow-xl border-0 backdrop-blur-sm transition-colors duration-300 bg-white/90 dark:bg-gray-800/90">
        <CardHeader className="transition-colors duration-300 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/50 dark:to-blue-900/50">
          <CardTitle className="flex items-center gap-3 text-xl transition-colors duration-300 text-gray-900 dark:text-white">
            {validationComplete ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5 }}>
                <ShieldCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
              </motion.div>
            ) : (
              <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            )}
            Validation Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold transition-colors duration-300 text-gray-700 dark:text-gray-300">
                Redaction Coverage
              </span>
              <motion.span
                className={`text-lg font-bold transition-colors duration-300 ${getCoverageColor(redactionCoverage)}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8 }}
              >
                {isValidationInView && <CountUp end={redactionCoverage} duration={2} delay={1.8} suffix="%" />}
              </motion.span>
            </div>
            <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 1.5, delay: 1.6 }}>
              <Progress value={redactionCoverage} className="h-3 transition-colors duration-300 bg-gray-200 dark:bg-gray-700" />
            </motion.div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold transition-colors duration-300 text-gray-700 dark:text-gray-300">
                Readability Score
              </span>
              <motion.span
                className={`text-lg font-bold transition-colors duration-300 ${getReadabilityColor(readabilityScore)}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.0 }}
              >
                {actualReadabilityLabel}
              </motion.span>
            </div>
            <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 1.5, delay: 1.8 }}>
              <Progress value={readabilityScore} className="h-3 transition-colors duration-300 bg-gray-200 dark:bg-gray-700" />
            </motion.div>
          </div>

          <div className="space-y-3">
            <motion.div
              className="flex items-center gap-3 p-4 rounded-xl border transition-colors duration-300 bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 2.0 }}
            >
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium transition-colors duration-300 text-green-700 dark:text-green-300">
                {complianceStatus} Compliant
              </span>
            </motion.div>

            {warnings.length > 0 && warnings.map((warning, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-3 p-4 rounded-xl border transition-colors duration-300 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-700"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 2.2 + index * 0.1 }}
              >
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm font-medium transition-colors duration-300 text-yellow-700 dark:text-yellow-300">
                  {warning}
                </span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

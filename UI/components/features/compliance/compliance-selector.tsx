"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Lock, Info, Shield } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ComplianceSelectorProps {
  onSelectionChange?: (compliance: string, encryption: string) => void
}

const complianceModes = [
  {
    value: "gdpr",
    label: "GDPR",
    desc: "General Data Protection Regulation (EU)",
    tooltip: "European Union regulation for data protection and privacy",
  },
  {
    value: "hipaa",
    label: "HIPAA",
    desc: "Health Insurance Portability Act (US)",
    tooltip: "US legislation for healthcare data protection",
  },
  {
    value: "dpdp",
    label: "DPDP",
    desc: "Digital Personal Data Protection (India)",
    tooltip: "India's comprehensive data protection law",
  },
]

const encryptionMethods = [
  {
    value: "aes256",
    label: "AES-256",
    desc: "Advanced Encryption Standard (256-bit)",
    tooltip: "Military-grade encryption with 256-bit key length",
  },
  {
    value: "rsa2048",
    label: "RSA-2048",
    desc: "Rivest-Shamir-Adleman (2048-bit)",
    tooltip: "Public-key cryptography with 2048-bit key size",
  },
  {
    value: "chacha20",
    label: "ChaCha20",
    desc: "Stream cipher by Daniel J. Bernstein",
    tooltip: "High-speed encryption designed for performance",
  },
]

const entityTypes = [
  "Personal Names",
  "Email Addresses",
  "Phone Numbers",
  "IP Addresses",
  "Credit Cards",
  "SSN",
  "Medical Records",
  "+15 more",
]

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export function ComplianceSelector({ onSelectionChange }: ComplianceSelectorProps) {
  const [complianceValue, setComplianceValue] = useState("gdpr")
  const [encryptionValue, setEncryptionValue] = useState("aes256")

  const handleComplianceChange = (value: string) => {
    setComplianceValue(value)
    onSelectionChange?.(value, encryptionValue)
  }

  const handleEncryptionChange = (value: string) => {
    setEncryptionValue(value)
    onSelectionChange?.(complianceValue, value)
  }

  return (
    <div className="space-y-8">
      {/* Compliance and Encryption Selection */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Compliance Mode */}
        <Card className="shadow-xl border-0 backdrop-blur-sm transition-colors duration-300 bg-white/90 dark:bg-gray-800/90">
          <CardHeader className="transition-colors duration-300 bg-gradient-to-r from-blue-50 to-white dark:from-gray-700 dark:to-gray-800">
            <CardTitle className="flex items-center gap-3 text-xl transition-colors duration-300 text-gray-900 dark:text-white">
              <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Compliance Mode
            </CardTitle>
            <CardDescription className="text-base transition-colors duration-300 text-gray-600 dark:text-gray-300">
              Select the privacy regulation standard
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <RadioGroup value={complianceValue} onValueChange={handleComplianceChange} className="space-y-4">
              {complianceModes.map((mode, index) => (
                <motion.div
                  key={mode.value}
                  className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                    complianceValue === mode.value
                      ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30'
                      : 'border-gray-100 hover:border-blue-200 bg-white/50 dark:border-gray-700 dark:hover:border-blue-600 dark:bg-gray-800/50'
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 1.2 + index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleComplianceChange(mode.value)}
                >
                  <RadioGroupItem 
                    value={mode.value} 
                    id={mode.value}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={mode.value}
                      className="font-semibold cursor-pointer transition-colors duration-300 text-gray-800 dark:text-gray-200"
                    >
                      {mode.label}
                    </Label>
                    <p className="text-sm transition-colors duration-300 text-gray-600 dark:text-gray-400">
                      {mode.desc}
                    </p>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div 
                          whileHover={{ scale: 1.1 }} 
                          whileTap={{ scale: 0.9 }}
                          className="pointer-events-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Info className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{mode.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </motion.div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Encryption Method */}
        <Card className="shadow-xl border-0 backdrop-blur-sm transition-colors duration-300 bg-white/90 dark:bg-gray-800/90">
          <CardHeader className="transition-colors duration-300 bg-gradient-to-r from-purple-50 to-white dark:from-purple-900/30 dark:to-gray-800">
            <CardTitle className="flex items-center gap-3 text-xl transition-colors duration-300 text-gray-900 dark:text-white">
              <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              Encryption Method
            </CardTitle>
            <CardDescription className="text-base transition-colors duration-300 text-gray-600 dark:text-gray-300">
              Choose the encryption algorithm
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <RadioGroup value={encryptionValue} onValueChange={handleEncryptionChange} className="space-y-4">
              {encryptionMethods.map((method, index) => (
                <motion.div
                  key={method.value}
                  className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                    encryptionValue === method.value
                      ? 'border-purple-500 bg-purple-50 dark:border-purple-400 dark:bg-purple-900/30'
                      : 'border-gray-100 hover:border-purple-200 bg-white/50 dark:border-gray-700 dark:hover:border-purple-600 dark:bg-gray-800/50'
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 1.4 + index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleEncryptionChange(method.value)}
                >
                  <RadioGroupItem 
                    value={method.value} 
                    id={method.value}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={method.value}
                      className="font-semibold cursor-pointer transition-colors duration-300 text-gray-800 dark:text-gray-200"
                    >
                      {method.label}
                    </Label>
                    <p className="text-sm transition-colors duration-300 text-gray-600 dark:text-gray-400">{method.desc}</p>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div 
                          whileHover={{ scale: 1.1 }} 
                          whileTap={{ scale: 0.9 }}
                          className="pointer-events-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Info className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{method.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </motion.div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      </div>

      {/* Protected Entity Types */}
      {/* <Card className="shadow-xl border-0 backdrop-blur-sm transition-colors duration-300 bg-white/90 dark:bg-gray-800/90">
        <CardHeader className="transition-colors duration-300 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/50 dark:to-blue-900/50">
          <CardTitle className="flex items-center gap-3 text-xl transition-colors duration-300 text-gray-900 dark:text-white">
            <Lock className="w-6 h-6 text-green-600 dark:text-green-400" />
            Protected Entity Types
          </CardTitle>
          <CardDescription className="text-base transition-colors duration-300 text-gray-600 dark:text-gray-300">
            Data types that will be identified and redacted based on your compliance selection
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <motion.div
            className="flex flex-wrap gap-3"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {entityTypes.map((badge, index) => (
              <motion.div
                key={badge}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 1.6 + index * 0.05 }}
              >
                <Badge
                  variant="outline"
                  className="text-sm px-4 py-2 transition-colors duration-300 bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300"
                >
                  {badge}
                </Badge>
              </motion.div>
            ))}
          </motion.div>
        </CardContent>
      </Card> */}
    </div>
  )
}

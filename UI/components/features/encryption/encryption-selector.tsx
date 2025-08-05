"use client"

import { motion } from "framer-motion"
import { Shield, Info } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface EncryptionSelectorProps {
  value: string
  onChange: (value: string) => void
}

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

export function EncryptionSelector({ value, onChange }: EncryptionSelectorProps) {
  const handleMethodClick = (methodValue: string) => {
    onChange(methodValue)
  }

  return (
    <Card className="shadow-xl border-0 backdrop-blur-sm transition-colors duration-300 bg-white/90 dark:bg-gray-800/90">
      <CardHeader className="transition-colors duration-300 bg-gradient-to-r from-purple-50 to-white dark:from-purple-900/30 dark:to-gray-800">
        <CardTitle className="flex items-center gap-3 text-xl transition-colors duration-300 text-gray-900 dark:text-white">
          <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          Encryption Method
        </CardTitle>
        <CardDescription className="text-base transition-colors duration-300 text-gray-600 dark:text-gray-300">
          Choose the encryption algorithm for securing your redacted document
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8">
        <RadioGroup value={value} onValueChange={onChange} className="space-y-4">
          {encryptionMethods.map((method, index) => (
            <motion.div
              key={method.value}
              className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                value === method.value
                  ? 'border-purple-500 bg-purple-50 dark:border-purple-400 dark:bg-purple-900/30'
                  : 'border-gray-100 hover:border-purple-200 bg-white/50 dark:border-gray-700 dark:hover:border-purple-600 dark:bg-gray-800/50'
              }`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 1.4 + index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => handleMethodClick(method.value)}
            >
              <RadioGroupItem 
                value={method.value} 
                id={method.value}
                className="pointer-events-none" // Disable direct clicks on radio button
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
                      className="pointer-events-auto" // Allow tooltip to work
                      onClick={(e) => e.stopPropagation()} // Prevent tooltip click from triggering method selection
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
  )
}

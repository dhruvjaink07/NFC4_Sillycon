"use client"

import { motion } from "framer-motion"
import { Eye } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const documentContent = [
  "Dear [REDACTED],",
  "We are writing to inform you about the recent update to our privacy policy. Your personal information, including your email address [REDACTED] and phone number [REDACTED], will be processed according to the new guidelines.",
  "If you have any questions, please contact our support team at our office located at 123 Business Street, or call us during business hours.",
  "Your account ID [REDACTED] will remain active, and you can access your dashboard using your existing credentials.",
  "Best regards,\nThe Privacy Team",
]

export function DocumentPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Card className="shadow-xl border-0 backdrop-blur-sm transition-colors duration-300 bg-white/90 dark:bg-gray-800/90">
        <CardHeader className="transition-colors duration-300 bg-gradient-to-r from-blue-50 to-white dark:from-gray-700 dark:to-gray-800">
          <CardTitle className="flex items-center gap-3 text-xl transition-colors duration-300 text-gray-900 dark:text-white">
            <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Document Preview
          </CardTitle>
          <CardDescription className="text-base transition-colors duration-300 text-gray-600 dark:text-gray-300">
            Preview of your document with redacted content highlighted
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="rounded-xl p-8 max-h-96 overflow-y-auto border shadow-inner transition-colors duration-300 bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700">
            <motion.div
              className="space-y-6 text-base leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {documentContent.map((paragraph, index) => (
                <motion.p
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  className="transition-colors duration-300 text-gray-700 dark:text-gray-300"
                >
                  {paragraph.split("[REDACTED]").map((part, partIndex, parts) => (
                    <span key={partIndex}>
                      {part}
                      {partIndex < parts.length - 1 && (
                        <motion.span
                          className="px-3 py-1 rounded-md mx-1 shadow-sm transition-colors duration-300 bg-gray-800 text-gray-800 dark:bg-gray-600 dark:text-gray-600"
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: "auto", opacity: 1 }}
                          transition={{ duration: 0.4, delay: 0.5 + partIndex * 0.2 }}
                        >
                          [REDACTED]
                        </motion.span>
                      )}
                    </span>
                  ))}
                </motion.p>
              ))}
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

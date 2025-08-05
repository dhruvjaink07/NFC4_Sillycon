"use client"

import { motion } from "framer-motion"
import { Download, Settings, Sliders } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function ActionButtons() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 1.4 }}
    >
      <Card className="shadow-xl border-0 backdrop-blur-sm transition-colors duration-300 bg-white/90 dark:bg-gray-800/90">
        <CardHeader>
          <CardTitle className="text-xl transition-colors duration-300 text-gray-900 dark:text-white">
            Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <motion.div
            whileHover={{
              scale: 1.02,
              boxShadow: "0 10px 25px rgba(74, 144, 226, 0.3)",
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 text-base font-semibold shadow-lg">
              <Download className="w-5 h-5 mr-2" />
              Download Redacted File
            </Button>
          </motion.div>

          <motion.div
            whileHover={{
              scale: 1.02,
              boxShadow: "0 8px 20px rgba(74, 144, 226, 0.2)",
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              variant="outline"
              className="w-full border-2 py-3 text-base font-semibold transition-colors duration-300 border-blue-200 text-blue-700 hover:bg-blue-50 bg-transparent dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/30"
            >
              <Settings className="w-5 h-5 mr-2" />
              Override Redactions
            </Button>
          </motion.div>

          <motion.div
            whileHover={{
              scale: 1.02,
              boxShadow: "0 8px 20px rgba(107, 114, 128, 0.2)",
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              variant="outline"
              className="w-full border-2 py-3 text-base font-semibold transition-colors duration-300 border-gray-200 text-gray-700 hover:bg-gray-50 bg-transparent dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800/50"
            >
              <Sliders className="w-5 h-5 mr-2" />
              Fine-Tune Redactions
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

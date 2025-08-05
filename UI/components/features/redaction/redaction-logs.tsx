"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { FileText } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useTheme } from "@/components/providers/theme-provider"

const tableRowVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
}

export function RedactionLogs() {
  const tableRef = useRef(null)
  const isTableInView = useInView(tableRef, { once: true })
  const { isDarkMode } = useTheme()

  const redactionLogs = [
    {
      entityType: "Person Name",
      original: "John Smith",
      redacted: "[REDACTED]",
      position: "Line 1, Char 5-15",
      confidence: "99%",
      color: isDarkMode ? "bg-blue-900 text-blue-300" : "bg-blue-100 text-blue-700",
    },
    {
      entityType: "Email",
      original: "john.smith@email.com",
      redacted: "[REDACTED]",
      position: "Line 3, Char 45-65",
      confidence: "97%",
      color: isDarkMode ? "bg-purple-900 text-purple-300" : "bg-purple-100 text-purple-700",
    },
    {
      entityType: "Phone",
      original: "+1-555-123-4567",
      redacted: "[REDACTED]",
      position: "Line 3, Char 85-100",
      confidence: "95%",
      color: isDarkMode ? "bg-orange-900 text-orange-300" : "bg-orange-100 text-orange-700",
    },
    {
      entityType: "Account ID",
      original: "ACC-789456123",
      redacted: "[REDACTED]",
      position: "Line 7, Char 12-25",
      confidence: "92%",
      color: isDarkMode ? "bg-green-900 text-green-300" : "bg-green-100 text-green-700",
    },
  ]

  return (
    <motion.div
      ref={tableRef}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 2.0 }}
      className="mt-12"
    >
      <Card className="shadow-xl border-0 backdrop-blur-sm transition-colors duration-300 bg-white/90 dark:bg-gray-800/90">
        <CardHeader className="transition-colors duration-300 bg-gradient-to-r from-blue-50 to-white dark:from-gray-700 dark:to-gray-800">
          <CardTitle className="flex items-center gap-3 text-xl transition-colors duration-300 text-gray-900 dark:text-white">
            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Redaction Logs
          </CardTitle>
          <CardDescription className="text-base transition-colors duration-300 text-gray-600 dark:text-gray-300">
            Detailed log of all redacted entities in your document
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="rounded-xl border overflow-hidden shadow-sm transition-colors duration-300 border-gray-200 dark:border-gray-700">
            <Table>
              <TableHeader className="transition-colors duration-300 bg-gray-50 dark:bg-gray-700">
                <TableRow>
                  <TableHead className="font-bold py-4 transition-colors duration-300 text-gray-800 dark:text-gray-200">
                    Entity Type
                  </TableHead>
                  <TableHead className="font-bold py-4 transition-colors duration-300 text-gray-800 dark:text-gray-200">
                    Original Value
                  </TableHead>
                  <TableHead className="font-bold py-4 transition-colors duration-300 text-gray-800 dark:text-gray-200">
                    Redacted Value
                  </TableHead>
                  <TableHead className="font-bold py-4 transition-colors duration-300 text-gray-800 dark:text-gray-200">
                    Position
                  </TableHead>
                  <TableHead className="font-bold py-4 transition-colors duration-300 text-gray-800 dark:text-gray-200">
                    Confidence
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redactionLogs.map((log, index) => (
                  <motion.tr
                    key={index}
                    variants={tableRowVariants}
                    initial="initial"
                    animate={isTableInView ? "animate" : "initial"}
                    transition={{ duration: 0.4, delay: 2.2 + index * 0.1 }}
                    className="border-b transition-colors duration-300 border-gray-100 hover:bg-gray-50/50 dark:border-gray-700 dark:hover:bg-gray-700/30"
                  >
                    <TableCell className="py-4">
                      <Badge className={`px-3 py-1 font-medium ${log.color}`}>{log.entityType}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm py-4 transition-colors duration-300 text-gray-700 dark:text-gray-300">
                      {log.original}
                    </TableCell>
                    <TableCell className="font-mono text-sm py-4 transition-colors duration-300 text-gray-700 dark:text-gray-300">
                      {log.redacted}
                    </TableCell>
                    <TableCell className="text-sm py-4 transition-colors duration-300 text-gray-600 dark:text-gray-400">
                      {log.position}
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge
                        variant="outline"
                        className="font-medium transition-colors duration-300 text-green-700 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-600 dark:bg-green-900/30"
                      >
                        {log.confidence}
                      </Badge>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

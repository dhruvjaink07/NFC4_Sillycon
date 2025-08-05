"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { FileText, Clock, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useTheme } from "@/components/providers/theme-provider"

const tableRowVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
}

interface RedactionData {
  original_length: number
  redacted_file: string
  redacted_items_count: number
  redacted_items: Array<{
    type: string
    value: string
  }>
  compliance_notes: string
  timestamp: string | { timestamp: string }
}

interface RedactionLogsProps {
  data?: RedactionData
}

export function RedactionLogs({ data }: RedactionLogsProps) {
  console.log('RedactionLogs component is rendering with data:', data) // Add this line
  
  const tableRef = useRef(null)
  const isTableInView = useInView(tableRef, { once: true })
  const { isDarkMode } = useTheme()

  // Use provided data or fallback to sample data
  const redactionData: RedactionData = data || {
    original_length: 414,
    redacted_file: "sample_letter_redacted_GDPR.pdf",
    redacted_items_count: 4,
    redacted_items: [
      {
        type: "name",
        value: "Johnathan Matthews"
      },
      {
        type: "email",
        value: "john.matthews@example.com"
      },
      {
        type: "phone number",
        value: "+1-202-555-0184"
      },
      {
        type: "url",
        value: "https://careers.examplecompany.com"
      }
    ],
    compliance_notes: "*Summary Decision:* Compliant.\n\n*Violations Found:* None. The redactions effectively remove direct personal identifiers (name, email, phone number) and a URL, aligning with the principles of data minimization and protection required by GDPR, HIPAA, and DPDP.",
    timestamp: new Date().toISOString()
  }

  // Handle timestamp parsing
  const getTimestamp = () => {
    if (typeof redactionData.timestamp === 'string') {
      try {
        const parsed = JSON.parse(redactionData.timestamp)
        return parsed.timestamp === "generated" ? new Date().toISOString() : parsed.timestamp
      } catch {
        return redactionData.timestamp
      }
    }
    return typeof redactionData.timestamp === 'object' ? redactionData.timestamp.timestamp : new Date().toISOString()
  }

  const getEntityTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'name': isDarkMode ? "bg-blue-900 text-blue-300" : "bg-blue-100 text-blue-700",
      'email': isDarkMode ? "bg-purple-900 text-purple-300" : "bg-purple-100 text-purple-700",
      'phone number': isDarkMode ? "bg-orange-900 text-orange-300" : "bg-orange-100 text-orange-700",
      'phone': isDarkMode ? "bg-orange-900 text-orange-300" : "bg-orange-100 text-orange-700",
      'url': isDarkMode ? "bg-green-900 text-green-300" : "bg-green-100 text-green-700",
      'ssn': isDarkMode ? "bg-red-900 text-red-300" : "bg-red-100 text-red-700",
      'address': isDarkMode ? "bg-yellow-900 text-yellow-300" : "bg-yellow-100 text-yellow-700",
      'person': isDarkMode ? "bg-blue-900 text-blue-300" : "bg-blue-100 text-blue-700",
      'organization': isDarkMode ? "bg-indigo-900 text-indigo-300" : "bg-indigo-100 text-indigo-700",
      'date': isDarkMode ? "bg-pink-900 text-pink-300" : "bg-pink-100 text-pink-700",
      'location': isDarkMode ? "bg-yellow-900 text-yellow-300" : "bg-yellow-100 text-yellow-700",
    }
    return colors[type.toLowerCase()] || (isDarkMode ? "bg-gray-900 text-gray-300" : "bg-gray-100 text-gray-700")
  }

  // Check if any item has a redacted_value property
  const showRedactedValue = redactionData.redacted_items.some(
    (item: any) => item.redacted_value !== undefined && item.redacted_value !== null
  )

  return (
    <motion.div
      ref={tableRef}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="mt-8"
    >
      <Card className="shadow-xl border-0 backdrop-blur-sm transition-colors duration-300 bg-white/90 dark:bg-gray-800/90">
        <CardHeader className="transition-colors duration-300 bg-gradient-to-r from-blue-50 to-white dark:from-gray-700 dark:to-gray-800">
          <CardTitle className="flex items-center gap-3 text-xl transition-colors duration-300 text-gray-900 dark:text-white">
            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Redaction Logs
          </CardTitle>
          <CardDescription className="text-base transition-colors duration-300 text-gray-600 dark:text-gray-300">
            Detailed log of redacted entities and their original values
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 transition-colors duration-300">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {redactionData.redacted_items_count}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Items Redacted</div>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 transition-colors duration-300">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {redactionData.original_length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Original Length</div>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 transition-colors duration-300">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Compliant</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Status</div>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 transition-colors duration-300">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {new Date(getTimestamp()).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Processed</div>
            </div>
          </div>

          {/* Redacted Items Table */}
          <div className="rounded-xl border overflow-hidden shadow-sm transition-colors duration-300 border-gray-200 dark:border-gray-700">
            <Table>
              <TableHeader className="transition-colors duration-300 bg-gray-50 dark:bg-gray-700/80">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold py-4 transition-colors duration-300 text-gray-800 dark:text-gray-200">
                    Entity Type
                  </TableHead>
                  <TableHead className="font-bold py-4 transition-colors duration-300 text-gray-800 dark:text-gray-200">
                    Original Value
                  </TableHead>
                  {showRedactedValue && (
                    <TableHead className="font-bold py-4 transition-colors duration-300 text-gray-800 dark:text-gray-200">
                      Redacted Value
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {redactionData.redacted_items.map((item, index) => (
                  <TableRow
                    key={`${item.type}-${index}`}
                    className="border-b transition-all duration-300 border-gray-100 hover:bg-gray-50/70 dark:border-gray-700 dark:hover:bg-gray-700/30"
                  >
                    <TableCell className="py-4">
                      {item.type}
                    </TableCell>
                    <TableCell className="py-4">
                      {item.value}
                    </TableCell>
                    {showRedactedValue && (
                      <TableCell className="py-4">
                        {item.redacted_value ?? ""}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Compliance Notes */}
          {redactionData.compliance_notes && (
            <div className="mt-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 transition-colors duration-300">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">
                    Compliance Analysis
                  </h4>
                  <div className="text-sm text-green-700 dark:text-green-400 whitespace-pre-line leading-relaxed">
                    {redactionData.compliance_notes}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Output File Info */}
          <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 transition-colors duration-300">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="font-medium text-blue-800 dark:text-blue-300">Output File: </span>
                <span className="font-mono text-sm text-blue-700 dark:text-blue-400 break-all">
                  {redactionData.redacted_file}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

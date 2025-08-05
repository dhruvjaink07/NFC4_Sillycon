"use client"

import { useState } from "react"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Header } from "@/components/layout/header"
import { FileUpload } from "@/components/features/file-upload/file-upload"
import { ComplianceSelector } from "@/components/features/compliance/compliance-selector"
import { EncryptionSelector } from "@/components/features/encryption/encryption-selector"
import { DocumentPreview } from "@/components/features/document/document-preview"
import { ValidationSummary } from "@/components/features/validation/validation-summary"
import { ActionButtons } from "@/components/features/actions/action-buttons"
import { RedactionLogs } from "@/components/features/redaction/redaction-logs"
import { Footer } from "@/components/layout/footer"
import { ProcessingOverlay } from "@/components/ui/processing-overlay"
import { motion } from "framer-motion"

export default function DataPrivacyRedactionTool() {
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [complianceMode, setComplianceMode] = useState("gdpr")
  const [encryptionMethod, setEncryptionMethod] = useState("aes256")
  const [validationComplete, setValidationComplete] = useState(false)

  const handleFileUpload = (fileName: string) => {
    setUploadedFile(fileName)
    setIsProcessing(true)

    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false)
      setShowPreview(true)
      setValidationComplete(true)
    }, 3000)
  }

  const handleFileRemove = () => {
    setUploadedFile(null)
    setShowPreview(false)
    setValidationComplete(false)
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 transition-colors duration-500">
        <ProcessingOverlay isVisible={isProcessing} />

        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <Header />

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <FileUpload
                  uploadedFile={uploadedFile}
                  onFileUpload={handleFileUpload}
                  onFileRemove={handleFileRemove}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.0 }}
              >
                <ComplianceSelector value={complianceMode} onChange={setComplianceMode} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.2 }}
              >
                {/* <EncryptionSelector value={encryptionMethod} onChange={setEncryptionMethod} /> */}
              </motion.div>

              {showPreview && <DocumentPreview />}
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              <ValidationSummary validationComplete={validationComplete} />

              <ActionButtons />
            </div>
          </div>

          {showPreview && <RedactionLogs />}

          <Footer />
        </div>
      </div>
    </ThemeProvider>
  )
}

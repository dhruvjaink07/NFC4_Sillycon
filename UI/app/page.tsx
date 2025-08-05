"use client"

import { useState, useRef } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import CountUp from "react-countup"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Upload,
  FileText,
  Shield,
  Download,
  Settings,
  Sliders,
  Info,
  AlertTriangle,
  CheckCircle,
  Eye,
  Lock,
  Loader2,
  Scan,
  ShieldCheck,
  Moon,
  Sun,
} from "lucide-react"

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" },
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const tableRowVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
}

// Mock Lottie component (in real app, you'd use lottie-react)
const LottieAnimation = ({
  src,
  loop = true,
  className = "",
  isDark = false,
}: { src: string; loop?: boolean; className?: string; isDark?: boolean }) => (
  <div className={`flex items-center justify-center ${className}`}>
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: loop ? Number.POSITIVE_INFINITY : 0, ease: "linear" }}
      className={`w-16 h-16 border-4 rounded-full ${
        isDark ? "border-blue-800 border-t-blue-400" : "border-blue-200 border-t-blue-600"
      }`}
    />
  </div>
)

export default function DataPrivacyRedactionTool() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [complianceMode, setComplianceMode] = useState("gdpr")
  const [validationComplete, setValidationComplete] = useState(false)

  const footerRef = useRef(null)
  const tableRef = useRef(null)
  const validationRef = useRef(null)

  const isFooterInView = useInView(footerRef, { once: true })
  const isTableInView = useInView(tableRef, { once: true })
  const isValidationInView = useInView(validationRef, { once: true })

  // Simulate file processing
  const handleFileUpload = () => {
    setUploadedFile("sample-document.pdf")
    setTimeout(() => {
      setIsProcessing(true)
      setTimeout(() => {
        setIsProcessing(false)
        setShowPreview(true)
        setValidationComplete(true)
      }, 3000)
    }, 1000)
  }

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
    <div
      className={`min-h-screen transition-colors duration-500 ${
        isDarkMode
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900"
          : "bg-gradient-to-br from-blue-50 via-white to-blue-50"
      }`}
    >
      {/* Dark Mode Toggle */}
      <motion.div
        className="fixed top-6 right-6 z-40"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <motion.div
          className={`flex items-center gap-3 p-3 rounded-full shadow-lg backdrop-blur-sm border transition-all duration-300 ${
            isDarkMode ? "bg-gray-800/90 border-gray-700 text-white" : "bg-white/90 border-gray-200 text-gray-700"
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div animate={{ rotate: isDarkMode ? 180 : 0 }} transition={{ duration: 0.5, ease: "easeInOut" }}>
            {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </motion.div>
          <Switch checked={isDarkMode} onCheckedChange={setIsDarkMode} className="data-[state=checked]:bg-blue-600" />
        </motion.div>
      </motion.div>

      {/* Processing Overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl transition-colors duration-300 ${
                isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
              }`}
            >
              <div className="mb-6">
                <LottieAnimation src="/processing-animation.json" className="mb-4" isDark={isDarkMode} />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  className={`mx-auto w-16 h-16 border-4 rounded-full mb-4 ${
                    isDarkMode ? "border-blue-800 border-t-blue-400" : "border-blue-200 border-t-blue-600"
                  }`}
                />
              </div>
              <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                Processing Document
              </h3>
              <p className={`mb-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                Analyzing for PII and sensitive information...
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-blue-500">
                <Scan className="w-4 h-4 animate-pulse" />
                <span>AI Agents are working...</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 1. Header Section */}
        <motion.div className="text-center mb-16" {...fadeInUp}>
          <motion.div
            className="flex items-center justify-center gap-4 mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          >
            <motion.div
              className={`p-4 rounded-2xl shadow-lg transition-colors duration-300 ${
                isDarkMode
                  ? "bg-gradient-to-br from-blue-900 to-blue-800"
                  : "bg-gradient-to-br from-blue-100 to-blue-200"
              }`}
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ duration: 0.3 }}
            >
              <Shield className={`w-10 h-10 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
            </motion.div>
            <h1
              className={`text-5xl font-bold tracking-tight transition-colors duration-300 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Data Privacy Redaction Tool
            </h1>
          </motion.div>

          <motion.p
            className={`text-2xl font-medium mb-6 transition-colors duration-300 ${
              isDarkMode ? "text-blue-400" : "text-blue-600"
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Securely redact sensitive information to stay compliant
          </motion.p>

          <motion.p
            className={`text-lg max-w-3xl mx-auto leading-relaxed transition-colors duration-300 ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            Our advanced AI-powered redaction tool automatically identifies and removes sensitive information from your
            documents, ensuring compliance with GDPR, HIPAA, and DPDP regulations while maintaining document readability
            and context. Powered by intelligent agents that understand privacy requirements.
          </motion.p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* 2. File Upload Section */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <Card
                className={`shadow-xl border-0 backdrop-blur-sm overflow-hidden transition-colors duration-300 ${
                  isDarkMode ? "bg-gray-800/90" : "bg-white/90"
                }`}
              >
                <CardHeader
                  className={`transition-colors duration-300 ${
                    isDarkMode ? "bg-gradient-to-r from-gray-700 to-gray-800" : "bg-gradient-to-r from-blue-50 to-white"
                  }`}
                >
                  <CardTitle
                    className={`flex items-center gap-3 text-xl transition-colors duration-300 ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    <Upload className={`w-6 h-6 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                    Upload Document
                  </CardTitle>
                  <CardDescription
                    className={`text-base transition-colors duration-300 ${
                      isDarkMode ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    Drag and drop your file or click to browse. Supports PDF, DOCX, TXT, and JSON formats.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  {!uploadedFile ? (
                    <motion.div
                      className={`border-3 border-dashed rounded-2xl p-16 text-center hover:border-blue-400 transition-all duration-300 cursor-pointer relative overflow-hidden ${
                        isDarkMode
                          ? "border-blue-600 bg-gradient-to-br from-blue-900/30 to-transparent"
                          : "border-blue-300 bg-gradient-to-br from-blue-50/50 to-transparent"
                      }`}
                      animate={{
                        borderColor: isDarkMode ? ["#2563EB", "#3B82F6", "#2563EB"] : ["#93C5FD", "#60A5FA", "#93C5FD"],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleFileUpload}
                    >
                      <div className="flex flex-col items-center gap-6">
                        <LottieAnimation src="/upload-animation.json" className="mb-4" isDark={isDarkMode} />
                        <motion.div
                          className={`p-6 rounded-full shadow-lg transition-colors duration-300 ${
                            isDarkMode ? "bg-gray-700" : "bg-white"
                          }`}
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                        >
                          <FileText className={`w-12 h-12 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                        </motion.div>
                        <div>
                          <p
                            className={`text-xl font-semibold mb-3 transition-colors duration-300 ${
                              isDarkMode ? "text-gray-200" : "text-gray-700"
                            }`}
                          >
                            Drop your files here, or{" "}
                            <span className={`underline ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
                              browse
                            </span>
                          </p>
                          <p
                            className={`transition-colors duration-300 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                          >
                            Supports: .pdf, .docx, .txt, .json (Max 25MB)
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      className={`p-6 rounded-xl border transition-colors duration-300 ${
                        isDarkMode
                          ? "bg-gradient-to-r from-green-900/30 to-blue-900/30 border-green-700"
                          : "bg-gradient-to-r from-green-50 to-blue-50 border-green-200"
                      }`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div className="flex items-center gap-4">
                        <motion.div
                          className={`p-3 rounded-lg shadow-sm transition-colors duration-300 ${
                            isDarkMode ? "bg-gray-700" : "bg-white"
                          }`}
                          initial={{ rotate: -10 }}
                          animate={{ rotate: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <FileText className={`w-8 h-8 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                        </motion.div>
                        <div className="flex-1">
                          <p
                            className={`font-semibold text-lg transition-colors duration-300 ${
                              isDarkMode ? "text-gray-200" : "text-gray-800"
                            }`}
                          >
                            {uploadedFile}
                          </p>
                          <p
                            className={`transition-colors duration-300 ${
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            2.4 MB • Uploaded just now
                          </p>
                        </div>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.3, delay: 0.2 }}
                        >
                          <Badge
                            className={`px-3 py-1 transition-colors duration-300 ${
                              isDarkMode ? "bg-green-900 text-green-300" : "bg-green-100 text-green-700"
                            }`}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Ready
                          </Badge>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* 3. Compliance Mode Selector */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.0 }}
            >
              <Card
                className={`shadow-xl border-0 backdrop-blur-sm transition-colors duration-300 ${
                  isDarkMode ? "bg-gray-800/90" : "bg-white/90"
                }`}
              >
                <CardHeader
                  className={`transition-colors duration-300 ${
                    isDarkMode ? "bg-gradient-to-r from-gray-700 to-gray-800" : "bg-gradient-to-r from-blue-50 to-white"
                  }`}
                >
                  <CardTitle
                    className={`flex items-center gap-3 text-xl transition-colors duration-300 ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    <Lock className={`w-6 h-6 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                    Compliance Mode
                  </CardTitle>
                  <CardDescription
                    className={`text-base transition-colors duration-300 ${
                      isDarkMode ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    Select the privacy regulation standard for redaction
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <RadioGroup value={complianceMode} onValueChange={setComplianceMode} className="space-y-4">
                        {[
                          { value: "gdpr", label: "GDPR", desc: "General Data Protection Regulation (EU)" },
                          { value: "hipaa", label: "HIPAA", desc: "Health Insurance Portability Act (US)" },
                          { value: "dpdp", label: "DPDP", desc: "Digital Personal Data Protection (India)" },
                        ].map((mode, index) => (
                          <motion.div
                            key={mode.value}
                            className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                              isDarkMode
                                ? "border-gray-700 hover:border-blue-600 bg-gray-800/50"
                                : "border-gray-100 hover:border-blue-200 bg-white/50"
                            }`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 1.2 + index * 0.1 }}
                            whileHover={{ scale: 1.02 }}
                          >
                            <RadioGroupItem value={mode.value} id={mode.value} />
                            <div className="flex-1">
                              <Label
                                htmlFor={mode.value}
                                className={`font-semibold cursor-pointer transition-colors duration-300 ${
                                  isDarkMode ? "text-gray-200" : "text-gray-800"
                                }`}
                              >
                                {mode.label}
                              </Label>
                              <p
                                className={`text-sm transition-colors duration-300 ${
                                  isDarkMode ? "text-gray-400" : "text-gray-600"
                                }`}
                              >
                                {mode.desc}
                              </p>
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                    <Info className={`w-5 h-5 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`} />
                                  </motion.div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Click for detailed compliance information</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </motion.div>
                        ))}
                      </RadioGroup>
                    </div>

                    <div className="space-y-4">
                      <h4
                        className={`font-semibold transition-colors duration-300 ${
                          isDarkMode ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        Protected Entity Types:
                      </h4>
                      <motion.div
                        className="flex flex-wrap gap-2"
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                      >
                        {[
                          "Personal Names",
                          "Email Addresses",
                          "Phone Numbers",
                          "IP Addresses",
                          "Credit Cards",
                          "SSN",
                          "Medical Records",
                          "+15 more",
                        ].map((badge, index) => (
                          <motion.div
                            key={badge}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2, delay: 1.4 + index * 0.05 }}
                          >
                            <Badge
                              variant="outline"
                              className={`text-sm px-3 py-1 transition-colors duration-300 ${
                                isDarkMode
                                  ? "bg-blue-900/30 border-blue-700 text-blue-300"
                                  : "bg-blue-50 border-blue-200 text-blue-700"
                              }`}
                            >
                              {badge}
                            </Badge>
                          </motion.div>
                        ))}
                      </motion.div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* 5. Redacted Document Preview */}
            <AnimatePresence>
              {showPreview && (
                <motion.div
                  initial={{ opacity: 0, y: 40, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                >
                  <Card
                    className={`shadow-xl border-0 backdrop-blur-sm transition-colors duration-300 ${
                      isDarkMode ? "bg-gray-800/90" : "bg-white/90"
                    }`}
                  >
                    <CardHeader
                      className={`transition-colors duration-300 ${
                        isDarkMode
                          ? "bg-gradient-to-r from-gray-700 to-gray-800"
                          : "bg-gradient-to-r from-blue-50 to-white"
                      }`}
                    >
                      <CardTitle
                        className={`flex items-center gap-3 text-xl transition-colors duration-300 ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        <Eye className={`w-6 h-6 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                        Document Preview
                      </CardTitle>
                      <CardDescription
                        className={`text-base transition-colors duration-300 ${
                          isDarkMode ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        Preview of your document with redacted content highlighted
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                      <div
                        className={`rounded-xl p-8 max-h-96 overflow-y-auto border shadow-inner transition-colors duration-300 ${
                          isDarkMode ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <motion.div
                          className="space-y-6 text-base leading-relaxed"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        >
                          {[
                            "Dear [REDACTED],",
                            "We are writing to inform you about the recent update to our privacy policy. Your personal information, including your email address [REDACTED] and phone number [REDACTED], will be processed according to the new guidelines.",
                            "If you have any questions, please contact our support team at our office located at 123 Business Street, or call us during business hours.",
                            "Your account ID [REDACTED] will remain active, and you can access your dashboard using your existing credentials.",
                            "Best regards,\nThe Privacy Team",
                          ].map((paragraph, index) => (
                            <motion.p
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5, delay: index * 0.2 }}
                              className={`transition-colors duration-300 ${
                                isDarkMode ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              {paragraph.split("[REDACTED]").map((part, partIndex, parts) => (
                                <span key={partIndex}>
                                  {part}
                                  {partIndex < parts.length - 1 && (
                                    <motion.span
                                      className={`px-3 py-1 rounded-md mx-1 shadow-sm transition-colors duration-300 ${
                                        isDarkMode ? "bg-gray-600 text-gray-600" : "bg-gray-800 text-gray-800"
                                      }`}
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
              )}
            </AnimatePresence>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* 7. Validation Summary Panel */}
            <motion.div
              ref={validationRef}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
            >
              <Card
                className={`shadow-xl border-0 backdrop-blur-sm transition-colors duration-300 ${
                  isDarkMode ? "bg-gray-800/90" : "bg-white/90"
                }`}
              >
                <CardHeader
                  className={`transition-colors duration-300 ${
                    isDarkMode
                      ? "bg-gradient-to-r from-green-900/50 to-blue-900/50"
                      : "bg-gradient-to-r from-green-50 to-blue-50"
                  }`}
                >
                  <CardTitle
                    className={`flex items-center gap-3 text-xl transition-colors duration-300 ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {validationComplete ? (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5 }}>
                        <ShieldCheck className={`w-6 h-6 ${isDarkMode ? "text-green-400" : "text-green-600"}`} />
                      </motion.div>
                    ) : (
                      <CheckCircle className={`w-6 h-6 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                    )}
                    Validation Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span
                        className={`text-sm font-semibold transition-colors duration-300 ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Redaction Coverage
                      </span>
                      <motion.span
                        className={`text-lg font-bold transition-colors duration-300 ${
                          isDarkMode ? "text-blue-400" : "text-blue-600"
                        }`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.8 }}
                      >
                        {isValidationInView && <CountUp end={87} duration={2} delay={1.8} suffix="%" />}
                      </motion.span>
                    </div>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1.5, delay: 1.6 }}
                    >
                      <Progress
                        value={87}
                        className={`h-3 transition-colors duration-300 ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`}
                      />
                    </motion.div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span
                        className={`text-sm font-semibold transition-colors duration-300 ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Readability Score
                      </span>
                      <motion.span
                        className={`text-lg font-bold transition-colors duration-300 ${
                          isDarkMode ? "text-green-400" : "text-green-600"
                        }`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2.0 }}
                      >
                        Good
                      </motion.span>
                    </div>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1.5, delay: 1.8 }}
                    >
                      <Progress
                        value={75}
                        className={`h-3 transition-colors duration-300 ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`}
                      />
                    </motion.div>
                  </div>

                  <motion.div className="space-y-3" variants={staggerContainer} initial="initial" animate="animate">
                    <motion.div
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-colors duration-300 ${
                        isDarkMode ? "bg-green-900/30 border-green-700" : "bg-green-50 border-green-200"
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 2.0 }}
                    >
                      <CheckCircle className={`w-5 h-5 ${isDarkMode ? "text-green-400" : "text-green-600"}`} />
                      <span
                        className={`text-sm font-medium transition-colors duration-300 ${
                          isDarkMode ? "text-green-300" : "text-green-700"
                        }`}
                      >
                        GDPR Compliant
                      </span>
                    </motion.div>

                    <motion.div
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-colors duration-300 ${
                        isDarkMode ? "bg-yellow-900/30 border-yellow-700" : "bg-yellow-50 border-yellow-200"
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 2.2 }}
                    >
                      <AlertTriangle className={`w-5 h-5 ${isDarkMode ? "text-yellow-400" : "text-yellow-600"}`} />
                      <span
                        className={`text-sm font-medium transition-colors duration-300 ${
                          isDarkMode ? "text-yellow-300" : "text-yellow-700"
                        }`}
                      >
                        High redaction rate detected
                      </span>
                    </motion.div>
                  </motion.div>

                  <motion.div
                    className={`pt-6 border-t transition-colors duration-300 ${
                      isDarkMode ? "border-gray-700" : "border-gray-200"
                    }`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2.4 }}
                  >
                    <div className="grid grid-cols-2 gap-6 text-center">
                      <div
                        className={`p-4 rounded-xl transition-colors duration-300 ${
                          isDarkMode ? "bg-blue-900/30" : "bg-blue-50"
                        }`}
                      >
                        <motion.p
                          className={`text-3xl font-bold transition-colors duration-300 ${
                            isDarkMode ? "text-blue-400" : "text-blue-600"
                          }`}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.6, delay: 2.6 }}
                        >
                          {isValidationInView && <CountUp end={24} duration={1.5} delay={2.6} />}
                        </motion.p>
                        <p
                          className={`text-sm font-medium transition-colors duration-300 ${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          Items Redacted
                        </p>
                      </div>
                      <div
                        className={`p-4 rounded-xl transition-colors duration-300 ${
                          isDarkMode ? "bg-green-900/30" : "bg-green-50"
                        }`}
                      >
                        <motion.p
                          className={`text-3xl font-bold transition-colors duration-300 ${
                            isDarkMode ? "text-green-400" : "text-green-600"
                          }`}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.6, delay: 2.8 }}
                        >
                          {isValidationInView && <CountUp end={98} duration={1.5} delay={2.8} suffix="%" />}
                        </motion.p>
                        <p
                          className={`text-sm font-medium transition-colors duration-300 ${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          Confidence
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>

            {/* 8. Action Buttons */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1.4 }}
            >
              <Card
                className={`shadow-xl border-0 backdrop-blur-sm transition-colors duration-300 ${
                  isDarkMode ? "bg-gray-800/90" : "bg-white/90"
                }`}
              >
                <CardHeader>
                  <CardTitle
                    className={`text-xl transition-colors duration-300 ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <motion.div
                    whileHover={{
                      scale: 1.02,
                      boxShadow: isDarkMode
                        ? "0 10px 25px rgba(59, 130, 246, 0.3)"
                        : "0 10px 25px rgba(74, 144, 226, 0.3)",
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
                      boxShadow: isDarkMode
                        ? "0 8px 20px rgba(59, 130, 246, 0.2)"
                        : "0 8px 20px rgba(74, 144, 226, 0.2)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      variant="outline"
                      className={`w-full border-2 py-3 text-base font-semibold transition-colors duration-300 ${
                        isDarkMode
                          ? "border-blue-600 text-blue-400 hover:bg-blue-900/30 bg-transparent"
                          : "border-blue-200 text-blue-700 hover:bg-blue-50 bg-transparent"
                      }`}
                    >
                      <Settings className="w-5 h-5 mr-2" />
                      Override Redactions
                    </Button>
                  </motion.div>

                  <motion.div
                    whileHover={{
                      scale: 1.02,
                      boxShadow: isDarkMode
                        ? "0 8px 20px rgba(107, 114, 128, 0.2)"
                        : "0 8px 20px rgba(107, 114, 128, 0.2)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      variant="outline"
                      className={`w-full border-2 py-3 text-base font-semibold transition-colors duration-300 ${
                        isDarkMode
                          ? "border-gray-600 text-gray-300 hover:bg-gray-800/50 bg-transparent"
                          : "border-gray-200 text-gray-700 hover:bg-gray-50 bg-transparent"
                      }`}
                    >
                      <Sliders className="w-5 h-5 mr-2" />
                      Fine-Tune Redactions
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* 6. Redaction Logs Table */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              ref={tableRef}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 2.0 }}
              className="mt-12"
            >
              <Card
                className={`shadow-xl border-0 backdrop-blur-sm transition-colors duration-300 ${
                  isDarkMode ? "bg-gray-800/90" : "bg-white/90"
                }`}
              >
                <CardHeader
                  className={`transition-colors duration-300 ${
                    isDarkMode ? "bg-gradient-to-r from-gray-700 to-gray-800" : "bg-gradient-to-r from-blue-50 to-white"
                  }`}
                >
                  <CardTitle
                    className={`flex items-center gap-3 text-xl transition-colors duration-300 ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    <FileText className={`w-6 h-6 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                    Redaction Logs
                  </CardTitle>
                  <CardDescription
                    className={`text-base transition-colors duration-300 ${
                      isDarkMode ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    Detailed log of all redacted entities in your document
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  <div
                    className={`rounded-xl border overflow-hidden shadow-sm transition-colors duration-300 ${
                      isDarkMode ? "border-gray-700" : "border-gray-200"
                    }`}
                  >
                    <Table>
                      <TableHeader
                        className={`transition-colors duration-300 ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}
                      >
                        <TableRow>
                          <TableHead
                            className={`font-bold py-4 transition-colors duration-300 ${
                              isDarkMode ? "text-gray-200" : "text-gray-800"
                            }`}
                          >
                            Entity Type
                          </TableHead>
                          <TableHead
                            className={`font-bold py-4 transition-colors duration-300 ${
                              isDarkMode ? "text-gray-200" : "text-gray-800"
                            }`}
                          >
                            Original Value
                          </TableHead>
                          <TableHead
                            className={`font-bold py-4 transition-colors duration-300 ${
                              isDarkMode ? "text-gray-200" : "text-gray-800"
                            }`}
                          >
                            Redacted Value
                          </TableHead>
                          <TableHead
                            className={`font-bold py-4 transition-colors duration-300 ${
                              isDarkMode ? "text-gray-200" : "text-gray-800"
                            }`}
                          >
                            Position
                          </TableHead>
                          <TableHead
                            className={`font-bold py-4 transition-colors duration-300 ${
                              isDarkMode ? "text-gray-200" : "text-gray-800"
                            }`}
                          >
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
                            className={`border-b transition-colors duration-300 ${
                              isDarkMode
                                ? "border-gray-700 hover:bg-gray-700/30"
                                : "border-gray-100 hover:bg-gray-50/50"
                            }`}
                          >
                            <TableCell className="py-4">
                              <Badge className={`px-3 py-1 font-medium ${log.color}`}>{log.entityType}</Badge>
                            </TableCell>
                            <TableCell
                              className={`font-mono text-sm py-4 transition-colors duration-300 ${
                                isDarkMode ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              {log.original}
                            </TableCell>
                            <TableCell
                              className={`font-mono text-sm py-4 transition-colors duration-300 ${
                                isDarkMode ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              {log.redacted}
                            </TableCell>
                            <TableCell
                              className={`text-sm py-4 transition-colors duration-300 ${
                                isDarkMode ? "text-gray-400" : "text-gray-600"
                              }`}
                            >
                              {log.position}
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge
                                variant="outline"
                                className={`font-medium transition-colors duration-300 ${
                                  isDarkMode
                                    ? "text-green-400 border-green-600 bg-green-900/30"
                                    : "text-green-700 border-green-300 bg-green-50"
                                }`}
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
          )}
        </AnimatePresence>

        {/* 9. Footer */}
        <motion.footer
          ref={footerRef}
          className={`mt-20 pt-12 border-t transition-colors duration-300 ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}
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
              <div
                className={`p-2 rounded-lg transition-colors duration-300 ${
                  isDarkMode
                    ? "bg-gradient-to-br from-blue-900 to-purple-900"
                    : "bg-gradient-to-br from-blue-100 to-purple-100"
                }`}
              >
                <Loader2 className={`w-5 h-5 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
              </div>
              <span
                className={`text-lg font-semibold transition-colors duration-300 ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Powered by AI Agents
              </span>
            </motion.div>

            <motion.p
              className={`text-sm max-w-4xl mx-auto leading-relaxed transition-colors duration-300 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
              initial={{ y: 20 }}
              animate={isFooterInView ? { y: 0 } : { y: 20 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <strong>Legal Disclaimer:</strong> This tool is designed to assist with data privacy compliance but does
              not guarantee complete removal of all sensitive information. Users are responsible for reviewing redacted
              documents and ensuring compliance with applicable regulations. Always consult with legal professionals for
              compliance requirements.
            </motion.p>

            <motion.p
              className={`text-xs transition-colors duration-300 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
              initial={{ y: 20 }}
              animate={isFooterInView ? { y: 0 } : { y: 20 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              © 2024 Data Privacy Redaction Tool. All rights reserved. |
              <span
                className={`mx-2 cursor-pointer transition-colors ${
                  isDarkMode ? "hover:text-blue-400" : "hover:text-blue-600"
                }`}
              >
                Privacy Policy
              </span>{" "}
              |
              <span
                className={`mx-2 cursor-pointer transition-colors ${
                  isDarkMode ? "hover:text-blue-400" : "hover:text-blue-600"
                }`}
              >
                Terms of Service
              </span>
            </motion.p>
          </div>
        </motion.footer>
      </div>
    </div>
  )
}

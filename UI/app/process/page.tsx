"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, Shield, ArrowLeft, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { PreviewCompo } from "@/components/features/preview/previewCompo"   
import { RedactionLogs } from "@/components/features/redaction/redaction-logs"

interface ProcessingData {
  files?: Array<{
    name: string
    size: number
    type: string
    content?: string // Add content field
    lastModified?: number
  }>
  fileName?: string
  fileSize?: number
  fileCount?: number
  totalSize?: number
  complianceMode: string
  encryptionMethod: string
}

export default function ProcessPage() {
  const [processingData, setProcessingData] = useState<ProcessingData | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Get processing data from sessionStorage
    const data = sessionStorage.getItem('processingData')
    if (data) {
      try {
        const parsed = JSON.parse(data)
        console.log('Processing data loaded:', parsed) // Debug log
        setProcessingData(parsed)
      } catch (error) {
        console.error('Error parsing processing data:', error)
        router.push('/')
      }
    } else {
      console.log('No processing data found, redirecting to upload')
      router.push('/')
    }
  }, [router])

  // Add cleanup useEffect:
  useEffect(() => {
    // Cleanup function when component unmounts
    return () => {
      // Clean up global files when leaving the page
      if ((window as any).uploadedFilesForPreview) {
        delete (window as any).uploadedFilesForPreview
      }
    }
  }, [])

  const handleDownload = async () => {
    setIsDownloading(true)
    // Simulate download process
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsDownloading(false)
    
    // In a real app, this would trigger the actual download
    alert('Download started! Files will be saved to your Downloads folder.')
  }

  const handleBackToUpload = () => {
    // Clean up the global files when going back
    delete (window as any).uploadedFilesForPreview
    router.push('/')
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileCount = () => {
    if (processingData?.files) {
      return processingData.files.length
    }
    return processingData?.fileName ? 1 : 0
  }

  const getTotalSize = () => {
    if (processingData?.totalSize) {
      return processingData.totalSize
    }
    return processingData?.fileSize || 0
  }

  // Show loading state while processing data is being prepared
  if (!processingData) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 flex items-center justify-center">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 mx-auto mb-4"
            >
              ⚙️
            </motion.div>
            <p className="text-gray-600 dark:text-gray-400">Loading processed files...</p>
          </div>
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          
          {/* Header with Button */}
          <motion.div 
            className="flex items-center justify-between p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg mb-8 border border-gray-100 dark:border-gray-700"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={handleBackToUpload}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Upload</span>
              </Button>
              
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center text-white shadow-lg">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                    Processing Complete
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {getFileCount()} file{getFileCount() !== 1 ? 's' : ''} processed • {formatFileSize(getTotalSize())}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex items-center space-x-3">
              {processingData && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Badge variant="secondary">
                    {processingData.complianceMode?.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">
                    {processingData.encryptionMethod?.toUpperCase()}
                  </Badge>
                </div>
              )}
              
              <Button
                onClick={handleDownload}
                disabled={isDownloading}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold shadow-lg"
              >
                {isDownloading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 mr-2"
                    >
                      ⚙️
                    </motion.div>
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download Results
                  </>
                )}
              </Button>
            </div>
          </motion.div>

          {/* Main Content Area */}
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="p-8">
              
              {/* Preview Section */}
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="flex items-center space-x-3 mb-6">
                  <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                    Document Preview
                  </h2>
                  <Badge variant="outline" className="text-xs">
                    Redacted
                  </Badge>
                </div>
                
                {/* Preview Component - Pass uploaded files */}
                <Card className="border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <CardContent className="p-6">
                    <PreviewCompo uploadedFiles={processingData?.files} />
                  </CardContent>
                </Card>
              </motion.div>

              {/* Bottom Row - Log Table and Additional Info */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Log Table - Takes 2/3 width */}
                <motion.div
                  className="lg:col-span-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                      Redaction Logs
                    </h3>
                  </div>
                  
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-0">
                      <RedactionLogs />
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Processing Summary - Takes 1/3 width */}
                <motion.div
                  className="lg:col-span-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                    Processing Summary
                  </h3>
                  
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-6 space-y-4">
                      
                      {/* Files Processed */}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Files Processed:</span>
                        <Badge variant="secondary">
                          {getFileCount()}
                        </Badge>
                      </div>

                      {/* Total Size */}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Size:</span>
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {formatFileSize(getTotalSize())}
                        </span>
                      </div>

                      {/* Compliance Mode */}
                      {processingData?.complianceMode && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Compliance:</span>
                          <Badge variant="outline" className="text-xs">
                            {processingData.complianceMode.toUpperCase()}
                          </Badge>
                        </div>
                      )}

                      {/* Encryption Method */}
                      {processingData?.encryptionMethod && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Encryption:</span>
                          <Badge variant="outline" className="text-xs">
                            {processingData.encryptionMethod.toUpperCase()}
                          </Badge>
                        </div>
                      )}

                      <div className="border-t pt-4 mt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Status:</span>
                          <Badge variant="default" className="bg-green-600 text-white">
                            ✓ Complete
                          </Badge>
                        </div>
                      </div>

                      {/* File List */}
                      {processingData?.files && processingData.files.length > 0 && (
                        <div className="border-t pt-4 mt-4">
                          <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                            Processed Files:
                          </h4>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {processingData.files.map((file, index) => (
                              <div key={index} className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                📄 {file.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </ThemeProvider>
  )
}
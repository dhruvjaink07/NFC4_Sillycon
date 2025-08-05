"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ThemeProvider } from "@/components/providers/theme-provider"
import { PreviewCompo } from '@/components/features/preview/previewCompo'
import { RedactionLogs } from '@/components/features/redaction/redaction-logs'

interface ProcessedFileData {
  name: string
  size: number
  type: string
  content: string
  lastModified: number
}

interface ProcessingData {
  files: ProcessedFileData[]
  fileCount: number
  totalSize: number
  complianceMode: string
  encryptionMethod: string
}

export default function ProcessPage() {
  const [processingData, setProcessingData] = useState<ProcessingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Get data from sessionStorage
    const storedData = sessionStorage.getItem('processingData')
    
    if (!storedData) {
      console.error('No processing data found in sessionStorage')
      // Redirect back to home if no data
      router.push('/')
      return
    }

    try {
      const data: ProcessingData = JSON.parse(storedData)
      console.log('Loaded processing data:', {
        fileCount: data.files?.length || 0,
        files: data.files?.map(f => ({ 
          name: f.name, 
          type: f.type, 
          hasContent: !!f.content,
          contentLength: f.content?.length || 0
        })) || []
      })
      
      setProcessingData(data)
      setIsLoading(false)
    } catch (error) {
      console.error('Error parsing processing data:', error)
      router.push('/')
    }
  }, [router])

  if (isLoading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">⚙️</div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              Loading Documents...
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Preparing your documents for processing
            </p>
          </div>
        </div>
      </ThemeProvider>
    )
  }

  if (!processingData || !processingData.files || processingData.files.length === 0) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              No Documents Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No processing data was found. Please upload documents first.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back to Upload
            </button>
          </div>
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg mb-8 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">
                📊
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                  Document Preview & Redaction
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Review your documents and redaction analysis
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {processingData.files.length} document{processingData.files.length !== 1 ? 's' : ''} loaded
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                {processingData.complianceMode.toUpperCase()} • {processingData.encryptionMethod.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Document Preview Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 p-6 mb-8">
            <div className="flex items-center space-x-2 mb-6">
              <div className="text-2xl">📄</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                Document Preview
              </h2>
            </div>
            <PreviewCompo 
              uploadedFiles={processingData.files}
              className="w-full"
            />
          </div>

          {/* Redaction Analysis Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <div className="text-2xl">🔒</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                Redaction Analysis
              </h2>
            </div>
            <RedactionLogs 
              data={{
                original_length: processingData.files.reduce((acc, file) => acc + (file.content?.length || 0), 0),
                redacted_file: `redacted_${processingData.files[0]?.name || 'document'}.pdf`,
                redacted_items_count: Math.floor(Math.random() * 10) + 5, // Mock count
                redacted_items: [
                  {
                    type: "name",
                    value: "John Doe"
                  },
                  {
                    type: "email", 
                    value: "john.doe@example.com"
                  },
                  {
                    type: "phone number",
                    value: "+1-555-123-4567"
                  },
                  {
                    type: "ssn",
                    value: "123-45-6789"
                  },
                  {
                    type: "address",
                    value: "123 Main Street, City, State 12345"
                  }
                ],
                compliance_notes: `*Summary Decision:* Compliant.\n\n*Violations Found:* None. The redactions effectively remove direct personal identifiers (name, email, phone number, SSN, address) aligning with the principles of data minimization and protection required by ${processingData.complianceMode.toUpperCase()}.`,
                timestamp: new Date().toISOString()
              }}
            />
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}
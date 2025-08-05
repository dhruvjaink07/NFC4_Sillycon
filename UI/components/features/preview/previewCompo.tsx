"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff, FileText, ZoomIn, ZoomOut, Copy, AlertCircle } from "lucide-react"

interface PreviewCompoProps {
  className?: string
  uploadedFiles?: Array<{
    name: string
    size: number
    type: string
    content?: string // Add content field
    lastModified?: number
  }>
}

interface ProcessedFile {
  id: string
  name: string
  type: string
  title: string
  content: string
  rawJsonContent?: any
  redactedContent: Array<{
    type: "paragraph" | "redacted"
    text: string
    originalText?: string
    category?: string
  }>
  redactionStats: {
    totalRedactions: number
    categories: Record<string, number>
  }
  isLoading: boolean
  error?: string
}

export function PreviewCompo({ className, uploadedFiles }: PreviewCompoProps) {
  const [showRedactions, setShowRedactions] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [activeFileId, setActiveFileId] = useState("")
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([])

  // Process uploaded files and read their content
  useEffect(() => {
    console.log('PreviewCompo received files:', uploadedFiles) // Debug log
    if (uploadedFiles && uploadedFiles.length > 0) {
      processFiles(uploadedFiles)
    } else {
      // Show default mock content when no files are uploaded
      setProcessedFiles([])
      setActiveFileId("")
    }
  }, [uploadedFiles])

  // Render content based on file type with proper formatting
  const renderFileContent = (file: ProcessedFile) => {
    if (file.type === 'json') {
      if (file.rawJsonContent) {
        // Show formatted JSON
        return (
          <pre className="text-sm font-mono whitespace-pre-wrap break-words bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-auto">
            {JSON.stringify(file.rawJsonContent, null, 2)}
          </pre>
        )
      } else {
        // Show raw JSON content as text
        return (
          <pre className="text-sm font-mono whitespace-pre-wrap break-words bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-auto">
            {file.content}
          </pre>
        )
      }
    } else if (file.type === 'txt' || file.type === 'csv' || file.type === 'xml') {
      // Show text-based files with original formatting preserved
      return (
        <div className="bg-gray-50 dark:bg-gray-900 border rounded-lg p-4 overflow-auto">
          <pre className="text-sm whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200 font-mono">
            {file.content}
          </pre>
        </div>
      )
    } else {
      // For other files (like PDF, DOC), show with redaction toggle
      return (
        <div className="text-gray-800 dark:text-gray-200 leading-relaxed text-base">
          {file.redactedContent.map((section, index) => {
            if (section.type === "paragraph") {
              return (
                <span key={index} style={{ whiteSpace: 'pre-wrap' }}>
                  {section.text}
                </span>
              )
            } else if (section.type === "redacted") {
              return (
                <motion.span
                  key={index}
                  className={`inline-block relative group cursor-help ${
                    showRedactions 
                      ? "bg-black text-black dark:bg-gray-900 dark:text-gray-900 px-1 rounded" 
                      : "bg-yellow-200 dark:bg-yellow-800 px-1 rounded border border-yellow-400 dark:border-yellow-600"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  title={showRedactions ? section.originalText : `Redacted: ${section.category}`}
                >
                  {showRedactions ? section.text : section.originalText}
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                    {showRedactions ? `Category: ${section.category}` : 'This content was redacted'}
                  </div>
                </motion.span>
              )
            }
            return null
          })}
        </div>
      )
    }
  }

  const processFiles = async (files: any[]) => {
    console.log('Processing files:', files) // Debug log
    const processed: ProcessedFile[] = []
    
    for (const file of files) {
      const fileId = file.name.replace(/[^a-zA-Z0-9]/g, '_')
      
      const processedFile: ProcessedFile = {
        id: fileId,
        name: file.name,
        type: file.type || getFileTypeFromName(file.name),
        title: `${file.name.replace(/\.[^/.]+$/, "")} - Document Preview`,
        content: "",
        redactedContent: [],
        redactionStats: { totalRedactions: 0, categories: {} },
        isLoading: true
      }
      
      processed.push(processedFile)
    }
    
    setProcessedFiles(processed)
    setActiveFileId(processed[0]?.id || "")
    
    // Process file contents
    for (let i = 0; i < files.length; i++) {
      try {
        const file = files[i]
        console.log('Processing file:', file.name, 'Content available:', !!file.content) // Debug log
        
        if (file.content) {
          // Use the stored content directly
          const content = file.content
          let parsedJson = null
          const fileType = getFileTypeFromName(file.name)
          
          // Try to parse JSON if it's a JSON file
          if (fileType === 'json') {
            try {
              parsedJson = JSON.parse(content)
              console.log('Successfully parsed JSON for:', file.name)
            } catch (e) {
              console.warn('Failed to parse JSON for:', file.name, e)
            }
          }
          
          // For text-based files that we want to show as-is, skip redaction processing
          const textBasedFiles = ['json', 'txt', 'csv', 'xml']
          let redactedData = { content: [], stats: { totalRedactions: 0, categories: {} } }
          
          if (!textBasedFiles.includes(fileType)) {
            // Only apply redaction to files that aren't meant to be shown as-is
            redactedData = simulateRedaction(content, file.name)
          } else {
            // For text-based files, create a simple content structure
            redactedData = {
              content: [{
                type: "paragraph" as const,
                text: content
              }],
              stats: { totalRedactions: 0, categories: {} }
            }
          }
          
          setProcessedFiles(prev => prev.map(pf => 
            pf.id === processed[i].id 
              ? {
                  ...pf,
                  content,
                  rawJsonContent: parsedJson,
                  redactedContent: redactedData.content,
                  redactionStats: redactedData.stats,
                  isLoading: false
                }
              : pf
          ))
        } else {
          console.error('No content found for file:', file.name)
          setProcessedFiles(prev => prev.map(pf => 
            pf.id === processed[i].id 
              ? {
                  ...pf,
                  isLoading: false,
                  error: "File content not available. Please re-upload the file."
                }
              : pf
          ))
        }
      } catch (error) {
        console.error('Error processing file:', error)
        setProcessedFiles(prev => prev.map(pf => 
          pf.id === processed[i].id 
            ? {
                ...pf,
                isLoading: false,
                error: "Failed to process file content: " + (error as Error).message
              }
            : pf
        ))
      }
    }
  }

  const getFileTypeFromName = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase() || ''
    const typeMap: { [key: string]: string } = {
      'pdf': 'pdf',
      'doc': 'docx',
      'docx': 'docx', 
      'txt': 'txt',
      'json': 'json',
      'csv': 'csv',
      'xml': 'xml'
    }
    return typeMap[extension] || 'txt'
  }

  const simulateRedaction = (content: string, fileName: string) => {
    // Patterns to detect sensitive information
    const patterns = [
      { regex: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, category: "Personal Name" },
      { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, category: "Email Address" },
      { regex: /\$[\d,]+\.?\d*/g, category: "Financial Data" },
      { regex: /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, category: "Date" },
      { regex: /\b\d{4}-\d{2}-\d{2}\b/g, category: "Date" },
      { regex: /\b\d{3}-\d{2}-\d{4}\b/g, category: "SSN" },
      { regex: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, category: "Phone Number" },
      { regex: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b/gi, category: "Address" }
    ]

    const redactedContent: any[] = []
    const stats = { totalRedactions: 0, categories: {} as Record<string, number> }
    
    let lastIndex = 0
    const matches: { start: number, end: number, text: string, category: string }[] = []
    
    // Find all matches
    patterns.forEach(pattern => {
      let match
      const regex = new RegExp(pattern.regex)
      while ((match = regex.exec(content)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
          category: pattern.category
        })
      }
    })
    
    // Sort matches by position
    matches.sort((a, b) => a.start - b.start)
    
    // Remove overlapping matches (keep the first one)
    const filteredMatches = matches.filter((match, index) => {
      if (index === 0) return true
      const prevMatch = matches[index - 1]
      return match.start >= prevMatch.end
    })
    
    // Build redacted content
    filteredMatches.forEach(match => {
      // Add text before the match
      if (lastIndex < match.start) {
        const beforeText = content.slice(lastIndex, match.start)
        if (beforeText) {
          redactedContent.push({
            type: "paragraph",
            text: beforeText
          })
        }
      }
      
      // Add redacted text
      redactedContent.push({
        type: "redacted",
        originalText: match.text,
        category: match.category,
        text: `[REDACTED - ${match.category.toUpperCase()}]`
      })
      
      // Update stats
      stats.totalRedactions++
      stats.categories[match.category] = (stats.categories[match.category] || 0) + 1
      
      lastIndex = match.end
    })
    
    // Add remaining text
    if (lastIndex < content.length) {
      const remainingText = content.slice(lastIndex)
      if (remainingText) {
        redactedContent.push({
          type: "paragraph",
          text: remainingText
        })
      }
    }
    
    // If no redactions found, show original content
    if (redactedContent.length === 0) {
      redactedContent.push({
        type: "paragraph",
        text: content
      })
    }
    
    return { content: redactedContent, stats }
  }

  // Generate mock content for fallback
  const generateMockContent = (fileName: string, fileType: string) => {
    const mockTemplates = {
      pdf: [
        {
          type: "paragraph" as const,
          text: "This is a PDF document. Actual content extraction requires server-side processing.\n\n"
        }
      ],
      txt: [
        {
          type: "paragraph" as const,
          text: "Sample text file content:\n\nThis is a text document containing some information."
        }
      ],
      json: [
        {
          type: "paragraph" as const,
          text: '{\n  "message": "No actual JSON content available",\n  "status": "mock data"\n}'
        }
      ]
    }

    const template = mockTemplates[fileType as keyof typeof mockTemplates] || mockTemplates.txt
    
    const stats = { totalRedactions: 0, categories: {} as Record<string, number> }

    return { content: template, redactionStats: stats }
  }

  const activeFile = processedFiles.find(file => file.id === activeFileId) || processedFiles[0]

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50))
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return '📄'
      case 'docx': 
      case 'doc': return '📝'
      case 'txt': return '📄'
      case 'json': return '📋'
      case 'csv': return '📊'
      case 'xml': return '📄'
      default: return '📄'
    }
  }

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy content:', err)
    }
  }

  // Check what's in sessionStorage
  console.log('Session storage:', sessionStorage.getItem('processingData'))

  // Check global variables
  console.log('Global files:', (window as any).uploadedFilesForPreview)

  if (!uploadedFiles || uploadedFiles.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 text-gray-500 dark:text-gray-400 ${className}`}>
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No files uploaded yet</p>
          <p className="text-sm">Upload files to see the preview</p>
        </div>
      </div>
    )
  }

  if (!activeFile) {
    return (
      <div className={`flex items-center justify-center p-8 text-gray-500 dark:text-gray-400 ${className}`}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Error loading file preview</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      
      {/* File Tabs - Only show if multiple files */}
      {processedFiles.length > 1 && (
        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg overflow-x-auto">
          {processedFiles.map((file) => (
            <button
              key={file.id}
              onClick={() => setActiveFileId(file.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                activeFileId === file.id
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <span className="text-base">{getFileIcon(file.type)}</span>
              <span className="truncate max-w-32">{file.name}</span>
              {file.isLoading ? (
                <Badge variant="secondary" className="text-xs">
                  Loading...
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  {file.type.toUpperCase()}
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Preview Controls */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {activeFile.name}
            </span>
          </div>
          
          <Badge variant="outline" className="text-xs">
            {activeFile.type.toUpperCase()} File
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          {/* Copy Button */}
          {!activeFile.isLoading && activeFile.content && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                let contentToCopy = activeFile.content
                
                // For JSON files, use formatted version if available
                if (activeFile.type === 'json' && activeFile.rawJsonContent) {
                  contentToCopy = JSON.stringify(activeFile.rawJsonContent, null, 2)
                }
                
                copyToClipboard(contentToCopy)
              }}
              className="flex items-center space-x-2"
            >
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </Button>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center space-x-1 border rounded-md bg-white dark:bg-gray-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 50}
              className="h-8 w-8 p-0"
            >
              <ZoomOut className="w-3 h-3" />
            </Button>
            <span className="text-xs px-2 text-gray-600 dark:text-gray-400">
              {zoom}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 200}
              className="h-8 w-8 p-0"
            >
              <ZoomIn className="w-3 h-3" />
            </Button>
          </div>

          {/* Toggle Redactions - Only for files that support redaction */}
          {!['json', 'txt', 'csv', 'xml'].includes(activeFile.type) && (
            <Button
              variant={showRedactions ? "default" : "outline"}
              size="sm"
              onClick={() => setShowRedactions(!showRedactions)}
              className="flex items-center space-x-2"
              disabled={activeFile.isLoading}
            >
              {showRedactions ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span>Hide Redactions</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span>Show Redactions</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Document Preview */}
      <motion.div
        key={activeFileId} // Re-animate when file changes
        className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm"
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="p-8 max-w-4xl mx-auto">
          
          {/* Document Header */}
          <div className="text-center mb-8 pb-4 border-b">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              {activeFile.name}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {activeFile.isLoading 
                ? "Loading file content..." 
                : `${activeFile.type.toUpperCase()} File Preview • ${new Date().toLocaleDateString()}`
              }
            </p>
          </div>

          {/* Document Content */}
          <div className="prose prose-gray dark:prose-invert max-w-none">
            {activeFile.isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 mx-auto mb-4"
                  >
                    ⚙️
                  </motion.div>
                  <p className="text-gray-600 dark:text-gray-400">Loading file content...</p>
                </div>
              </div>
            ) : activeFile.error ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-center text-red-600 dark:text-red-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-4" />
                  <p>{activeFile.error}</p>
                </div>
              </div>
            ) : (
              <div 
                className="border rounded-lg p-6 max-h-96 overflow-y-auto"
                style={{ 
                  maxHeight: activeFile.content.split('\n').length > 20 ? '400px' : 'auto'
                }}
              >
                {renderFileContent(activeFile)}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* File Info Summary */}
      {!activeFile.isLoading && !activeFile.error && (
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
              File Information - {activeFile.name}
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {activeFile.type.toUpperCase()}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  File Type
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {activeFile.content.split('\n').length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Lines
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {activeFile.content.length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Characters
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {['json', 'txt', 'csv', 'xml'].includes(activeFile.type) ? 'Raw Content' : 
                   activeFile.redactionStats.totalRedactions > 0 ? 'Redacted' : 'No Redaction'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Display Mode
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
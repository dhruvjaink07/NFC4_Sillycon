"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Eye, EyeOff, Copy, AlertCircle } from 'lucide-react'

// Add the missing interface
interface StructuredContent {
  type: 'html' | 'text' | 'error'
  content: string
  hasStructure: boolean
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

interface PreviewCompoProps {
  className?: string
  uploadedFiles: Array<{
    name: string
    size: number
    type: string
    content?: string
    lastModified?: number
  }>
}

// Add the sanitizeHtml function
const sanitizeHtml = (html: string): string => {
  // Basic HTML sanitization to prevent XSS
  // In production, you should use a library like DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/on\w+=\w+/gi, '')
}

export function PreviewCompo({ className, uploadedFiles }: PreviewCompoProps) {
  const [showRedactions, setShowRedactions] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [activeFileId, setActiveFileId] = useState("")
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([])

  // Move the getFileTypeFromName function outside and make it available throughout the component
  const getFileTypeFromName = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase() || ''
    return extension
  }

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
      // Parse structured content if available
      let parsedContent: StructuredContent | null = null
      try {
        parsedContent = JSON.parse(file.content)
      } catch (e) {
        // If parsing fails, treat as plain text
      }

      if (parsedContent && parsedContent.type) {
        return (
          <div className="bg-gray-50 dark:bg-gray-900 border rounded-lg p-4 overflow-auto">
            <pre className="text-sm whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200 font-mono">
              {parsedContent.content}
            </pre>
          </div>
        )
      } else {
        // Show text-based files with original formatting preserved
        return (
          <div className="bg-gray-50 dark:bg-gray-900 border rounded-lg p-4 overflow-auto">
            <pre className="text-sm whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200 font-mono">
              {file.content}
            </pre>
          </div>
        )
      }
    } else if (file.type === 'docx') {
      // Parse structured content from DOCX
      let parsedContent: StructuredContent | null = null
      
      console.log('Raw file content for DOCX:', file.content?.substring(0, 200)) // Debug log
      
      try {
        parsedContent = JSON.parse(file.content)
        console.log('Successfully parsed DOCX content:', parsedContent) // Debug log
      } catch (e) {
        console.error('Failed to parse DOCX content as JSON:', e) // Debug log
        console.log('Treating as plain text content') // Debug log
        // If parsing fails, treat as plain text
        parsedContent = { type: 'text', content: file.content, hasStructure: false }
      }

      // Check if we have any content at all
      if (!file.content || file.content.trim().length === 0) {
        console.error('No content available for DOCX file:', file.name)
        return (
          <div className="bg-white dark:bg-gray-800 border rounded-lg p-6 overflow-auto">
            <div className="text-center p-8">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Microsoft Word Document
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {file.name}
              </p>
              
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-red-800 dark:text-red-200 font-medium">No Content Available</span>
                </div>
                <div className="text-sm text-red-700 dark:text-red-300 text-left">
                  <p>The document appears to be empty or the content could not be extracted.</p>
                  <p className="mt-2">Please try re-uploading the file or check if the document contains readable text.</p>
                </div>
              </div>
            </div>
          </div>
        )
      }

      // Check if we have structured HTML content
      if (parsedContent && parsedContent.type === 'html' && parsedContent.hasStructure && parsedContent.content && parsedContent.content.trim()) {
        console.log('Rendering HTML content for DOCX, content length:', parsedContent.content.length) // Debug log
        
        // Render structured HTML content
        return (
          <div className="bg-white dark:bg-gray-800 border rounded-lg overflow-hidden">
            
            
            {/* Document content with styling */}
            <div className="p-6 max-h-96 overflow-auto">
              <div 
                className="docx-content"
                dangerouslySetInnerHTML={{ 
                  __html: sanitizeHtml(parsedContent.content) 
                }}
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  lineHeight: '1.6',
                  color: '#374151'
                }}
              />
            </div>
            
            {/* Global CSS styles for DOCX content */}
            <style jsx global>{`
              .docx-content {
                color: #374151;
              }
              
              .docx-content h1 {
                font-size: 1.75rem !important;
                font-weight: 700 !important;
                margin: 1.5rem 0 1rem 0 !important;
                color: #1f2937 !important;
                border-bottom: 2px solid #e5e7eb !important;
                padding-bottom: 0.5rem !important;
              }
              
              .docx-content h2 {
                font-size: 1.5rem !important;
                font-weight: 600 !important;
                margin: 1.25rem 0 0.75rem 0 !important;
                color: #374151 !important;
              }
              
              .docx-content h3 {
                font-size: 1.25rem !important;
                font-weight: 600 !important;
                margin: 1rem 0 0.5rem 0 !important;
                color: #4b5563 !important;
              }
              
              .docx-content h4 {
                font-size: 1.125rem !important;
                font-weight: 600 !important;
                margin: 0.75rem 0 0.5rem 0 !important;
                color: #6b7280 !important;
              }
              
              /* Enhanced table styling with !important to override any other styles */
              .docx-content table {
                width: 100% !important;
                border-collapse: collapse !important;
                margin: 1.5rem 0 !important;
                background: white !important;
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06) !important;
                border-radius: 0.5rem !important;
                overflow: hidden !important;
                border: 2px solid #d1d5db !important;
              }
              
              .docx-content table th {
                background-color: #f9fafb !important;
                padding: 0.875rem 1rem !important;
                text-align: left !important;
                font-weight: 600 !important;
                color: #374151 !important;
                border-bottom: 2px solid #e5e7eb !important;
                border-right: 1px solid #e5e7eb !important;
                font-size: 0.875rem !important;
                text-transform: uppercase !important;
                letter-spacing: 0.05em !important;
              }
              
              .docx-content table th:last-child {
                border-right: none !important;
              }
              
              .docx-content table td {
                padding: 0.875rem 1rem !important;
                border-bottom: 1px solid #e5e7eb !important;
                border-right: 1px solid #e5e7eb !important;
                color: #4b5563 !important;
                vertical-align: top !important;
                line-height: 1.5 !important;
              }
              
              .docx-content table td:last-child {
                border-right: none !important;
              }
              
              .docx-content table tr:nth-child(even) td {
                background-color: #f9fafb !important;
              }
              
              .docx-content table tr:hover td {
                background-color: #f3f4f6 !important;
              }
              
              .docx-content table tr:last-child td {
                border-bottom: none !important;
              }
              
              .docx-content p {
                margin: 0.75rem 0 !important;
                line-height: 1.7 !important;
                color: #374151 !important;
              }
              
              .docx-content ul, .docx-content ol {
                margin: 0.75rem 0 !important;
                padding-left: 1.5rem !important;
              }
              
              .docx-content li {
                margin: 0.25rem 0 !important;
                line-height: 1.6 !important;
              }
              
              .docx-content strong {
                font-weight: 600 !important;
                color: #1f2937 !important;
              }
              
              .docx-content em {
                font-style: italic !important;
                color: #4b5563 !important;
              }
              
              .docx-content img {
                max-width: 100% !important;
                height: auto !important;
                margin: 1rem 0 !important;
                border-radius: 0.25rem !important;
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1) !important;
              }
              
              /* Dark mode styles */
              .dark .docx-content {
                color: #e5e7eb !important;
              }
              
              .dark .docx-content h1 {
                color: #f9fafb !important;
                border-bottom-color: #374151 !important;
              }
              
              .dark .docx-content h2 {
                color: #e5e7eb !important;
              }
              
              .dark .docx-content h3 {
                color: #d1d5db !important;
              }
              
              .dark .docx-content h4 {
                color: #9ca3af !important;
              }
              
              .dark .docx-content p {
                color: #d1d5db !important;
              }
              
              .dark .docx-content table {
                background: #1f2937 !important;
                border-color: #374151 !important;
              }
              
              .dark .docx-content table th {
                background-color: #374151 !important;
                color: #f9fafb !important;
                border-bottom-color: #4b5563 !important;
                border-right-color: #4b5563 !important;
              }
              
              .dark .docx-content table td {
                color: #d1d5db !important;
                border-bottom-color: #4b5563 !important;
                border-right-color: #4b5563 !important;
              }
              
              .dark .docx-content table tr:nth-child(even) td {
                background-color: #1f2937 !important;
              }
              
              .dark .docx-content table tr:hover td {
                background-color: #374151 !important;
              }
              
              .dark .docx-content strong {
                color: #f9fafb !important;
              }
              
              .dark .docx-content em {
                color: #d1d5db !important;
              }
            `}</style>
          </div>
        )
      } else {
        console.log('Rendering fallback content for DOCX') // Debug log
        console.log('Parsed content type:', parsedContent?.type, 'Has structure:', parsedContent?.hasStructure) // Debug log
        
        // For text content or if HTML parsing failed, show text content
        const content = parsedContent && parsedContent.content ? parsedContent.content : file.content
        const hasError = parsedContent?.type === 'error' || content.includes('Error extracting content')
        
        return (
          <div className="bg-white dark:bg-gray-800 border rounded-lg p-6 overflow-auto">
            {/* Document header */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 border-b rounded-t-lg mb-4">
              <div className="flex items-center space-x-2">
                <div className="text-2xl">📝</div>
                <div>
                  <div className="font-medium text-blue-800 dark:text-blue-200">
                    Microsoft Word Document
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-300">
                    Text content extracted
                  </div>
                </div>
              </div>
            </div>
            
            <div className={`rounded-lg p-4 text-left ${hasError ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-900'}`}>
              <div className="flex items-center mb-3">
                <div className={`w-3 h-3 rounded-full mr-2 ${hasError ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                <span className={`font-medium ${hasError ? 'text-red-800 dark:text-red-200' : 'text-blue-800 dark:text-blue-200'}`}>
                  {hasError ? 'Content Extraction Issue' : 'Document Content'}
                </span>
              </div>
              <div className={`text-sm ${hasError ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'}`}>
                {/* Show content with proper formatting */}
                <div style={{ 
                  whiteSpace: 'pre-wrap', 
                  fontFamily: 'system-ui, sans-serif',
                  lineHeight: '1.6',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  padding: '1rem',
                  border: hasError ? '1px solid #f87171' : '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  backgroundColor: hasError ? '#fef2f2' : '#ffffff'
                }}>
                  {content || 'No content available'}
                </div>
              </div>
            </div>
          </div>
        )
      }
    } else if (file.type === 'doc') {
      // Parse structured content for .doc files
      let parsedContent: StructuredContent | null = null
      try {
        parsedContent = JSON.parse(file.content)
      } catch (e) {
        parsedContent = { type: 'text', content: file.content, hasStructure: false }
      }

      return (
        <div className="bg-white dark:bg-gray-800 border rounded-lg p-6 overflow-auto">
          <div className="text-center p-8">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Legacy Word Document (.doc)
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {file.name}
            </p>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center mb-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span className="text-yellow-800 dark:text-yellow-200 font-medium">Legacy Format</span>
              </div>
              <div className="text-sm text-yellow-700 dark:text-yellow-300 text-left">
                <pre className="whitespace-pre-wrap">{parsedContent ? parsedContent.content : file.content}</pre>
              </div>
            </div>
          </div>
        </div>
      )
    } else if (file.type === 'pdf') {
      // Parse structured content for PDF files
      let parsedContent: StructuredContent | null = null
      try {
        parsedContent = JSON.parse(file.content)
      } catch (e) {
        parsedContent = { type: 'text', content: file.content, hasStructure: false }
      }

      return (
        <div className="bg-gray-50 dark:bg-gray-900 border rounded-lg p-6 overflow-auto">
          <div className="text-center p-8">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              PDF Document
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {file.name}
            </p>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
              <div className="text-sm text-orange-700 dark:text-orange-300 text-left">
                <pre className="whitespace-pre-wrap">{parsedContent ? parsedContent.content : file.content}</pre>
              </div>
            </div>
          </div>
        </div>
      )
    } else {
      // For other files, show with redaction toggle
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

  // Update the processFiles function - remove the inner function definition:
  const processFiles = async (files: Array<{
    name: string
    size: number
    type: string
    content?: string
    lastModified?: number
  }>) => {
    console.log('Processing files:', files) // Debug log
    const processed: ProcessedFile[] = []
    
    for (const file of files) {
      const fileId = file.name.replace(/[^a-zA-Z0-9]/g, '_')
      
      // Use the function that's now defined at component level
      const processedFile: ProcessedFile = {
        id: fileId,
        name: file.name,
        type: file.type || getFileTypeFromName(file.name), // Now this function is accessible
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
          const fileType = getFileTypeFromName(file.name) // Now this function is accessible
          
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
          
          if (!textBasedFiles.includes(fileType) && !['docx', 'doc', 'pdf'].includes(fileType)) {
            // Only apply redaction to files that aren't meant to be shown as-is
            redactedData = simulateRedaction(content, file.name)
          } else {
            // For text-based files and documents, create a simple content structure
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

  // Add the simulateRedaction function:
  const simulateRedaction = (content: string, filename: string) => {
    // This is a mock redaction function - replace with real redaction logic
    const categories = ['PII', 'Financial', 'Medical', 'Confidential']
    const redactionPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN pattern
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email pattern
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card pattern
      /\b\(\d{3}\)\s?\d{3}-\d{4}\b/g, // Phone number pattern
    ]
    
    let processedContent: Array<{
      type: "paragraph" | "redacted"
      text: string
      originalText?: string
      category?: string
    }> = []
    
    let stats = { totalRedactions: 0, categories: {} as Record<string, number> }
    let lastIndex = 0
    
    // Simple redaction simulation
    redactionPatterns.forEach((pattern, patternIndex) => {
      const matches = Array.from(content.matchAll(pattern))
      matches.forEach(match => {
        if (match.index !== undefined) {
          // Add text before the match
          if (match.index > lastIndex) {
            processedContent.push({
              type: "paragraph",
              text: content.slice(lastIndex, match.index)
            })
          }
          
          // Add redacted content
          const category = categories[patternIndex % categories.length]
          processedContent.push({
            type: "redacted",
            text: "█".repeat(match[0].length),
            originalText: match[0],
            category
          })
          
          stats.totalRedactions++
          stats.categories[category] = (stats.categories[category] || 0) + 1
          lastIndex = match.index + match[0].length
        }
      })
    })
    
    // Add remaining content
    if (lastIndex < content.length) {
      processedContent.push({
        type: "paragraph",
        text: content.slice(lastIndex)
      })
    }
    
    // If no redactions found, treat as single paragraph
    if (processedContent.length === 0) {
      processedContent.push({
        type: "paragraph",
        text: content
      })
    }
    
    return { content: processedContent, stats }
  }

  // Add the copyToClipboard function:
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      console.log('Content copied to clipboard')
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      // Fallback method
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        console.log('Content copied to clipboard (fallback)')
      } catch (fallbackError) {
        console.error('Fallback copy method also failed:', fallbackError)
      }
      document.body.removeChild(textArea)
    }
  }

  // Process uploaded files and read their content
  useEffect(() => {
    console.log('PreviewCompo received files:', uploadedFiles) // Debug log
    if (uploadedFiles && uploadedFiles.length > 0) {
      processFiles(uploadedFiles)
    } else {
      // Clear processed files when no files are uploaded
      setProcessedFiles([])
      setActiveFileId("")
    }
  }, [uploadedFiles])

  // Find the active file
  const activeFile = processedFiles.find(file => file.id === activeFileId)

  // Rest of the component JSX remains the same...
  return (
    <div className={`space-y-6 ${className}`}>
      {/* File Selector Tabs */}
      {processedFiles.length > 1 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {processedFiles.map((file) => (
            <Button
              key={file.id}
              variant={activeFileId === file.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFileId(file.id)}
              className="whitespace-nowrap"
            >
              <FileText className="w-4 h-4 mr-2" />
              {file.name}
            </Button>
          ))}
        </div>
      )}

      {/* No Files State */}
      {processedFiles.length === 0 && (
        <Card className="border-2 border-dashed border-gray-300 dark:border-gray-600">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
              No files to preview
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
              Upload files from the main page to see their content preview here. 
              Supported formats include PDF, DOCX, DOC, JSON, TXT, CSV, and XML.
            </p>
          </CardContent>
        </Card>
      )}

      {/* File Preview */}
      {activeFile && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                {activeFile.name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {activeFile.type.toUpperCase()} File Preview
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {/* Toggle Redactions - Only for files that support redaction */}
              {!['json', 'txt', 'csv', 'xml', 'docx', 'doc', 'pdf'].includes(activeFile.type) && (
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
            </div>
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

          {/* File Information */}
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
                       activeFile.type === 'docx' && activeFile.content && !activeFile.content.includes('Binary Document File:') ? 'Extracted Text' :
                       ['docx', 'doc', 'pdf'].includes(activeFile.type) ? 'Document' :
                       activeFile.redactionStats.totalRedactions > 0 ? 'Redacted' : 'No Redaction'}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Display Mode
                    </div>
                  </div>
                </div>

                {/* Show redaction stats only for files that have redactions */}
                {activeFile.redactionStats.totalRedactions > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">
                      Redaction Summary:
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {Object.entries(activeFile.redactionStats.categories).map(([category, count]) => (
                        <div key={category} className="text-center">
                          <div className="text-lg font-bold text-red-600 dark:text-red-400">
                            {count}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {category}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Total sensitive data points found:
                        </span>
                        <Badge variant="destructive">
                          {activeFile.redactionStats.totalRedactions} items
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
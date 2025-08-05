"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Upload, FileText, CheckCircle, X, Plus, Scan } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRef, useState } from "react"

interface UploadedFile {
  name: string
  id: string
  size: number
  type: string
  file: File
}

interface FileUploadProps {
  onProcessFiles?: (files: UploadedFile[]) => void
}

export function FileUpload({ onProcessFiles }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const acceptedTypes = ['.pdf', '.docx', '.txt', '.json']
  const maxFileSize = 25 * 1024 * 1024 // 25MB

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleFileSelect = (files: FileList) => {
    const validFiles: UploadedFile[] = []
    const errors: string[] = []
    
    Array.from(files).forEach((file) => {
      // Validate file type
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!acceptedTypes.includes(fileExtension)) {
        errors.push(`File type not supported for ${file.name}. Please upload: ${acceptedTypes.join(', ')}`)
        return
      }

      // Validate file size
      if (file.size > maxFileSize) {
        errors.push(`File size exceeds 25MB limit for ${file.name}.`)
        return
      }

      // Check for duplicates
      const isDuplicate = uploadedFiles.some(existingFile => existingFile.name === file.name)
      if (isDuplicate) {
        errors.push(`File ${file.name} is already uploaded.`)
        return
      }

      validFiles.push({
        name: file.name,
        id: Math.random().toString(36).substr(2, 9),
        size: file.size,
        type: file.type || 'application/octet-stream',
        file: file
      })
    })

    // Show errors if any
    if (errors.length > 0) {
      alert(errors.join('\n'))
    }

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles])
    }
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      handleFileSelect(files)
    }
    // Reset input value to allow re-selecting the same file
    event.target.value = ''
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
    
    const files = event.dataTransfer.files
    if (files && files.length > 0) {
      handleFileSelect(files)
    }
  }

  const handleFileRemove = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId))
  }

  const handleProcessFiles = async () => {
    if (uploadedFiles.length === 0) return
    
    setIsProcessing(true)
    
    try {
      // Call the parent's process function if provided
      if (onProcessFiles) {
        await onProcessFiles(uploadedFiles)
      } else {
        // Default processing simulation
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
    } catch (error) {
      console.error('Error processing files:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Processing Overlay Component
  const ProcessingOverlay = () => (
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
            className="rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl transition-colors duration-300 bg-white text-gray-900 dark:bg-gray-800 dark:text-white"
          >
            <div className="mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="mx-auto w-16 h-16 border-4 rounded-full mb-4 border-blue-200 border-t-blue-600 dark:border-blue-800 dark:border-t-blue-400"
              />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Processing Documents</h3>
            <p className="mb-4 text-gray-600 dark:text-gray-300">Analyzing for PII and sensitive information...</p>
            <div className="flex items-center justify-center gap-2 text-sm text-blue-500">
              <Scan className="w-4 h-4 animate-pulse" />
              <span>AI Agents are working...</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      <Card className="shadow-xl border-0 backdrop-blur-sm overflow-hidden transition-colors duration-300 bg-white/90 dark:bg-gray-800/90">
        <CardHeader className="transition-colors duration-300 bg-gradient-to-r from-blue-50 to-white dark:from-gray-700 dark:to-gray-800">
          <CardTitle className="flex items-center gap-3 text-xl transition-colors duration-300 text-gray-900 dark:text-white">
            <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Upload Documents
          </CardTitle>
          <CardDescription className="text-base transition-colors duration-300 text-gray-600 dark:text-gray-300">
            Drag and drop your files or click to browse. Supports PDF, DOCX, TXT, and JSON formats. Max 25MB per file.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
            multiple
          />
          
          {/* Always show upload area */}
          <motion.div
            className={`border-3 border-dashed rounded-2xl p-8 text-center hover:border-blue-400 transition-all duration-300 cursor-pointer relative overflow-hidden mb-6 ${
              isDragOver 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50' 
                : 'border-blue-300 bg-gradient-to-br from-blue-50/50 to-transparent dark:border-blue-600 dark:bg-gradient-to-br dark:from-blue-900/30 dark:to-transparent'
            }`}
            animate={{
              borderColor: isDragOver ? ["#3B82F6"] : ["#93C5FD", "#60A5FA", "#93C5FD"],
            }}
            transition={{
              duration: isDragOver ? 0 : 3,
              repeat: isDragOver ? 0 : Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center gap-4">
              <motion.div
                className="p-4 rounded-full shadow-lg transition-colors duration-300 bg-white dark:bg-gray-700"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              >
                <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </motion.div>
              <div>
                <p className="text-lg font-semibold mb-2 transition-colors duration-300 text-gray-700 dark:text-gray-200">
                  {isDragOver ? 'Drop your files here' : 'Drop files here or'} 
                  {!isDragOver && <span className="underline text-blue-600 dark:text-blue-400 ml-1">click to browse</span>}
                </p>
                <p className="text-sm transition-colors duration-300 text-gray-500 dark:text-gray-400">
                  Multiple files supported • PDF, DOCX, TXT, JSON
                </p>
              </div>
            </div>
          </motion.div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Uploaded Files ({uploadedFiles.length})
              </h4>
              {uploadedFiles.map((file, index) => (
                <motion.div
                  key={file.id}
                  className="p-4 rounded-xl border transition-colors duration-300 bg-gradient-to-r from-green-50 to-blue-50 border-green-200 dark:from-green-900/30 dark:to-blue-900/30 dark:border-green-700"
                  initial={{ opacity: 0, scale: 0.9, x: -20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: 20 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <div className="flex items-center gap-4">
                    <motion.div
                      className="p-2 rounded-lg shadow-sm transition-colors duration-300 bg-white dark:bg-gray-700"
                      initial={{ rotate: -10 }}
                      animate={{ rotate: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                        {file.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatFileSize(file.size)} • Ready for processing
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.3, delay: 0.2 }}>
                        <Badge className="px-2 py-1 text-xs transition-colors duration-300 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Ready
                        </Badge>
                      </motion.div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFileRemove(file.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                        disabled={isProcessing}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Process Files Button */}
              <motion.div
                className="pt-4"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={handleProcessFiles}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 text-base font-semibold shadow-lg"
                  disabled={isProcessing || uploadedFiles.length === 0}
                >
                  {isProcessing ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                        className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full"
                      />
                      Processing {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''}...
                    </>
                  ) : (
                    <>
                      <Scan className="w-4 h-4 mr-2" />
                      Process {uploadedFiles.length} File{uploadedFiles.length > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <ProcessingOverlay />
    </>
  )
}

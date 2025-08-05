"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import mammoth from 'mammoth' // Add this import
import { ThemeProvider } from "@/components/providers/theme-provider"
import { motion, AnimatePresence } from "framer-motion"
import { Shield, Upload, Settings, Zap, X, File, FileText, FileImage, Plus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function DataPrivacyRedactionTool() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [allowedFileType, setAllowedFileType] = useState<string | null>(null)
  const [complianceMode, setComplianceMode] = useState("gdpr")
  const [encryptionMethod, setEncryptionMethod] = useState("aes256")
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()

  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || ''
  }

  const getFileIcon = (filename: string) => {
    const extension = getFileExtension(filename)
    switch (extension) {
      case 'pdf':
        return '📄'
      case 'doc':
      case 'docx':
        return '📝'
      case 'txt':
        return '📄'
      case 'json':
        return '📋'
      case 'jpg':
      case 'jpeg':
      case 'png':
        return '🖼️'
      default:
        return '📄'
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    if (files.length > 0) {
      const newFiles: File[] = []
      let currentAllowedType = allowedFileType
      
      // If this is the first upload and no type is set, use the first file's type
      if (!currentAllowedType && files.length > 0) {
        currentAllowedType = getFileExtension(files[0].name)
      }
      
      // Check all files before processing any
      const invalidFiles: string[] = []
      const validFiles: File[] = []
      
      for (const file of files) {
        const fileExtension = getFileExtension(file.name)
        
        // If this is the very first file being uploaded (no allowed type set yet)
        if (!allowedFileType && validFiles.length === 0) {
          // Set the allowed type based on first valid file
          currentAllowedType = fileExtension
          validFiles.push(file)
        } 
        // Check if file matches the allowed type (either existing or from first file in this batch)
        else if (fileExtension === currentAllowedType) {
          // Check if file already exists (by name and size)
          const fileExists = uploadedFiles.some(existingFile => 
            existingFile.name === file.name && existingFile.size === file.size
          )
          
          if (!fileExists) {
            validFiles.push(file)
          }
        } 
        // If file type doesn't match, add to invalid list
        else {
          invalidFiles.push(`${file.name} (${fileExtension.toUpperCase()})`)
        }
      }
      
      // If there are invalid files, reject the entire upload
      if (invalidFiles.length > 0) {
        const allowedTypeText = currentAllowedType ? currentAllowedType.toUpperCase() : 'the selected type'
        alert(`Invalid file types detected!\n\nOnly ${allowedTypeText} files are allowed.\n\nRejected files:\n${invalidFiles.join('\n')}\n\nPlease select only ${allowedTypeText} files or remove current files to upload a different type.`)
        event.target.value = ''
        return
      }
      
      // If all files are valid, process them
      if (validFiles.length > 0) {
        // Set the allowed type if this is the first upload
        if (!allowedFileType) {
          setAllowedFileType(currentAllowedType)
        }
        
        setUploadedFiles(prev => [...prev, ...validFiles])
      }
      
      event.target.value = '' // Clear input
    }
  }

  const handleFileRemove = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index)
    setUploadedFiles(newFiles)
    
    // If no files left, reset allowed file type
    if (newFiles.length === 0) {
      setAllowedFileType(null)
    }
  }

  const handleRemoveAll = () => {
    setUploadedFiles([])
    setAllowedFileType(null)
    // Clear the file input
    const fileInput = document.getElementById('file-input') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  // Update the readFileAsText function to extract HTML structure:
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const fileType = getFileExtension(file.name)
      
      // Handle .docx files with mammoth.js to preserve structure
      if (fileType === 'docx') {
        const reader = new FileReader()
        
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer
            console.log('Processing DOCX file:', file.name, 'Size:', arrayBuffer.byteLength, 'bytes')
            
            // Extract HTML to preserve structure (tables, headings, etc.)
            const htmlResult = await mammoth.convertToHtml({ arrayBuffer }, {
              styleMap: [
                // Map Word styles to HTML/CSS
                "p[style-name='Title'] => h1",
                "p[style-name='Heading 1'] => h1",
                "p[style-name='Heading 2'] => h2", 
                "p[style-name='Heading 3'] => h3",
                "p[style-name='Heading 4'] => h4",
                "r[style-name='Strong'] => strong",
                "r[style-name='Emphasis'] => em",
                // Enhanced table mapping
                "table => table.docx-table",
                "tr => tr",
                "td => td",
                "th => th"
              ],
              includeDefaultStyleMap: true,
              includeEmbeddedStyleMap: true,
              convertImage: mammoth.images.imgElement(function(image) {
                // Convert images to base64 or placeholder
                return image.read("base64").then(function(imageBuffer) {
                  return {
                    src: "data:" + image.contentType + ";base64," + imageBuffer
                  }
                })
              })
            })
            
            console.log('Mammoth HTML extraction result:', {
              hasValue: !!htmlResult.value,
              valueLength: htmlResult.value?.length || 0,
              valuePreview: htmlResult.value?.substring(0, 300),
              messagesCount: htmlResult.messages?.length || 0
            })
            
            if (htmlResult.value && htmlResult.value.trim()) {
              console.log('Successfully extracted structured HTML from DOCX:', file.name)
              
              // Create a structured content object
              const structuredContent = {
                type: 'html',
                content: htmlResult.value,
                hasStructure: true
              }
              
              console.log('Resolving with HTML content:', JSON.stringify(structuredContent).substring(0, 200))
              resolve(JSON.stringify(structuredContent))
            } else {
              console.warn('HTML extraction returned empty result, trying raw text extraction')
              
              // Fallback to raw text if HTML extraction fails
              const textResult = await mammoth.extractRawText({ arrayBuffer })
              console.log('Raw text extraction result:', {
                hasValue: !!textResult.value,
                valueLength: textResult.value?.length || 0,
                valuePreview: textResult.value?.substring(0, 300)
              })
              
              if (textResult.value && textResult.value.trim()) {
                const structuredContent = {
                  type: 'text',
                  content: textResult.value,
                  hasStructure: false
                }
                console.log('Resolving with text content:', textResult.value.substring(0, 100))
                resolve(JSON.stringify(structuredContent))
              } else {
                console.error('Both HTML and text extraction failed for:', file.name)
                resolve(JSON.stringify({
                  type: 'error',
                  content: `DOCX Document: ${file.name}
File Size: ${(file.size / 1024).toFixed(2)} KB
Status: Content extraction failed

Possible reasons:
- Document contains only images or graphics
- Document is password protected
- Document has complex formatting that couldn't be extracted
- Document file may be corrupted

The document was uploaded successfully but no readable content was found.`,
                  hasStructure: false
                }))
              }
            }
            
            // Log any warnings from mammoth
            if (htmlResult.messages && htmlResult.messages.length > 0) {
              console.warn('Mammoth conversion warnings:', htmlResult.messages)
            }
          } catch (error) {
            console.error('Error extracting DOCX content:', error)
            resolve(JSON.stringify({
              type: 'error',
              content: `Error extracting content from DOCX file: ${file.name}
Error Details: ${(error as Error).message}
File Size: ${(file.size / 1024).toFixed(2)} KB

This might happen if:
- The file is corrupted
- The file uses unsupported DOCX features
- The file is password protected
- There are permission issues

Please try re-uploading the file or use a different format.`,
              hasStructure: false
            }))
          }
        }
        
        reader.onerror = () => {
          console.error('FileReader error for DOCX file:', file.name)
          reject(new Error("Failed to read DOCX file"))
        }
        
        // Read as ArrayBuffer for mammoth.js
        reader.readAsArrayBuffer(file)
      }
      // Handle legacy .doc files (mammoth doesn't support these)
      else if (fileType === 'doc') {
        resolve(JSON.stringify({
          type: 'text',
          content: `Legacy DOC Document: ${file.name}
File Type: Microsoft Word 97-2003 Document (.doc)
File Size: ${(file.size / 1024).toFixed(2)} KB
Last Modified: ${new Date(file.lastModified).toLocaleString()}
Status: Successfully uploaded

⚠️ Important Note:
Legacy .DOC files use an older binary format that requires specialized server-side processing.

Mammoth.js (used for .DOCX files) does not support .DOC files.

For .DOC file processing, you would need:
- Server-side libraries like: antiword, textract, unoconv, or LibreOffice
- Cloud services like: Microsoft Graph API, Google Docs API
- Or convert the file to .DOCX format first

Recommendation: Please save this file as .DOCX format in Microsoft Word and re-upload for better text extraction.`,
          hasStructure: false
        }))
      }
      // Handle PDF files
      else if (fileType === 'pdf') {
        resolve(JSON.stringify({
          type: 'text',
          content: `PDF Document: ${file.name}
File Size: ${(file.size / 1024).toFixed(2)} KB
Last Modified: ${new Date(file.lastModified).toLocaleString()}
Status: Successfully uploaded

📄 PDF Processing Note:
PDF text extraction requires specialized libraries such as:
- Client-side: PDF.js, pdf-lib
- Server-side: pdf-parse, PDFtk, Apache PDFBox
- Cloud APIs: Adobe PDF Services, Google Cloud Document AI

The PDF file has been uploaded successfully and is ready for server-side processing.`,
          hasStructure: false
        }))
      }
      else {
        // For text-based files (JSON, TXT, CSV, XML), read normally
        const reader = new FileReader()
        
        reader.onload = (e) => {
          const result = e.target?.result as string
          resolve(JSON.stringify({
            type: 'text',
            content: result,
            hasStructure: false
          }))
        }
        
        reader.onerror = () => {
          reject(new Error(`Failed to read ${fileType.toUpperCase()} file`))
        }
        
        // Read as text with UTF-8 encoding
        reader.readAsText(file, 'UTF-8')
      }
    })
  }

  const handleProcess = () => {
    if (uploadedFiles.length === 0) {
      alert('Please upload at least one file first')
      return
    }

    // Show processing state immediately
    setIsProcessing(true)

    // Convert File objects to a format we can store and reconstruct
    const filePromises = uploadedFiles.map(async (file, index) => {
      try {
        console.log(`Processing file ${index + 1}/${uploadedFiles.length}: ${file.name}`)
        const content = await readFileAsText(file)
        
        return {
          name: file.name,
          size: file.size,
          type: getFileExtension(file.name),
          content: content, // Store the actual file content
          lastModified: file.lastModified
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error)
        
        // Return error information instead of failing completely
        return {
          name: file.name,
          size: file.size,
          type: getFileExtension(file.name),
          content: `Error processing file: ${file.name}
Error: ${(error as Error).message}
File Size: ${(file.size / 1024).toFixed(2)} KB

The file could not be processed. Please try:
1. Re-uploading the file
2. Checking if the file is corrupted
3. Converting to a different format if possible`,
          lastModified: file.lastModified
        }
      }
    })

    Promise.all(filePromises).then((filesWithContent) => {
      // Store processing data with file content
      const processingData = {
        files: filesWithContent,
        fileCount: uploadedFiles.length,
        totalSize: uploadedFiles.reduce((sum, file) => sum + file.size, 0),
        complianceMode,
        encryptionMethod
      }

      sessionStorage.setItem('processingData', JSON.stringify(processingData))

      // Navigate to process page after a delay
      setTimeout(() => {
        setIsProcessing(false)
        router.push('/process')
      }, 3000) // Reduced to 3 seconds since we're actually processing files now
    }).catch((error) => {
      console.error('Error reading files:', error)
      setIsProcessing(false)
      alert(`Error processing files: ${error.message}\n\nPlease try uploading the files again.`)
    })
  }

  const getTotalSize = () => {
    return uploadedFiles.reduce((sum, file) => sum + file.size, 0)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const complianceOptions = [
    { value: "gdpr", label: "GDPR", desc: "General Data Protection Regulation (EU)" },
    { value: "hipaa", label: "HIPAA", desc: "Health Insurance Portability Act (US)" },
    { value: "dpdp", label: "DPDP", desc: "Digital Personal Data Protection (India)" },
    { value: "ccpa", label: "CCPA", desc: "California Consumer Privacy Act" }
  ]

  const encryptionOptions = [
    { value: "aes256", label: "AES-256", desc: "Advanced Encryption Standard (256-bit)" },
    { value: "aes128", label: "AES-128", desc: "Advanced Encryption Standard (128-bit)" },
    { value: "rsa2048", label: "RSA-2048", desc: "Rivest-Shamir-Adleman (2048-bit)" },
    { value: "chacha20", label: "ChaCha20", desc: "Stream cipher by Daniel J. Bernstein" }
  ]

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
        
        {/* Loading Overlay */}
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
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full mx-4"
              >
                <div className="text-center space-y-6">
                  {/* CSS Spinner Animation */}
                  <div className="flex justify-center">
                    <div className="w-16 h-16 relative">
                      <motion.div
                        className="absolute inset-0 border-4 border-blue-200 rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      <motion.div
                        className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      <div className="absolute inset-2 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                      Processing Documents
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Analyzing and redacting sensitive information from {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}...
                    </p>
                  </div>

                  {/* Progress indicator */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <motion.div
                      className="bg-blue-600 h-2 rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 5, ease: "linear" }}
                    />
                  </div>
                  
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    This may take a few moments...
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="container mx-auto px-4 py-8 max-w-6xl">
          
          {/* Header with Logo */}
          <motion.div 
            className="flex items-center justify-between p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg mb-8 border border-gray-100 dark:border-gray-700"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center space-x-4">
              <motion.div 
                className="w-16 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold shadow-lg"
                whileHover={{ scale: 1.05, rotate: 2 }}
                transition={{ duration: 0.2 }}
              >
                <Shield className="w-8 h-8" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                  Data Privacy Redaction Tool
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Secure • Compliant • Intelligent
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950">
              AI-Powered
            </Badge>
          </motion.div>

          {/* Main Content Area */}
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Left Column - Upload */}
                <div className="space-y-6">
                  {/* File Type Restriction Info */}
                  {allowedFileType && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="text-blue-600 dark:text-blue-400">ℹ️</div>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            Only <span className="font-semibold">{allowedFileType.toUpperCase()}</span> files allowed
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveAll}
                          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  <motion.div 
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer group"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => document.getElementById('file-input')?.click()}
                  >
                    <div className="space-y-4">
                      <motion.div 
                        className="text-5xl group-hover:scale-110 transition-transform duration-200"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.4 }}
                      >
                        {uploadedFiles.length > 0 ? '📁' : '📄'}
                      </motion.div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          {uploadedFiles.length > 0 ? 'Add More Documents' : 'Upload Documents'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          {allowedFileType 
                            ? `Drop your ${allowedFileType.toUpperCase()} files here or click to browse`
                            : "Drop your files here or click to browse (multiple files supported)"
                          }
                        </p>
                      </div>
                      <input
                        id="file-input"
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        accept={allowedFileType ? `.${allowedFileType}` : ".pdf,.doc,.docx,.txt,.json"}
                        disabled={isProcessing}
                        multiple
                      />
                      <Button variant="outline" className="pointer-events-none">
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadedFiles.length > 0 ? 'Add Files' : 'Choose Files'}
                      </Button>
                    </div>
                  </motion.div>

                  {/* Files List */}
                  {uploadedFiles.length > 0 && (
                    <motion.div
                      className="space-y-3 max-h-64 overflow-y-auto"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                          Uploaded Files ({uploadedFiles.length})
                        </h4>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Total: {formatFileSize(getTotalSize())}
                        </div>
                      </div>
                      
                      {uploadedFiles.map((file, index) => (
                        <motion.div
                          key={`${file.name}-${index}`}
                          className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="text-lg">
                                {getFileIcon(file.name)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-green-800 dark:text-green-200 truncate">
                                  {file.name}
                                </p>
                                <div className="flex items-center space-x-4 text-sm text-green-600 dark:text-green-400">
                                  <span>{formatFileSize(file.size)}</span>
                                  <Badge variant="secondary" className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                                    {getFileExtension(file.name).toUpperCase()}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFileRemove(index)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                              disabled={isProcessing}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}

                  {/* Process Button */}
                  <motion.div
                    whileHover={{ scale: isProcessing ? 1 : 1.02 }}
                    whileTap={{ scale: isProcessing ? 1 : 0.98 }}
                  >
                    <Button
                      onClick={handleProcess}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={uploadedFiles.length === 0 || isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 mr-2"
                          >
                            ⚙️
                          </motion.div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5 mr-2" />
                          Process {uploadedFiles.length} Document{uploadedFiles.length !== 1 ? 's' : ''}
                        </>
                      )}
                    </Button>
                  </motion.div>
                </div>

                {/* Right Column - Options */}
                <div className="space-y-6">
                  
                  {/* Option 1 - Compliance Mode */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <Card className="border border-gray-200 dark:border-gray-700">
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                            Compliance Mode
                          </h3>
                        </div>
                        <select
                          value={complianceMode}
                          onChange={(e) => setComplianceMode(e.target.value)}
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          disabled={isProcessing}
                        >
                          {complianceOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label} - {option.desc}
                            </option>
                          ))}
                        </select>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Option 2 - Encryption Method */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <Card className="border border-gray-200 dark:border-gray-700">
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                            Encryption Method
                          </h3>
                        </div>
                        <select
                          value={encryptionMethod}
                          onChange={(e) => setEncryptionMethod(e.target.value)}
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                          disabled={isProcessing}
                        >
                          {encryptionOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label} - {option.desc}
                            </option>
                          ))}
                        </select>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Settings Summary */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                  >
                    <Card className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                      <CardContent className="p-4">
                        <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3 text-sm">
                          Current Configuration:
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Compliance:</span>
                            <Badge variant="secondary" className="text-xs">
                              {complianceOptions.find(opt => opt.value === complianceMode)?.label}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Encryption:</span>
                            <Badge variant="secondary" className="text-xs">
                              {encryptionOptions.find(opt => opt.value === encryptionMethod)?.label}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">File Type:</span>
                            <Badge variant="outline" className="text-xs">
                              {allowedFileType ? allowedFileType.toUpperCase() : "Any"}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Files Count:</span>
                            <Badge variant="outline" className="text-xs">
                              {uploadedFiles.length}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Status:</span>
                            <Badge variant={uploadedFiles.length > 0 ? "default" : "outline"} className="text-xs">
                              {isProcessing ? "Processing..." : uploadedFiles.length > 0 ? "Ready" : "Waiting for files"}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </ThemeProvider>
  )
}

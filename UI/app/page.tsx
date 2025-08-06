"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { motion, AnimatePresence } from "framer-motion"
import { Shield, Upload, Settings, Zap, X, File as FileIcon, FileText, FileImage, Plus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import JSZip from 'jszip'

export default function DataPrivacyRedactionTool() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [allowedFileType, setAllowedFileType] = useState<string | null>(null)
  const [complianceMode, setComplianceMode] = useState("1")
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
      
      if (!currentAllowedType && files.length > 0) {
        currentAllowedType = getFileExtension(files[0].name)
      }
      
      const invalidFiles: string[] = []
      const validFiles: File[] = []
      
      for (const file of files) {
        const fileExtension = getFileExtension(file.name)
        
        if (!allowedFileType && validFiles.length === 0) {
          currentAllowedType = fileExtension
          validFiles.push(file)
        } 
        else if (fileExtension === currentAllowedType) {
          const fileExists = uploadedFiles.some(existingFile => 
            existingFile.name === file.name && existingFile.size === file.size
          )
          
          if (!fileExists) {
            validFiles.push(file)
          }
        } 
        else {
          invalidFiles.push(`${file.name} (${fileExtension.toUpperCase()})`)
        }
      }
      
      if (invalidFiles.length > 0) {
        const allowedTypeText = currentAllowedType ? currentAllowedType.toUpperCase() : 'the selected type'
        alert(`Invalid file types detected!\n\nOnly ${allowedTypeText} files are allowed.\n\nRejected files:\n${invalidFiles.join('\n')}\n\nPlease select only ${allowedTypeText} files or remove current files to upload a different type.`)
        event.target.value = ''
        return
      }
      
      if (validFiles.length > 0) {
        if (!allowedFileType) {
          setAllowedFileType(currentAllowedType)
        }
        
        setUploadedFiles(prev => [...prev, ...validFiles])
      }
      
      event.target.value = ''
    }
  }

  const handleFileRemove = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index)
    setUploadedFiles(newFiles)
    
    if (newFiles.length === 0) {
      setAllowedFileType(null)
    }
  }

  const handleRemoveAll = () => {
    setUploadedFiles([])
    setAllowedFileType(null)
    const fileInput = document.getElementById('file-input') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  // Update the readFileAsText function in page.tsx:

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      const fileType = getFileExtension(file.name)
      
      // Handle .docx files with mammoth.js
      if (fileType === 'docx') {
        try {
          console.log('Processing DOCX file with mammoth.js:', file.name, 'Size:', file.size, 'bytes')
          
          // Import mammoth dynamically
          const mammoth = await import('mammoth')
          
          // Convert DOCX to HTML using mammoth
          const arrayBuffer = await file.arrayBuffer()
          const { value: htmlContent, messages } = await mammoth.convertToHtml({ 
            arrayBuffer,
            options: {
              styleMap: [
                "p[style-name='Heading 1'] => h1:fresh",
                "p[style-name='Heading 2'] => h2:fresh", 
                "p[style-name='Heading 3'] => h3:fresh",
                "p[style-name='Title'] => h1.title:fresh",
                "p[style-name='Subtitle'] => h2.subtitle:fresh",
                "r[style-name='Strong'] => strong",
                "r[style-name='Emphasis'] => em"
              ],
              includeDefaultStyleMap: true
            }
          })
          
          if (messages.length > 0) {
            console.log('Mammoth conversion messages:', messages)
          }
          
          if (htmlContent && htmlContent.trim()) {
            // Extract plain text from HTML for text processing
            const plainText = htmlContent
              .replace(/<[^>]+>/g, ' ') // Remove HTML tags
              .replace(/\s+/g, ' ') // Normalize whitespace
              .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
              .replace(/&amp;/g, '&') // Decode HTML entities
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .trim()
            
            const structuredContent = {
              type: 'html',
              content: plainText, // Plain text for processing
              htmlContent: htmlContent, // HTML for display
              textContent: plainText, // Text version
              hasStructure: true,
              fileName: file.name,
              fileSize: file.size,
              wordCount: plainText.split(/\s+/).length,
              processingMethod: 'mammoth.js'
            }
            
            console.log('Successfully processed DOCX with mammoth.js:', {
              htmlLength: htmlContent.length,
              textLength: plainText.length,
              wordCount: structuredContent.wordCount
            })
            
            resolve(JSON.stringify(structuredContent))
          } else {
            throw new Error('Mammoth conversion returned empty content')
          }
          
        } catch (error) {
          console.error('Error processing DOCX with mammoth.js:', error)
          resolve(JSON.stringify({
            type: 'error',
            content: `Error processing DOCX file: ${file.name}
Error Details: ${(error as Error).message}
File Size: ${(file.size / 1024).toFixed(2)} KB

Processing Method: mammoth.js
Error Type: ${error.constructor.name}

This might happen if:
- The file is corrupted or incomplete
- The file uses unsupported DOCX features  
- The file is password protected
- There are memory/processing limitations

Troubleshooting:
1. Verify the file opens correctly in Microsoft Word
2. Try saving as a new .docx file
3. Remove any complex formatting or embedded objects
4. Ensure the file is not password protected
5. Try converting to .txt format first`,
            hasStructure: false,
            fileName: file.name,
            fileSize: file.size,
            processingMethod: 'mammoth.js-error'
          }))
        }
      }
      // Handle legacy .doc files
      else if (fileType === 'doc') {
        resolve(JSON.stringify({
          type: 'text',
          content: `Legacy DOC Document: ${file.name}
File Type: Microsoft Word 97-2003 Document (.doc)
File Size: ${(file.size / 1024).toFixed(2)} KB
Last Modified: ${new Date(file.lastModified).toLocaleString()}
Status: Successfully uploaded

⚠️ Important Note:
Legacy .DOC files require server-side processing.
Mammoth.js only supports .DOCX files.

Recommendation: Please save this file as .DOCX format in Microsoft Word and re-upload.`,
          hasStructure: false,
          fileName: file.name,
          fileSize: file.size
        }))
      }
      // Handle PDF files
      else if (fileType === 'pdf') {
        resolve(JSON.stringify({
          type: 'pdf',
          content: `PDF Document: ${file.name}
File Size: ${(file.size / 1024).toFixed(2)} KB
Last Modified: ${new Date(file.lastModified).toLocaleString()}
Status: Successfully uploaded

📄 PDF Processing Note:
PDF files will be processed using PDF.js for rendering and text extraction.

The PDF file has been uploaded successfully and is ready for server-side processing.
Text extraction and redaction will be handled by the backend processing pipeline.`,
          hasStructure: false,
          fileName: file.name,
          fileSize: file.size
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
            hasStructure: false,
            fileName: file.name,
            fileSize: file.size
          }))
        }
        
        reader.onerror = () => {
          reject(new Error(`Failed to read ${fileType.toUpperCase()} file`))
        }
        
        reader.readAsText(file, 'UTF-8')
      }
    })
  }

  const handleProcess = async () => {
    if (uploadedFiles.length === 0) {
      alert('Please upload at least one file first')
      return
    }

    setIsProcessing(true)

    try {
      const isSingleFile = uploadedFiles.length === 1
      const apiUrl = isSingleFile 
        ? "https://mfktdwch-8000.inc1.devtunnels.ms/redact/single"
        : "https://mfktdwch-8000.inc1.devtunnels.ms/redact/multiple"

      const formData = new FormData()

      if (isSingleFile) {
        formData.append('file', uploadedFiles[0])
        console.log('Single file details:', {
          name: uploadedFiles[0].name,
          size: uploadedFiles[0].size,
          type: uploadedFiles[0].type,
          lastModified: uploadedFiles[0].lastModified
        })
      } else {
        uploadedFiles.forEach((file, index) => {
          formData.append('files', file)
          console.log(`File ${index} details:`, {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
          })
        })
      }

      formData.append('complianceNum', complianceMode)

      console.log(`Calling ${isSingleFile ? 'single' : 'multiple'} file API:`, apiUrl)
      console.log('Files count:', uploadedFiles.length)
      console.log('Compliance mode:', complianceMode, 'type:', typeof complianceMode)

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      })

      console.log('Response status:', response.status)
      console.log('Response statusText:', response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', errorText)
        throw new Error(`API call failed: ${response.status} ${response.statusText}. Details: ${errorText}`)
      }

      const contentType = response.headers.get('content-type')
      console.log('Response content type:', contentType)

      let processedFiles = []

      try {
        if (contentType && contentType.includes('application/zip')) {
          console.log('Processing zip response')
          const zipBlob = await response.blob()
          console.log('Received zip blob, size:', zipBlob.size)
          processedFiles = await extractFilesFromZip(zipBlob)
        } else if (contentType && contentType.includes('application/json')) {
          console.log('Processing JSON response')
          const jsonData = await response.json()
          processedFiles = await convertJsonToFiles(jsonData)
        } else {
          console.log('Processing unknown response type, attempting JSON parse')
          const responseText = await response.text()
          console.log('Raw response text length:', responseText.length)
          console.log('Raw response preview:', responseText.substring(0, 200))
          
          try {
            const jsonData = JSON.parse(responseText)
            processedFiles = await convertJsonToFiles(jsonData)
          } catch (parseError) {
            console.error('Failed to parse response as JSON:', parseError)
            processedFiles = [{
              name: 'response.txt',
              content: responseText,
              size: responseText.length,
              type: 'txt',
              isProcessed: true
            }]
          }
        }
      } catch (processingError) {
        console.error('Error processing response:', processingError)
        throw new Error(`Failed to process server response: ${(processingError as Error).message}`)
      }

      console.log('Processed files:', processedFiles)

      const processingData = {
        files: processedFiles.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          content: file.content,
          lastModified: file.file?.lastModified || Date.now(),
          hasFileObject: !!(file.file instanceof File)
        })),
        originalFiles: uploadedFiles.map(file => ({
          name: file.name,
          size: file.size,
          type: getFileExtension(file.name),
          lastModified: file.lastModified
        })),
        processedFiles: processedFiles.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          content: file.content,
          isProcessed: true,
          fileData: file.file instanceof File ? null : null,
          lastModified: file.file?.lastModified || Date.now()
        })),
        fileCount: uploadedFiles.length,
        totalSize: uploadedFiles.reduce((sum, file) => sum + file.size, 0),
        complianceMode,
        encryptionMethod,
        processedAt: new Date().toISOString()
      }

      console.log('About to store processing data:')
      console.log('Processed files structure:', processedFiles.map(f => ({
        name: f.name,
        hasFile: !!(f.file instanceof File),
        fileType: f.file?.constructor.name,
        fileSize: f.file?.size,
        contentLength: f.content?.length
      })))

      sessionStorage.setItem('processingData', JSON.stringify(processingData))

      const storeFileObjects = async () => {
        const filePromises = processedFiles.map(async (file, index) => {
          if (file.file instanceof File) {
            try {
              const arrayBuffer = await file.file.arrayBuffer()
              const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
              
              return {
                name: file.name,
                base64Data: base64,
                type: file.file.type,
                size: file.file.size,
                lastModified: file.file.lastModified
              }
            } catch (error) {
              console.error('Error converting file to base64:', error)
              return null
            }
          }
          return null
        })

        const fileDataArray = await Promise.all(filePromises)
        const validFileData = fileDataArray.filter(data => data !== null)
        
        if (validFileData.length > 0) {
          sessionStorage.setItem('fileObjects', JSON.stringify(validFileData))
        }
      }

      await storeFileObjects()

      setTimeout(() => {
        setIsProcessing(false)
        router.push('/process')
      }, 1500)

    } catch (error) {
      console.error('Error processing files:', error)
      setIsProcessing(false)
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Error processing files: ${errorMessage}\n\nPlease check your connection and try again.`)
    }
  }

  // Helper function to extract files from zip blob - FIXED
  const extractFilesFromZip = async (zipBlob: Blob): Promise<any[]> => {
    try {
      console.log('Extracting files from zip blob, size:', zipBlob.size)
      
      const zip = new JSZip()
      const loadedZip = await zip.loadAsync(zipBlob)
      const files = []

      console.log('Zip loaded successfully, files found:', Object.keys(loadedZip.files).length)

      for (const [filename, file] of Object.entries(loadedZip.files)) {
        if (!file.dir) {
          console.log('Processing file from zip:', filename)
          
          try {
            const content = await file.async('blob')
            
            const processedFile = new window.File([content], filename, {
              type: getFileTypeFromExtension(filename),
              lastModified: Date.now()
            })
            
            files.push({
              name: filename,
              file: processedFile,
              size: content.size,
              type: getFileExtension(filename),
              isProcessed: true,
              content: await file.async('text')
            })
            
            console.log('Successfully processed file:', filename, 'size:', content.size)
          } catch (fileError) {
            console.error('Error processing individual file:', filename, fileError)
          }
        }
      }

      console.log('Successfully extracted', files.length, 'files from zip')
      return files
    } catch (error) {
      console.error('Error extracting zip file:', error)
      throw new Error(`Failed to extract files from zip: ${(error as Error).message}`)
    }
  }

  // Helper function to convert JSON data to files
  const convertJsonToFiles = async (jsonData: any): Promise<any[]> => {
    try {
      console.log('Converting JSON data to files:', jsonData)
      const files = []

      if (jsonData.files && Array.isArray(jsonData.files)) {
        console.log('Processing multiple files from JSON')
        for (const fileData of jsonData.files) {
          const file = await createFileFromData(fileData)
          files.push(file)
        }
      } else if (jsonData.content || jsonData.file_content || jsonData.redacted_content) {
        console.log('Processing single file from JSON')
        const file = await createFileFromData(jsonData)
        files.push(file)
      } else if (jsonData.redacted_files && Array.isArray(jsonData.redacted_files)) {
        console.log('Processing redacted files from JSON')
        for (const fileData of jsonData.redacted_files) {
          const file = await createFileFromData(fileData)
          files.push(file)
        }
      } else if (jsonData.result && Array.isArray(jsonData.result)) {
        console.log('Processing result array from JSON')
        for (const fileData of jsonData.result) {
          const file = await createFileFromData(fileData)
          files.push(file)
        }
      } else {
        console.log('Unknown JSON structure, treating as single file')
        const file = await createFileFromData({
          filename: 'response.json',
          content: JSON.stringify(jsonData, null, 2),
          type: 'json'
        })
        files.push(file)
      }

      console.log('Successfully converted JSON to', files.length, 'files')
      return files
    } catch (error) {
      console.error('Error converting JSON to files:', error)
      throw new Error(`Failed to convert JSON data to files: ${(error as Error).message}`)
    }
  }

  // Helper function to create a File object from data - FIXED
  const createFileFromData = async (fileData: any): Promise<any> => {
    try {
      let content = fileData.content || fileData.file_content || fileData.redacted_content || fileData.data
      let filename = fileData.filename || fileData.name || fileData.file_name || 'processed_file.txt'
      
      console.log('Creating file from data:', { filename, hasContent: !!content, contentType: typeof content })

      let fileBlob: Blob
      let textContent = ''

      if (fileData.encoding === 'base64' || (typeof content === 'string' && content.includes('base64'))) {
        console.log('Processing base64 content for:', filename)
        const base64Data = content.replace(/^data:.*;base64,/, '')
        try {
          const binaryString = atob(base64Data)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          
          const mimeType = filename.toLowerCase().endsWith('.pdf') 
            ? 'application/pdf' 
            : getFileTypeFromExtension(filename)
          
          fileBlob = new Blob([bytes], { type: mimeType })
          
          if (filename.toLowerCase().endsWith('.pdf')) {
            textContent = 'PDF content - use PDF preview mode to view the document'
          } else {
            try {
              textContent = new TextDecoder().decode(bytes)
            } catch (decodeError) {
              textContent = 'Binary content - preview not available'
            }
          }
        } catch (base64Error) {
          console.error('Error decoding base64:', base64Error)
          fileBlob = new Blob([content], { type: 'text/plain' })
          textContent = content
        }
      } else if (typeof content === 'object' && content !== null) {
        console.log('Processing object content for:', filename)
        const jsonContent = JSON.stringify(content, null, 2)
        fileBlob = new Blob([jsonContent], { type: 'application/json' })
        textContent = jsonContent
        if (!filename.endsWith('.json')) {
          filename = filename.replace(/\.[^/.]+$/, '') + '.json'
        }
      } else if (typeof content === 'string') {
        console.log('Processing string content for:', filename)
        if (filename.toLowerCase().endsWith('.pdf')) {
          fileBlob = new Blob([content], { type: 'text/plain' })
          textContent = content
        } else {
          fileBlob = new Blob([content], { type: 'text/plain' })
          textContent = content
        }
      } else if (content instanceof Blob) {
        console.log('Content is already a Blob for:', filename)
        fileBlob = content
        try {
          textContent = await content.text()
        } catch (textError) {
          textContent = 'Binary content - preview not available'
        }
      } else {
        console.log('Unknown content type, using fallback for:', filename)
        const fallbackContent = String(content || 'No content available')
        fileBlob = new Blob([fallbackContent], { type: 'text/plain' })
        textContent = fallbackContent
      }

      const file = new window.File([fileBlob], filename, {
        type: fileBlob.type,
        lastModified: Date.now()
      })

      const result = {
        name: filename,
        file: file,
        size: file.size,
        type: getFileExtension(filename),
        isProcessed: true,
        content: textContent,
        originalData: fileData
      }

      console.log('Successfully created file:', result.name, 'size:', result.size, 'type:', file.type)
      return result
    } catch (error) {
      console.error('Error creating file from data:', error)
      throw new Error(`Failed to create file: ${(error as Error).message}`)
    }
  }

  // Helper function to get MIME type from file extension
  const getFileTypeFromExtension = (filename: string): string => {
    const extension = getFileExtension(filename)
    const mimeTypes: { [key: string]: string } = {
      'txt': 'text/plain',
      'json': 'application/json',
      'csv': 'text/csv',
      'xml': 'application/xml',
      'html': 'text/html',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg'
    }
    return mimeTypes[extension] || 'application/octet-stream'
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
    { value: 1, label: "GDPR", desc: "General Data Protection Regulation (EU)" },
    { value: 2, label: "HIPAA", desc: "Health Insurance Portability Act (US)" },
    { value: 3, label: "DPDP", desc: "Digital Personal Data Protection (India)" },
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

"use client"

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, FileText, Eye, ChevronDown, Edit3, Save, Undo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.js',
      import.meta.url
    ).toString()
  } catch (error) {
    console.log('Fallback to CDN worker due to:', error)
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  }
}

interface RedactionArea {
  id: string
  x: number
  y: number
  width: number
  height: number
  page: number
  text?: string
}

// Enhanced PDF Viewer with Text Selection and Redaction
const PDFViewer: React.FC<{ file: any, fileName: string }> = ({ file, fileName }) => {
  const [pdf, setPdf] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.5)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [redactionMode, setRedactionMode] = useState(false)
  const [manualRedactionMode, setManualRedactionMode] = useState(false);
  const [redactionAreas, setRedactionAreas] = useState<RedactionArea[]>([])
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{ x: number, y: number } | null>(null)
  const [currentSelection, setCurrentSelection] = useState<RedactionArea | null>(null)
  const [textItems, setTextItems] = useState<any[]>([])
  const [selectedTextItems, setSelectedTextItems] = useState<Set<number>>(new Set())
  const [isRendering, setIsRendering] = useState(false)
  const [redactedTextContent, setRedactedTextContent] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const renderTaskRef = useRef<any>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const loadPDF = useCallback(async () => {
    setLoading(true)
    setError('')
    
    try {
      console.log('Loading PDF for redaction:', fileName)
      
      // Cancel any ongoing operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()
      
      let pdfData: ArrayBuffer
      
      if (file instanceof File || file instanceof Blob) {
        pdfData = await file.arrayBuffer()
      } else if (typeof file === 'string') {
        // Handle base64 data
        const base64Data = file.includes(',') ? file.split(',')[1] : file
        const binaryString = atob(base64Data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        pdfData = bytes.buffer
      } else {
        throw new Error('Unsupported file format for PDF redaction')
      }

      const loadingTask = pdfjsLib.getDocument({ 
        data: pdfData,
        // Add options to prevent canvas conflicts
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/'
      })
      
      const pdfDoc = await loadingTask.promise
      
      if (abortControllerRef.current?.signal.aborted) {
        return
      }
      
      setPdf(pdfDoc)
      setTotalPages(pdfDoc.numPages)
      setCurrentPage(1)
      
      console.log('PDF loaded successfully for redaction:', {
        pages: pdfDoc.numPages,
        fileName: fileName
      })
      
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) {
        return
      }
      console.error('Error loading PDF for redaction:', err)
      setError(`Failed to load PDF: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }, [file, fileName])

  const renderPage = useCallback(async (pageNumber: number) => {
    if (!pdf || !canvasRef.current || !textLayerRef.current || !overlayRef.current || isRendering) {
      return
    }

    // Cancel any ongoing render task
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel()
        await new Promise(resolve => setTimeout(resolve, 50))
      } catch (e) {
        console.log('Render task cancellation:', e)
      }
    }

    setIsRendering(true)
    
    try {
      console.log('Rendering page:', pageNumber)
      
      const page = await pdf.getPage(pageNumber)
      const viewport = page.getViewport({ scale })
      
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      const textLayer = textLayerRef.current
      const overlay = overlayRef.current
      
      // Clear any existing content first
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height)
      }
      textLayer.innerHTML = ''
      overlay.innerHTML = ''
      
      // Set canvas dimensions
      canvas.height = viewport.height
      canvas.width = viewport.width
      
      // Set text layer dimensions
      textLayer.style.width = `${viewport.width}px`
      textLayer.style.height = `${viewport.height}px`
      
      // Set overlay dimensions
      overlay.style.width = `${viewport.width}px`
      overlay.style.height = `${viewport.height}px`
      
      // Render PDF page on canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      }
      
      renderTaskRef.current = page.render(renderContext)
      await renderTaskRef.current.promise
      
      console.log('Canvas render completed for page:', pageNumber)
      renderTaskRef.current = null
      
      // Get text content for selection
      const textContent = await page.getTextContent()
      const textItems = textContent.items as any[]
      setTextItems(textItems)
      
      console.log('Text content loaded, items:', textItems.length)
      
      // Create interactive text layer for selection
      textItems.forEach((item: any, index: number) => {
        const textDiv = document.createElement('div')
        
        // Position and size
        textDiv.style.position = 'absolute'
        textDiv.style.left = `${item.transform[4]}px`
        textDiv.style.top = `${viewport.height - item.transform[5] - item.height}px`
        textDiv.style.width = `${item.width || 100}px`
        textDiv.style.height = `${item.height}px`
        textDiv.style.fontSize = `${item.height}px`
        textDiv.style.fontFamily = item.fontName || 'sans-serif'
        
        // Make text visible in redaction mode, invisible in view mode
        if (redactionMode) {
          textDiv.style.backgroundColor = selectedTextItems.has(index) ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 0, 0, 0.1)'
          textDiv.style.color = selectedTextItems.has(index) ? 'white' : 'rgba(255, 0, 0, 0.7)'
          textDiv.style.border = '1px solid rgba(255, 0, 0, 0.3)'
          textDiv.style.cursor = 'pointer'
          textDiv.style.pointerEvents = 'auto'
        } else {
          textDiv.style.color = 'transparent'
          textDiv.style.backgroundColor = 'transparent'
          textDiv.style.cursor = 'text'
          textDiv.style.pointerEvents = 'auto'
        }
        
        // Text properties
        textDiv.style.whiteSpace = 'nowrap'
        textDiv.style.transformOrigin = '0% 0%'
        textDiv.style.userSelect = redactionMode ? 'none' : 'text'
        textDiv.style.overflow = 'hidden'
        textDiv.style.zIndex = '1'
        
        // Content
        textDiv.textContent = item.str
        textDiv.dataset.index = index.toString()
        textDiv.dataset.text = item.str
        textDiv.title = redactionMode ? `Click to select: "${item.str}"` : item.str
        
        // Event handlers for redaction mode
        if (redactionMode) {
          // Click handler
          textDiv.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            console.log('Text clicked:', item.str, 'Index:', index)
            toggleTextSelection(index, item)
          })
          
          // Hover effects
          textDiv.addEventListener('mouseenter', () => {
            if (!selectedTextItems.has(index)) {
              textDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.3)'
              textDiv.style.color = 'rgba(255, 0, 0, 0.9)'
              textDiv.style.border = '1px solid rgba(255, 0, 0, 0.6)'
            }
          })
          
          textDiv.addEventListener('mouseleave', () => {
            if (!selectedTextItems.has(index)) {
              textDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.1)'
              textDiv.style.color = 'rgba(255, 0, 0, 0.7)'
              textDiv.style.border = '1px solid rgba(255, 0, 0, 0.3)'
            }
          })
        }
        
        textLayer.appendChild(textDiv)
      })
      
      console.log('Text layer created with', textItems.length, 'items')
      
      // Render existing redaction areas
      renderRedactionAreas(pageNumber)
      
      console.log('Page render completed:', pageNumber)
      
    } catch (err) {
      if (err?.name === 'RenderingCancelledException' || err?.message?.includes('cancelled')) {
        console.log('Render cancelled for page:', pageNumber)
        return
      }
      
      console.error('Error rendering PDF page:', err)
      setError(`Failed to render page ${pageNumber}: ${(err as Error).message}`)
    } finally {
      setIsRendering(false)
      renderTaskRef.current = null
    }
  }, [pdf, scale, redactionMode, selectedTextItems])

  const toggleTextSelection = (index: number, textItem: any) => {
    console.log('Toggle text selection called for index:', index, 'text:', textItem.str)
    
    setSelectedTextItems(prev => {
      const newSelection = new Set(prev)
      const textDiv = textLayerRef.current?.children[index] as HTMLElement
      
      if (newSelection.has(index)) {
        newSelection.delete(index)
        console.log('Deselected text:', textItem.str)
        // Remove visual highlight
        if (textDiv) {
          textDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.1)'
          textDiv.style.color = 'rgba(255, 0, 0, 0.7)'
          textDiv.style.border = '1px solid rgba(255, 0, 0, 0.3)'
        }
      } else {
        newSelection.add(index)
        console.log('Selected text:', textItem.str)
        // Add visual highlight
        if (textDiv) {
          textDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
          textDiv.style.color = 'white'
          textDiv.style.border = '1px solid black'
        }
      }
      
      console.log('Total selected items:', newSelection.size)
      return newSelection
    })
  }

  // Update the text layer when redaction mode changes
  useEffect(() => {
    if (textLayerRef.current && textItems.length > 0) {
      console.log('Updating text layer for redaction mode:', redactionMode)
      
      Array.from(textLayerRef.current.children).forEach((div, index) => {
        const textDiv = div as HTMLElement
        
        if (redactionMode) {
          // Make text visible and clickable in redaction mode
          textDiv.style.backgroundColor = selectedTextItems.has(index) ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 0, 0, 0.1)'
          textDiv.style.color = selectedTextItems.has(index) ? 'white' : 'rgba(255, 0, 0, 0.7)'
          textDiv.style.border = '1px solid rgba(255, 0, 0, 0.3)'
          textDiv.style.cursor = 'pointer'
          textDiv.style.pointerEvents = 'auto'
          textDiv.style.userSelect = 'none'
          textDiv.title = `Click to select: "${textDiv.textContent}"`
        } else {
          // Make text invisible in view mode
          textDiv.style.backgroundColor = 'transparent'
          textDiv.style.color = 'transparent'
          textDiv.style.border = 'none'
          textDiv.style.cursor = 'text'
          textDiv.style.pointerEvents = 'auto'
          textDiv.style.userSelect = 'text'
          textDiv.title = textDiv.textContent || ''
        }
      })
    }
  }, [redactionMode, selectedTextItems, textItems])

  // Enhanced area selection with drag
  const handleMouseDown = (event: React.MouseEvent) => {
    if (!redactionMode || !canvasRef.current) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    setIsSelecting(true)
    setSelectionStart({ x, y })
    
    console.log('Started drag selection at:', x, y)
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isSelecting || !selectionStart || !canvasRef.current) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const currentX = event.clientX - rect.left
    const currentY = event.clientY - rect.top
    
    const width = currentX - selectionStart.x
    const height = currentY - selectionStart.y
    
    setCurrentSelection({
      id: Date.now().toString(),
      x: Math.min(selectionStart.x, currentX),
      y: Math.min(selectionStart.y, currentY),
      width: Math.abs(width),
      height: Math.abs(height),
      page: currentPage
    })
  }

  const handleMouseUp = () => {
    if (!isSelecting || !currentSelection || !textLayerRef.current) return
    
    console.log('Ended drag selection:', currentSelection)
    
    // Find text items within the selection area
    const selectedIndices = new Set<number>()
    
    Array.from(textLayerRef.current.children).forEach((div, index) => {
      const textDiv = div as HTMLElement
      const rect = textDiv.getBoundingClientRect()
      const containerRect = textLayerRef.current!.getBoundingClientRect()
      
      const textX = rect.left - containerRect.left
      const textY = rect.top - containerRect.top
      const textWidth = rect.width
      const textHeight = rect.height
      
      // Check if text item overlaps with selection
      if (textX < currentSelection.x + currentSelection.width &&
          textX + textWidth > currentSelection.x &&
          textY < currentSelection.y + currentSelection.height &&
          textY + textHeight > currentSelection.y) {
        selectedIndices.add(index)
      }
    })
    
    if (selectedIndices.size > 0) {
      console.log('Selected', selectedIndices.size, 'text items via drag')
      setSelectedTextItems(prev => new Set([...prev, ...selectedIndices]))
      
      // Update visual highlights
      selectedIndices.forEach(index => {
        const textDiv = textLayerRef.current?.children[index] as HTMLElement
        if (textDiv) {
          textDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
          textDiv.style.color = 'white'
          textDiv.style.border = '1px solid black'
        }
      })
    }
    
    setIsSelecting(false)
    setSelectionStart(null)
    setCurrentSelection(null)
  }

  const createRedactionFromSelection = () => {
    if (selectedTextItems.size === 0) {
      alert('Please select some text first')
      return
    }
    
    // Calculate bounding box for selected text items
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    
    selectedTextItems.forEach(index => {
      const textItem = textItems[index]
      if (textItem) {
        const x = textItem.transform[4]
        const y = textItem.transform[5]
        const width = textItem.width || 100 // fallback width
        const height = textItem.height
        
        minX = Math.min(minX, x)
        minY = Math.min(minY, y - height)
        maxX = Math.max(maxX, x + width)
        maxY = Math.max(maxY, y)
      }
    })
    
    if (minX === Infinity) return
    
    // Create redaction area
    const redactionArea: RedactionArea = {
      id: Date.now().toString(),
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      page: currentPage,
      text: Array.from(selectedTextItems).map(index => textItems[index]?.str || '').join(' ')
    }
    
    setRedactionAreas(prev => [...prev, redactionArea])
    
    // Clear selection
    clearCurrentSelection()
    
    console.log('Created redaction area:', redactionArea)
    
    // Re-render to show redaction
    setTimeout(() => renderPage(currentPage), 100)
  }

  const renderRedactionAreas = (pageNumber: number) => {
    if (!overlayRef.current) return
    
    // Clear existing redactions
    overlayRef.current.innerHTML = ''
    
    // Get redaction areas for current page
    const pageRedactions = redactionAreas.filter(area => area.page === pageNumber)
    
    pageRedactions.forEach((area, index) => {
      const redactionDiv = document.createElement('div')
      redactionDiv.style.position = 'absolute'
      redactionDiv.style.left = `${area.x}px`
      redactionDiv.style.top = `${area.y}px`
      redactionDiv.style.width = `${area.width}px`
      redactionDiv.style.height = `${area.height}px`
      redactionDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.9)'
      redactionDiv.style.border = '1px solid #666'
      redactionDiv.style.cursor = 'pointer'
      redactionDiv.style.zIndex = '10'
      redactionDiv.title = `Redaction ${index + 1}: ${area.text || 'Selected area'}`
      
      // Add remove button
      const removeBtn = document.createElement('button')
      removeBtn.innerHTML = '×'
      removeBtn.style.position = 'absolute'
      removeBtn.style.top = '-8px'
      removeBtn.style.right = '-8px'
      removeBtn.style.width = '16px'
      removeBtn.style.height = '16px'
      removeBtn.style.backgroundColor = '#ff4444'
      removeBtn.style.color = 'white'
      removeBtn.style.border = 'none'
      removeBtn.style.borderRadius = '50%'
      removeBtn.style.fontSize = '10px'
      removeBtn.style.cursor = 'pointer'
      removeBtn.style.lineHeight = '1'
      removeBtn.style.zIndex = '11'
      removeBtn.title = 'Remove redaction'
      removeBtn.onclick = (e) => {
        e.stopPropagation()
        removeRedaction(area.id)
      }
      
      redactionDiv.appendChild(removeBtn)
      overlayRef.current.appendChild(redactionDiv)
    })
  }

  const removeRedaction = (redactionId: string) => {
    setRedactionAreas(prev => prev.filter(area => area.id !== redactionId))
    setTimeout(() => renderPage(currentPage), 100)
  }

  const clearAllRedactions = () => {
    setRedactionAreas([])
    setSelectedTextItems(new Set())
    setTimeout(() => renderPage(currentPage), 100)
  }

  const clearCurrentSelection = () => {
    setSelectedTextItems(new Set())
    // Remove visual highlights
    Array.from(textLayerRef.current?.children || []).forEach((div) => {
      const textDiv = div as HTMLElement
      textDiv.style.backgroundColor = 'transparent'
      textDiv.style.color = 'transparent'
    })
  }

  const downloadRedactedPDF = async () => {
    if (!pdf || redactionAreas.length === 0) {
      alert('No redactions to apply')
      return
    }

    try {
      console.log('Applying redactions:', redactionAreas)
      alert(`Redaction areas marked for removal: ${redactionAreas.length}. In a production environment, these would be permanently removed from the PDF using server-side processing.`)
    } catch (error) {
      console.error('Error creating redacted PDF:', error)
      alert('Failed to create redacted PDF')
    }
  }

  const saveRedactionData = () => {
    const redactionData = {
      fileName,
      redactions: redactionAreas,
      timestamp: new Date().toISOString()
    }
    
    const dataStr = JSON.stringify(redactionData, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName}_redactions.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Cleanup function
  useEffect(() => {
    return () => {
      // Cancel ongoing operations when component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch (e) {
          console.log('Cleanup render task cancellation:', e)
        }
      }
    }
  }, [])

  useEffect(() => {
    loadPDF()
  }, [loadPDF])

  useEffect(() => {
    if (pdf && !isRendering) {
      // Add a small delay to prevent rapid re-renders
      const timeoutId = setTimeout(() => {
        renderPage(currentPage)
      }, 100)
      
      return () => clearTimeout(timeoutId)
    }
  }, [pdf, currentPage, renderPage])

  useEffect(() => {
    if (redactionMode) {
      const cleanup = selectTextByDragging()
      return cleanup
    }
  }, [redactionMode])

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages && !isRendering) {
      // Cancel any ongoing render first
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch (e) {
          console.log('Page navigation render cancellation:', e)
        }
      }
      
      // Clear selection when changing pages
      clearCurrentSelection()
      setCurrentPage(page)
    }
  }

  const zoomIn = () => {
    if (!isRendering) {
      setScale(prev => Math.min(prev + 0.25, 3))
    }
  }
  
  const zoomOut = () => {
    if (!isRendering) {
      setScale(prev => Math.max(prev - 0.25, 0.5))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading PDF for redaction...</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Preparing interactive editor</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <p className="text-red-600 dark:text-red-400 mb-4 text-sm whitespace-pre-line">
            {error}
          </p>
          <Button 
            onClick={() => {
              setError('')
              loadPDF()
            }} 
            variant="outline" 
            size="sm"
            disabled={loading || isRendering}
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* PDF Redaction Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">PDF Redaction Editor</span>
          <Badge variant={redactionMode ? "destructive" : "secondary"} className="text-xs">
            {redactionMode ? "Redaction Mode" : "View Mode"}
          </Badge>
          {isRendering && (
            <Badge variant="outline" className="text-xs">
              Rendering...
            </Badge>
          )}
          {selectedTextItems.size > 0 && (
            <Badge variant="outline" className="text-xs">
              {selectedTextItems.size} text items selected
            </Badge>
          )}
          {redactionAreas.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {redactionAreas.length} redactions
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={() => {
              setRedactionMode(!redactionMode)
              if (!redactionMode) {
                clearCurrentSelection()
              }
            }}
            variant={redactionMode ? "destructive" : "default"}
            size="sm"
            disabled={isRendering}
          >
            <Edit3 className="w-4 h-4 mr-2" />
            {redactionMode ? "Exit Redaction" : "Start Redacting"}
          </Button>
          
          {redactionMode && selectedTextItems.size > 0 && (
            <>
              <Button 
                onClick={createRedactionFromSelection} 
                variant="default" 
                size="sm"
                disabled={isRendering}
              >
                <span className="mr-2">⬛</span>
                Apply Redaction
              </Button>
              <Button 
                onClick={clearCurrentSelection} 
                variant="outline" 
                size="sm"
                disabled={isRendering}
              >
                Clear Selection
              </Button>
            </>
          )}
          
          {redactionAreas.length > 0 && (
            <>
              <Button 
                onClick={clearAllRedactions} 
                variant="outline" 
                size="sm"
                disabled={isRendering}
              >
                <Undo className="w-4 h-4 mr-2" />
                Clear All
              </Button>
              <Button 
                onClick={saveRedactionData} 
                variant="outline" 
                size="sm"
                disabled={isRendering}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Redactions
              </Button>
              <Button 
                onClick={downloadRedactedPDF} 
                variant="default" 
                size="sm"
                disabled={isRendering}
              >
                <Download className="w-4 h-4 mr-2" />
                Apply Redactions
              </Button>
            </>
          )}
        </div>
      </div>

      {/* PDF Navigation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border">
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1 || isRendering}
            variant="outline"
            size="sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <span className="text-sm font-medium px-3">
            Page {currentPage} of {totalPages}
          </span>
          
          <Button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages || isRendering}
            variant="outline"
            size="sm"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button 
            onClick={zoomOut} 
            variant="outline" 
            size="sm"
            disabled={isRendering}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm px-2">{Math.round(scale * 100)}%</span>
          <Button 
            onClick={zoomIn} 
            variant="outline" 
            size="sm"
            disabled={isRendering}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Instructions */}
      {redactionMode && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="text-yellow-600 dark:text-yellow-400 text-sm">
              💡 <strong>Redaction Mode:</strong> Click on individual text items to select them, or drag to select multiple words. 
              Selected text will be highlighted. Click "Apply Redaction" to create black boxes over selected text.
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Container */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
        <div 
          ref={containerRef}
          className="relative overflow-auto max-h-[600px] p-4"
        >
          <div className="relative inline-block">
            {/* Canvas for PDF rendering */}
            <canvas
              ref={canvasRef}
              className="border border-gray-200 dark:border-gray-700 rounded shadow-sm"
              style={{ 
                display: 'block',
                userSelect: 'none',
                opacity: isRendering ? 0.7 : 1,
                transition: 'opacity 0.2s ease'
              }}
            />
            
            {/* Text Layer for Selection */}
            <div
              ref={textLayerRef}
              className="absolute top-0 left-0"
              style={{ 
                pointerEvents: redactionMode && !isRendering ? 'auto' : 'auto',
                userSelect: redactionMode ? 'none' : 'text',
                zIndex: 1
              }}
            />
            
            {/* Redaction Overlay */}
            <div
              ref={overlayRef}
              className="absolute top-0 left-0 pointer-events-auto"
              style={{ 
                zIndex: 2
              }}
            />
            
            {/* Rendering Overlay */}
            {isRendering && (
              <div className="absolute top-0 left-0 w-full h-full bg-gray-100 bg-opacity-50 flex items-center justify-center z-50">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Rendering page...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Redaction List */}
      {redactionAreas.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
          <h3 className="text-lg font-semibold mb-3">Redaction Areas ({redactionAreas.length})</h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {redactionAreas.map((area, index) => (
              <div key={area.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                <div>
                  <div className="font-medium">
                    Page {area.page} - Area {index + 1}
                  </div>
                  {area.text && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[300px]">
                      "{area.text}"
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => removeRedaction(area.id)}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  disabled={isRendering}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status */}
      <div className="text-center text-xs text-gray-500 dark:text-gray-400 space-x-4">
        <span>File: {fileName}</span>
        <span>•</span>
        <span>Scale: {Math.round(scale * 100)}%</span>
        <span>•</span>
        <span>Mode: {redactionMode ? 'Redaction' : 'View'}</span>
        {selectedTextItems.size > 0 && (
          <>
            <span>•</span>
            <span>Selected: {selectedTextItems.size} text items</span>
          </>
        )}
        {redactionAreas.length > 0 && (
          <>
            <span>•</span>
            <span>Redactions: {redactionAreas.length}</span>
          </>
        )}
        {isRendering && (
          <>
            <span>•</span>
            <span>Status: Rendering...</span>
          </>
        )}
      </div>
    </div>
  )
}

// Enhanced DOCX Viewer Component using mammoth.js
const DOCXViewer: React.FC<{ file: any, fileName: string, content?: string }> = ({ file, fileName, content }) => {
  const [htmlContent, setHtmlContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [processingMethod, setProcessingMethod] = useState<string>('')
  const [originalFileData, setOriginalFileData] = useState<File | Blob | null>(null)

  useEffect(() => {
    const convertDocxToHtml = async () => {
      setLoading(true)
      setError('')
      setHtmlContent('')
      
      try {
        console.log('Processing DOCX file:', fileName)
        
        let arrayBuffer: ArrayBuffer
        
        // Determine the source of the DOCX data and store original file
        if (file instanceof File) {
          console.log('Converting File object to ArrayBuffer')
          arrayBuffer = await file.arrayBuffer()
          setOriginalFileData(file) // Store original File object
          setProcessingMethod('File object with mammoth.js')
        } else if (file instanceof Blob) {
          console.log('Converting Blob object to ArrayBuffer')
          arrayBuffer = await file.arrayBuffer()
          setOriginalFileData(file) // Store original Blob object
          setProcessingMethod('Blob object with mammoth.js')
        } else if (content) {
          console.log('Processing content string')
          
          // Try to parse content as JSON first (from backend processing)
          try {
            const parsedContent = JSON.parse(content)
            console.log('Parsed content structure:', {
              type: parsedContent.type,
              hasHtmlContent: !!parsedContent.htmlContent,
              hasContent: !!parsedContent.content,
              hasTextContent: !!parsedContent.textContent
            })
            
            // If we already have HTML content from backend processing, use it
            if (parsedContent.htmlContent && parsedContent.type === 'html') {
              console.log('Using pre-processed HTML content')
              const styledHtml = `
                <div class="docx-content">
                  ${parsedContent.htmlContent}
                </div>
              `
              setHtmlContent(styledHtml)
              setProcessingMethod('Pre-processed HTML from backend')
              setLoading(false)
              return
            }
            
            // If we have plain text content, format it as HTML with proper styling
            if (parsedContent.textContent || parsedContent.content) {
              const textContent = parsedContent.textContent || parsedContent.content
              const formattedHtml = `
                <div class="docx-content">
                  <h2 class="docx-title">${fileName}</h2>
                  <div class="docx-text-content">
                    ${textContent.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}
                  </div>
                </div>
              `
              console.log('Using formatted text content as HTML')
              setHtmlContent(formattedHtml)
              setProcessingMethod('Formatted text content')
              setLoading(false)
              return
            }
          } catch (parseError) {
            console.log('Content is not JSON, treating as raw text')
            const formattedHtml = `
              <div class="docx-content">
                <h2 class="docx-title">${fileName}</h2>
                <div class="docx-text-content">
                  ${content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}
                </div>
              </div>
            `
            setHtmlContent(formattedHtml)
            setProcessingMethod('Raw text content')
            setLoading(false)
            return
          }
        }
        
        // If we have an ArrayBuffer, use mammoth.js to convert
        if (arrayBuffer) {
          console.log('Converting DOCX to HTML using mammoth.js, size:', arrayBuffer.byteLength, 'bytes')
          
          const { value: html, messages } = await mammoth.convertToHtml({ 
            arrayBuffer,
            options: {
              // Convert styles to inline styles for better preview
              styleMap: [
                "p[style-name='Heading 1'] => h1.docx-heading:fresh",
                "p[style-name='Heading 2'] => h2.docx-heading:fresh",
                "p[style-name='Heading 3'] => h3.docx-heading:fresh",
                "p[style-name='Title'] => h1.docx-title:fresh",
                "p[style-name='Subtitle'] => h2.docx-subtitle:fresh",
                "r[style-name='Strong'] => strong",
                "r[style-name='Emphasis'] => em"
              ],
              // Include default styling
              includeDefaultStyleMap: true,
              // Convert embedded images
              convertImage: mammoth.images.imgElement(function(image) {
                return image.read("base64").then(function(imageBuffer) {
                  return {
                    src: "data:" + image.contentType + ";base64," + imageBuffer
                  }
                })
              })
            }
          })
          
          if (messages.length > 0) {
            console.log('Mammoth conversion messages:', messages)
          }
          
          if (html && html.trim()) {
            // Wrap in container with proper styling classes
            const styledHtml = `<div class="docx-content">${html}</div>`
            
            console.log('Successfully converted DOCX to HTML:', {
              htmlLength: html.length,
              messagesCount: messages.length
            })
            
            setHtmlContent(styledHtml)
            setProcessingMethod('Mammoth.js conversion')
          } else {
            throw new Error('Mammoth conversion returned empty HTML')
          }
        } else {
          throw new Error('No valid DOCX data source found')
        }
        
      } catch (err) {
        console.error('Error converting DOCX:', err)
        const errorMessage = (err as Error).message
        
        setError(`Failed to convert DOCX document: ${fileName}

Error Details: ${errorMessage}

This might happen if:
• Document is corrupted or password protected
• Document uses unsupported DOCX features
• File is not a valid DOCX format
• Memory limitations during processing

Troubleshooting:
1. Verify the file opens correctly in Microsoft Word
2. Try saving as a new .docx file
3. Remove complex formatting or embedded objects
4. Ensure the file is not password protected
5. Check file size and complexity`)

        setProcessingMethod('Mammoth.js conversion failed')
      } finally {
        setLoading(false)
      }
    }

    convertDocxToHtml()

    // Cleanup
    return () => {
      setHtmlContent('')
      setError('')
      setOriginalFileData(null)
    }
  }, [file, fileName, content])

  // Download original DOCX file
  const downloadOriginalDOCX = () => {
    if (originalFileData) {
      console.log('Downloading original DOCX file:', fileName)
      const url = URL.createObjectURL(originalFileData)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } else {
      console.warn('No original file data available for download')
      alert('Original DOCX file is not available for download. Try downloading as HTML instead.')
    }
  }

  // Download as HTML file
  const downloadAsHTML = () => {
    if (htmlContent) {
      const fullHtmlDocument = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${fileName}</title>
  <style>
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      margin: 40px auto; 
      line-height: 1.6; 
      color: #2c3e50;
      max-width: 800px;
      padding: 20px;
      background-color: #ffffff;
    }
    .docx-content {
      color: #2c3e50;
      font-size: 14px;
      line-height: 1.7;
    }
    .docx-title, .docx-heading, h1, h2, h3, h4, h5, h6 {
      color: #2c3e50 !important;
      font-weight: 600;
      margin-top: 1.5em;
      margin-bottom: 0.8em;
    }
    .docx-title {
      font-size: 24px;
      border-bottom: 2px solid #3498db;
      padding-bottom: 10px;
    }
    p {
      margin-bottom: 1em;
      color: #2c3e50;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    th, td {
      border: 1px solid #bdc3c7;
      padding: 12px;
      text-align: left;
      color: #2c3e50;
    }
    th {
      background-color: #ecf0f1;
      font-weight: 600;
    }
    img {
      max-width: 100%;
      height: auto;
      margin: 10px 0;
    }
    ul, ol {
      margin: 1em 0;
      padding-left: 2em;
      color: #2c3e50;
    }
    blockquote {
      margin: 1em 0;
      padding: 15px 20px;
      border-left: 4px solid #3498db;
      background-color: #f8f9fa;
      font-style: italic;
      color: #2c3e50;
    }
    strong {
      color: #2c3e50;
      font-weight: 600;
    }
    em {
      color: #2c3e50;
      font-style: italic;
    }
    @media print {
      body {
        margin: 0;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`

      const blob = new Blob([fullHtmlDocument], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName.replace(/\.(docx?)$/i, '.html')
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  // Download as plain text
  const downloadAsText = () => {
    if (htmlContent) {
      // Convert HTML to plain text
      const textContent = htmlContent
        .replace(/<[^>]+>/g, ' ') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
        .replace(/&amp;/g, '&') // Decode HTML entities
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim()
      
      const blob = new Blob([textContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName.replace(/\.(docx?)$/i, '.txt')
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Converting DOCX to HTML...</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Using mammoth.js converter</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <p className="text-red-600 dark:text-red-400 mb-4 text-sm whitespace-pre-line">
            {error}
          </p>
          <div className="space-y-2">
            {originalFileData && (
              <Button 
                onClick={downloadOriginalDOCX}
                variant="default"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Original DOCX
              </Button>
            )}
            <Button 
              onClick={downloadAsHTML}
              variant="outline"
              className="w-full"
              disabled={!htmlContent}
            >
              <Download className="w-4 h-4 mr-2" />
              Download as HTML
            </Button>
            <Button 
              onClick={() => {
                setError('')
                setLoading(true)
                window.location.reload()
              }}
              variant="ghost"
              size="sm"
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!htmlContent) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="text-yellow-500 text-4xl mb-4">📄</div>
          <p className="text-gray-600 dark:text-gray-400">No DOCX content available</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            The document was processed but no readable content was found
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* DOCX Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">
            📄 DOCX Document Preview
          </span>
          <Badge variant="secondary" className="text-xs">
            HTML Converted
          </Badge>
          <Badge variant="outline" className="text-xs">
            {processingMethod}
          </Badge>
          {htmlContent && (
            <Badge variant="outline" className="text-xs">
              {Math.round(htmlContent.length / 1024)}KB
            </Badge>
          )}
        </div>

        {/* Download Options Dropdown */}
        <div className="flex items-center space-x-2">
          {/* Primary Download Button - Original DOCX */}
          {originalFileData && (
            <Button
              onClick={downloadOriginalDOCX}
              variant="default"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Download DOCX
            </Button>
          )}
          
          {/* Secondary Download Options */}
          <div className="relative group">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
            >
              <Download className="w-4 h-4" />
              <span>More Formats</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
            
            {/* Dropdown Menu */}
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <div className="py-1">
                {originalFileData && (
                  <button
                    onClick={downloadOriginalDOCX}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <span>📄</span>
                    <span>Original DOCX</span>
                  </button>
                )}
                <button
                  onClick={downloadAsHTML}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                  disabled={!htmlContent}
                >
                  <span>🌐</span>
                  <span>HTML Format</span>
                </button>
                <button
                  onClick={downloadAsText}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                  disabled={!htmlContent}
                >
                  <span>📝</span>
                  <span>Plain Text</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DOCX Content with enhanced styling */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
        <style jsx>{`
          .docx-preview-container {
            background-color: white;
            color: #2c3e50;
          }
          .dark .docx-preview-container {
            background-color: #1f2937;
            color: #f9fafb;
          }
          .docx-content {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.7;
            color: #2c3e50;
            font-size: 14px;
          }
          .dark .docx-content {
            color: #f9fafb;
          }
          .docx-content h1,
          .docx-content h2, 
          .docx-content h3,
          .docx-content h4,
          .docx-content h5,
          .docx-content h6,
          .docx-title,
          .docx-heading {
            color: #1e40af !important;
            font-weight: 600;
            margin-top: 1.5em;
            margin-bottom: 0.8em;
          }
          .dark .docx-content h1,
          .dark .docx-content h2,
          .dark .docx-content h3,
          .dark .docx-content h4,
          .dark .docx-content h5,
          .dark .docx-content h6,
          .dark .docx-title,
          .dark .docx-heading {
            color: #60a5fa !important;
          }
          .docx-title {
            font-size: 20px;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 8px;
            margin-bottom: 1.5em;
          }
          .docx-content p {
            margin-bottom: 1em;
            color: #374151;
            text-align: justify;
          }
          .dark .docx-content p {
            color: #d1d5db;
          }
          .docx-content strong {
            color: #1f2937;
            font-weight: 600;
          }
          .dark .docx-content strong {
            color: #f9fafb;
          }
          .docx-content em {
            color: #4b5563;
            font-style: italic;
          }
          .dark .docx-content em {
            color: #d1d5db;
          }
          .docx-content table {
            border-collapse: collapse;
            width: 100%;
            margin: 1.5em 0;
            border: 1px solid #d1d5db;
          }
          .dark .docx-content table {
            border-color: #4b5563;
          }
          .docx-content th,
          .docx-content td {
            border: 1px solid #d1d5db;
            padding: 12px;
            text-align: left;
            color: #374151;
          }
          .dark .docx-content th,
          .dark .docx-content td {
            border-color: #4b5563;
            color: #d1d5db;
          }
          .docx-content th {
            background-color: #f3f4f6;
            font-weight: 600;
            color: #1f2937;
          }
          .dark .docx-content th {
            background-color: #374151;
            color: #f9fafb;
          }
          .docx-content ul,
          .docx-content ol {
            margin: 1em 0;
            padding-left: 2em;
            color: #374151;
          }
          .dark .docx-content ul,
          .dark .docx-content ol {
            color: #d1d5db;
          }
          .docx-content li {
            margin-bottom: 0.5em;
            color: #374151;
          }
          .dark .docx-content li {
            color: #d1d5db;
          }
          .docx-content blockquote {
            margin: 1.5em 0;
            padding: 15px 20px;
            border-left: 4px solid #3b82f6;
            background-color: #f8fafc;
            font-style: italic;
            color: #475569;
          }
          .dark .docx-content blockquote {
            background-color: #1e293b;
            color: #cbd5e1;
            border-left-color: #60a5fa;
          }
          .docx-content img {
            max-width: 100%;
            height: auto;
            margin: 15px 0;
            border-radius: 6px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          }
          .docx-text-content {
            color: #374151;
            line-height: 1.7;
          }
          .dark .docx-text-content {
            color: #d1d5db;
          }
        `}</style>
        
        <div 
          className="docx-preview-container p-6 max-h-[600px] overflow-auto"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>

      {/* Content Statistics */}
      <div className="text-center text-xs text-gray-500 dark:text-gray-400 space-x-4">
        <span>Processing Method: {processingMethod}</span>
        <span>•</span>
        <span>Content Length: {htmlContent.length} characters</span>
        <span>•</span>
        <span>Original File: {originalFileData ? 'Available' : 'Not Available'}</span>
      </div>
    </div>
  )
}

// Enhanced DOCX Redaction Editor Component
const DOCXRedactionEditor: React.FC<{ file: any, fileName: string, content?: string }> = ({ file, fileName, content }) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const [htmlContent, setHtmlContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [redactionMode, setRedactionMode] = useState(false)
  const [redactionType, setRedactionType] = useState("NAME")
  const [redactionHistory, setRedactionHistory] = useState<string[]>([])
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1)
  const [redactionCount, setRedactionCount] = useState(0)

  const redactionLabels = [
    "NAME",
    "EMAIL", 
    "PHONE",
    "ADDRESS",
    "SSN",
    "CREDIT_CARD",
    "LOCATION",
    "IP",
    "CUSTOM"
  ]

  const redactionColors = {
    NAME: '#ef4444',
    EMAIL: '#f59e0b', 
    PHONE: '#10b981',
    ADDRESS: '#3b82f6',
    SSN: '#8b5cf6',
    CREDIT_CARD: '#f97316',
    LOCATION: '#06b6d4',
    IP: '#84cc16',
    CUSTOM: '#6b7280'
  }

  useEffect(() => {
    const convertDocxToHtml = async () => {
      setLoading(true)
      setError('')
      
      try {
        let htmlResult = ''
        
        if (file instanceof File || file instanceof Blob) {
          console.log('Converting DOCX file to HTML for redaction')
          const arrayBuffer = await file.arrayBuffer()
          const { value: html } = await mammoth.convertToHtml({ 
            arrayBuffer,
            options: {
              styleMap: [
                "p[style-name='Heading 1'] => h1.docx-heading:fresh",
                "p[style-name='Heading 2'] => h2.docx-heading:fresh", 
                "p[style-name='Heading 3'] => h3.docx-heading:fresh",
                "p[style-name='Title'] => h1.docx-title:fresh",
                "r[style-name='Strong'] => strong",
                "r[style-name='Emphasis'] => em"
              ],
              includeDefaultStyleMap: true
            }
          })
          htmlResult = html
        } else if (content) {
          try {
            const parsedContent = JSON.parse(content)
            if (parsedContent.htmlContent) {
              htmlResult = parsedContent.htmlContent
            } else if (parsedContent.textContent || parsedContent.content) {
              const textContent = parsedContent.textContent || parsedContent.content
              htmlResult = `<div class="docx-content">${textContent.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</div>`
            }
          } catch {
            htmlResult = `<div class="docx-content">${content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</div>`
          }
        }
        
        if (htmlResult) {
          setHtmlContent(htmlResult)
          // Initialize history with original content
          setRedactionHistory([htmlResult])
          setCurrentHistoryIndex(0)
        } else {
          throw new Error('No content available for redaction')
        }
        
      } catch (err) {
        console.error('Error preparing DOCX for redaction:', err)
        setError(`Failed to prepare document for redaction: ${(err as Error).message}`)
      } finally {
        setLoading(false)
      }
    }

    convertDocxToHtml()
  }, [file, fileName, content])

  const saveToHistory = (newContent: string) => {
    const newHistory = redactionHistory.slice(0, currentHistoryIndex + 1)
    newHistory.push(newContent)
    setRedactionHistory(newHistory)
    setCurrentHistoryIndex(newHistory.length - 1)
  }

  const redactSelection = () => {
    if (!editorRef.current) return
    
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      alert('Please select some text to redact')
      return
    }

    const range = selection.getRangeAt(0)
    const selectedText = selection.toString()
    
    if (selectedText.trim().length === 0) {
      alert('Please select valid text to redact')
      return
    }

    // Create redaction span with color coding
    const redactionSpan = document.createElement('span')
    redactionSpan.className = 'redacted-text'
    redactionSpan.style.backgroundColor = redactionColors[redactionType as keyof typeof redactionColors]
    redactionSpan.style.color = 'white'
    redactionSpan.style.padding = '2px 6px'
    redactionSpan.style.borderRadius = '3px'
    redactionSpan.style.fontWeight = 'bold'
    redactionSpan.style.fontSize = '0.9em'
    redactionSpan.setAttribute('data-redaction-type', redactionType)
    redactionSpan.setAttribute('data-original-text', selectedText)
    redactionSpan.textContent = `[REDACTED_${redactionType}]`

    // Replace selected text with redaction
    range.deleteContents()
    range.insertNode(redactionSpan)
    
    // Clear selection
    selection.removeAllRanges()
    
    // Save to history
    const newContent = editorRef.current.innerHTML
    saveToHistory(newContent)
    setHtmlContent(newContent)
    setRedactionCount(prev => prev + 1)
    
    console.log('Redacted text:', selectedText, 'as', redactionType)
  }

  const undoRedaction = () => {
    if (currentHistoryIndex > 0) {
      const prevIndex = currentHistoryIndex - 1
      const prevContent = redactionHistory[prevIndex]
      setCurrentHistoryIndex(prevIndex)
      setHtmlContent(prevContent)
      if (editorRef.current) {
        editorRef.current.innerHTML = prevContent
      }
      setRedactionCount(prev => Math.max(0, prev - 1))
    }
  }

  const redoRedaction = () => {
    if (currentHistoryIndex < redactionHistory.length - 1) {
      const nextIndex = currentHistoryIndex + 1
      const nextContent = redactionHistory[nextIndex]
      setCurrentHistoryIndex(nextIndex)
      setHtmlContent(nextContent)
      if (editorRef.current) {
        editorRef.current.innerHTML = nextContent
      }
      setRedactionCount(prev => prev + 1)
    }
  }

  const clearAllRedactions = () => {
    if (redactionHistory.length > 0) {
      const originalContent = redactionHistory[0]
      setHtmlContent(originalContent)
      if (editorRef.current) {
        editorRef.current.innerHTML = originalContent
      }
      setCurrentHistoryIndex(0)
      setRedactionCount(0)
    }
  }

  const downloadRedactedDocx = async () => {
    if (!editorRef.current) return;

    // Get the redacted HTML content
    const redactedHtml = editorRef.current.innerHTML;

    // Create a Word-compatible HTML document
    const wordHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office'
            xmlns:w='urn:schemas-microsoft-com:office:word'>
      <head>
        <meta charset="utf-8">
        <title>${fileName} - Redacted</title>
        <style>
          body { font-family: 'Calibri', sans-serif; font-size: 11pt; }
          .redacted-text { background: #000; color: #fff; font-weight: bold; }
        </style>
      </head>
      <body>
        ${redactedHtml}
      </body>
      </html>
    `;

    const blob = new Blob([wordHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace(/\.(docx?)$/i, '_redacted.doc');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const downloadRedactionReport = () => {
    const redactedElements = editorRef.current?.querySelectorAll('.redacted-text')
    const report = {
      fileName: fileName,
      timestamp: new Date().toISOString(),
      totalRedactions: redactedElements?.length || 0,
      redactionsByType: {},
      redactionDetails: []
    }

    redactedElements?.forEach((element, index) => {
      const type = element.getAttribute('data-redaction-type') || 'UNKNOWN'
      const originalText = element.getAttribute('data-original-text') || ''
      
      // Count by type
      report.redactionsByType[type] = (report.redactionsByType[type] || 0) + 1
      
      // Add details
      report.redactionDetails.push({
        index: index + 1,
        type: type,
        originalText: originalText,
        redactedAs: element.textContent
      })
    })

    const reportJson = JSON.stringify(report, null, 2)
    const blob = new Blob([reportJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName.replace(/\.(docx?)$/i, '_redaction_report.json')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Preparing DOCX for redaction...</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Loading interactive editor</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <p className="text-red-600 dark:text-red-400 mb-4 text-sm whitespace-pre-line">
            {error}
          </p>
          <Button onClick={() => window.location.reload()} variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Redaction Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">DOCX Redaction Editor</span>
          <Badge variant={redactionMode ? "destructive" : "secondary"} className="text-xs">
            {redactionMode ? "Redaction Mode" : "Edit Mode"}
          </Badge>
          {redactionCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {redactionCount} redactions
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setRedactionMode(!redactionMode)}
            variant={redactionMode ? "destructive" : "default"}
            size="sm"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            {redactionMode ? "Exit Redaction" : "Start Redacting"}
          </Button>
        </div>
      </div>

      {/* Redaction Toolbar */}
      {redactionMode && (
        <div className="flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border">
          <div className="flex items-center space-x-2">
            <label htmlFor="redaction-type" className="text-sm font-medium">
              Redaction Type:
            </label>
            <select
              id="redaction-type"
              value={redactionType}
              onChange={(e) => setRedactionType(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 px-3 py-1 rounded text-sm bg-white dark:bg-gray-700"
            >
              {redactionLabels.map((label) => (
                <option key={label} value={label}>
                  {label.replace('_', ' ')}
                </option>
              ))}
            </select>
            <div 
              className="w-4 h-4 rounded"
              style={{ backgroundColor: redactionColors[redactionType as keyof typeof redactionColors] }}
              title={`Color for ${redactionType}`}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Button onClick={redactSelection} variant="destructive" size="sm">
              <span className="mr-2">⬛</span>
              Redact Selected
            </Button>
            
            <Button 
              onClick={undoRedaction} 
              variant="outline" 
              size="sm"
              disabled={currentHistoryIndex <= 0}
            >
              <Undo className="w-4 h-4 mr-2" />
              Undo
            </Button>
            
            <Button 
              onClick={redoRedaction} 
              variant="outline" 
              size="sm"
              disabled={currentHistoryIndex >= redactionHistory.length - 1}
            >
              <span className="mr-2">↺</span>
              Redo
            </Button>
            
            {redactionCount > 0 && (
              <Button onClick={clearAllRedactions} variant="outline" size="sm">
                <span className="mr-2">🗑️</span>
                Clear All
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      {redactionMode && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="text-yellow-600 dark:text-yellow-400 text-sm">
            💡 <strong>How to Redact:</strong> Select any text in the document below, choose a redaction type, then click "Redact Selected". 
            The selected text will be replaced with a colored redaction label.
          </div>
        </div>
      )}

      {/* Editable Document */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
        <div 
          ref={editorRef}
          contentEditable={true}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
          className="p-6 min-h-[400px] max-h-[600px] overflow-auto focus:outline-none"
          style={{
            fontFamily: 'Calibri, Arial, sans-serif',
            fontSize: '14px',
            lineHeight: '1.6',
            color: '#2c3e50',
            userSelect: redactionMode ? 'text' : 'text',
            cursor: redactionMode ? 'text' : 'text'
          }}
          onInput={(e) => {
            const newContent = e.currentTarget.innerHTML
            setHtmlContent(newContent)
          }}
        />
      </div>

        

      {/* Download Options */}
      {redactionCount > 0 && (
        <div className="flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border">
          <div className="flex items-center space-x-2">
            <Button onClick={downloadRedactedDocx} variant="default" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download Redacted DOCX
            </Button>
            
            <Button onClick={downloadRedactionReport} variant="outline" size="sm">
              <Save className="w-4 h-4 mr-2" />
              Download Report
            </Button>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Redactions: {redactionCount}
          </div>
        </div>
      )}

      {/* Redaction Legend */}
      {redactionCount > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-3">Redaction Types Used:</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(redactionColors).map(([type, color]) => {
              const count = editorRef.current?.querySelectorAll(`[data-redaction-type="${type}"]`).length || 0
              if (count === 0) return null
              
              return (
                <div key={type} className="flex items-center space-x-2 text-xs">
                  <div 
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: color }}
                  />
                  <span>{type.replace('_', ' ')}: {count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Status */}
      <div className="text-center text-xs text-gray-500 dark:text-gray-400 space-x-4">
        <span>File: {fileName}</span>
        <span>•</span>
        <span>Mode: {redactionMode ? 'Redaction' : 'Edit'}</span>
        <span>•</span>
        <span>History: {currentHistoryIndex + 1}/{redactionHistory.length}</span>
        {redactionCount > 0 && (
          <>
            <span>•</span>
            <span>Redactions: {redactionCount}</span>
          </>
        )}
      </div>
    </div>
  )
}

export function PreviewCompo({ className, uploadedFiles }: PreviewCompoProps) {
  const [activeFileIndex, setActiveFileIndex] = useState(0)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return '📄'
      case 'doc':
      case 'docx':
        return '📝'
      case 'txt':
        return '📄'
      case 'json':
        return '📋'
      default:
        return '📄'
    }
  }

  const isPdfFile = (fileName: string) => {
    return fileName.toLowerCase().endsWith('.pdf')
  }

  const isDocxFile = (fileName: string) => {
    return fileName.toLowerCase().endsWith('.docx') || fileName.toLowerCase().endsWith('.doc')
  }

  const getPdfData = (file: any) => {
    console.log('Getting PDF data for file:', file.name)
    console.log('File object type:', typeof file.file)
    console.log('File object instanceof File:', file.file instanceof File)
    console.log('File object instanceof Blob:', file.file instanceof Blob)
    console.log('Has temp URL:', !!(file as any).tempUrl)
    
    // Priority 1: Use File object if available
    if (file.file instanceof File) {
      console.log('Using File object for PDF:', file.file.name, file.file.size, file.file.type)
      return file.file
    } 
    
    // Priority 2: Use Blob object if available
    if (file.file instanceof Blob) {
      console.log('Using Blob object for PDF:', file.file.size, file.file.type)
      return file.file
    }
    
    // Priority 3: Use temporary URL if available
    if ((file as any).tempUrl) {
      console.log('Using temporary URL for PDF:', (file as any).tempUrl)
      return (file as any).tempUrl
    }
    
    // Priority 4: Check if the file object has arrayBuffer method
    if (file.file && typeof file.file.arrayBuffer === 'function') {
      console.log('Using File-like object for PDF')
      return file.file
    }
    
    // Priority 5: Try to handle base64 content
    if (file.content && typeof file.content === 'string') {
      if (file.content.startsWith('data:application/pdf;base64,')) {
        console.log('Using base64 data URL for PDF')
        return file.content
      }
      
      if (file.content.match(/^[A-Za-z0-9+/]*={0,2}$/) && file.content.length > 100) {
        console.log('Converting base64 string to data URL')
        return `data:application/pdf;base64,${file.content}`
      }
    }
    
    console.warn('Could not determine PDF data format for:', file.name)
    return null
  }

  // Generic download function for any file type
  const downloadFile = (file: any) => {
    console.log('Downloading file:', file.name)
    
    try {
      // If there's a File object, use it directly
      if (file.file instanceof File) {
        const url = URL.createObjectURL(file.file)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        console.log('Downloaded File object:', file.name)
        return
      }
      
      // If there's a Blob object, use it
      if (file.file instanceof Blob) {
        const url = URL.createObjectURL(file.file)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        console.log('Downloaded Blob object:', file.name)
        return
      }
      
      // For non-PDF/DOCX files, show text content
      if (!isPdfFile(file.name) && !isDocxFile(file.name) && file.content && typeof file.content === 'string') {
        let mimeType = 'text/plain'
        
        // Determine MIME type based on file extension
        if (file.name.toLowerCase().endsWith('.json')) {
          mimeType = 'application/json'
        } else if (file.name.toLowerCase().endsWith('.csv')) {
          mimeType = 'text/csv'
        } else if (file.name.toLowerCase().endsWith('.xml')) {
          mimeType = 'application/xml'
        }
        
        const blob = new Blob([file.content], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        console.log('Downloaded text content as blob:', file.name)
        return
      }
      
      // Fallback: create a text file with available information
      const fallbackContent = `File: ${file.name}
Size: ${formatFileSize(file.size)}
Type: ${file.type.toUpperCase()}
Last Modified: ${file.lastModified ? new Date(file.lastModified).toLocaleString() : 'Unknown'}

Note: Original file content was not available for download.
`
      
      const blob = new Blob([fallbackContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${file.name.replace(/\.[^/.]+$/, '')}_info.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      console.log('Downloaded fallback text file:', file.name)
      
    } catch (error) {
      console.error('Error downloading file:', error)
      alert(`Error downloading file: ${(error as Error).message}`)
    }
  }

  // Download all files as a ZIP
  const downloadAllFiles = async () => {
    try {
      // Import JSZip dynamically
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      
      console.log('Creating ZIP with', uploadedFiles.length, 'files')
      
      for (const file of uploadedFiles) {
        try {
          if (file.file instanceof File || file.file instanceof Blob) {
            // Add File or Blob directly
            zip.file(file.name, file.file)
            console.log('Added to ZIP (File/Blob):', file.name)
          } else if (file.content && typeof file.content === 'string') {
            // Handle base64 PDF content
            if (file.name.toLowerCase().endsWith('.pdf') && file.content.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
              try {
                const binaryString = atob(file.content.replace(/^data:.*;base64,/, ''))
                const bytes = new Uint8Array(binaryString.length)
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i)
                }
                zip.file(file.name, bytes)
                console.log('Added to ZIP (base64 PDF):', file.name)
              } catch (base64Error) {
                console.error('Error decoding base64 for', file.name, base64Error)
                zip.file(file.name, file.content)
              }
            } else {
              // Add text content for non-PDF/DOCX files only
              if (!isPdfFile(file.name) && !isDocxFile(file.name)) {
                zip.file(file.name, file.content)
                console.log('Added to ZIP (text):', file.name)
              }
            }
          } else {
            // Fallback: create info file
            const fallbackContent = `File: ${file.name}
Size: ${formatFileSize(file.size)}
Type: ${file.type.toUpperCase()}
Last Modified: ${file.lastModified ? new Date(file.lastModified).toLocaleString() : 'Unknown'}

Note: Original file content was not available for download.
`
            zip.file(`${file.name.replace(/\.[^/.]+$/, '')}_info.txt`, fallbackContent)
            console.log('Added to ZIP (fallback):', file.name)
          }
        } catch (fileError) {
          console.error('Error adding file to ZIP:', file.name, fileError)
        }
      }
      
      // Generate ZIP and download
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `redacted_documents_${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      console.log('ZIP download completed')
    } catch (error) {
      console.error('Error creating ZIP:', error)
      alert(`Error creating ZIP file: ${(error as Error).message}`)
    }
  }

  if (!uploadedFiles || uploadedFiles.length === 0) {
    return (
      <div className={`${className} p-8 text-center`}>
        <div className="text-6xl mb-4">📄</div>
        <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">
          No documents to preview
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Upload and process documents to see them here
        </p>
      </div>
    )
  }

  const activeFile = uploadedFiles[activeFileIndex]
  const isActivePdf = isPdfFile(activeFile.name)
  const isActiveDocx = isDocxFile(activeFile.name)

  return (
    <div className={`${className} space-y-6`}>
      {/* File Tabs and Download All Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* File Tabs */}
        {uploadedFiles.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map((file, index) => (
              <button
                key={index}
                onClick={() => setActiveFileIndex(index)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                  index === activeFileIndex
                    ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-lg">{getFileIcon(file.type)}</span>
                <span className="text-sm font-medium truncate max-w-[150px]">
                  {file.name}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {formatFileSize(file.size)}
                </Badge>
              </button>
            ))}
          </div>
        )}

        {/* Download All Button */}
        <div className="flex items-center space-x-2">
          {uploadedFiles.length > 1 && (
            <Button
              onClick={downloadAllFiles}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download All ({uploadedFiles.length})</span>
            </Button>
          )}
        </div>
      </div>

      {/* File Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{getFileIcon(activeFile.type)}</span>
              <div>
                <div className="font-semibold">{activeFile.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 font-normal">
                  {activeFile.type.toUpperCase()} • {formatFileSize(activeFile.size)}
                  {activeFile.lastModified && (
                    <> • {new Date(activeFile.lastModified).toLocaleDateString()}</>
                  )}
                </div>
              </div>
            </div>
            {/* Individual File Download Button */}
            <Button
              onClick={() => downloadFile(activeFile)}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isActiveDocx ? (
            <DOCXRedactionEditor
              file={activeFile.file}
              fileName={activeFile.name}
              content={activeFile.content}
            />
          ) : isActivePdf ? (
            <PDFViewer
              file={getPdfData(activeFile)}
              fileName={activeFile.name}
            />
          ) : (
            <div className="space-y-4">
              <div className="max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono leading-relaxed">
                  {activeFile.content || 'No content available for preview'}
                </pre>
              </div>
            </div>
          )}
        </CardContent>       </CardContent>




}  )    </div>      </Card>      </Card>
    </div>
  )
}
import { useState, useRef } from 'react'
import { GiMedicines } from 'react-icons/gi'
import { MdCameraAlt, MdEdit } from 'react-icons/md'
import './App.css'

interface ProductDetails {
  product_name: string
  active_ingredients: string
  product_category: string
  nrn: string
  status: string
}

interface ValidationResult {
  success: boolean
  nafdacNumber?: string
  found?: boolean
  message?: string
  results?: ProductDetails[]
}

interface VerificationResult {
  verificationId: string
  timestamp: string
  imageKey: string
  nafdacNumber?: string
  ocrConfidence?: number
  extractedText?: string
  validationResult?: ValidationResult
  error?: string
}

interface ProgressStep {
  id: number
  label: string
  status: 'pending' | 'active' | 'completed' | 'error'
  duration: number // milliseconds
}

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [verificationMode, setVerificationMode] = useState<'image' | 'manual'>('image')
  const [manualNafdacNumber, setManualNafdacNumber] = useState('')
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    setSelectedFile(file)
    setResult(null)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const simulateProgress = async (steps: ProgressStep[]) => {
    for (let i = 0; i < steps.length; i++) {
      // Mark current step as active
      setProgressSteps(prev => 
        prev.map((step, idx) => ({
          ...step,
          status: idx === i ? 'active' : idx < i ? 'completed' : 'pending'
        }))
      )
      
      // Wait for step duration
      await new Promise(resolve => setTimeout(resolve, steps[i].duration))
    }
  }

  const handleVerify = async () => {
    if (!selectedFile || !previewUrl) return

    setIsLoading(true)
    
    // Initialize progress steps
    const steps: ProgressStep[] = [
      { id: 1, label: 'Uploading image...', status: 'pending', duration: 1000 },
      { id: 2, label: 'Extracting text from image...', status: 'pending', duration: 2500 },
      { id: 3, label: 'Identifying NAFDAC number...', status: 'pending', duration: 1500 },
      { id: 4, label: 'Searching NAFDAC database...', status: 'pending', duration: 3000 },
      { id: 5, label: 'Validating product details...', status: 'pending', duration: 2000 },
    ]
    setProgressSteps(steps)

    try {
      // Convert image to base64
      const base64 = previewUrl.split(',')[1]

      // Get API endpoint from environment variable
      const apiEndpoint = import.meta.env.VITE_API_URL || '/api'

      // Start progress simulation and API call simultaneously
      const progressPromise = simulateProgress(steps)
      const apiPromise = fetch(`${apiEndpoint}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64,
        }),
      })

      // Wait for both to complete
      const [, response] = await Promise.all([progressPromise, apiPromise])
      const data = await response.json()
      
      // Mark all steps as completed
      setProgressSteps(prev => 
        prev.map(step => ({ ...step, status: 'completed' }))
      )
      
      setResult(data)
    } catch (error) {
      console.error('Verification error:', error)
      
      // Mark current step as error
      setProgressSteps(prev => 
        prev.map(step => 
          step.status === 'active' ? { ...step, status: 'error' } : step
        )
      )
      
      setResult({
        verificationId: '',
        timestamp: '',
        imageKey: '',
        error: 'Failed to verify product. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualVerify = async () => {
    if (!manualNafdacNumber.trim()) return

    setIsLoading(true)
    
    // Initialize progress steps for manual verification
    const steps: ProgressStep[] = [
      { id: 1, label: 'Connecting to NAFDAC database...', status: 'pending', duration: 1500 },
      { id: 2, label: 'Searching for product...', status: 'pending', duration: 3000 },
      { id: 3, label: 'Retrieving product details...', status: 'pending', duration: 2500 },
    ]
    setProgressSteps(steps)

    try {
      // Get API endpoint from environment variable
      const apiEndpoint = import.meta.env.VITE_API_URL || '/api'

      // Start progress simulation and API call simultaneously
      const progressPromise = simulateProgress(steps)
      const apiPromise = fetch(`${apiEndpoint}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verificationId: `manual-${Date.now()}`,
          timestamp: new Date().toISOString(),
          imageKey: '',
          nafdacNumber: manualNafdacNumber.trim(),
        }),
      })

      // Wait for both to complete
      const [, response] = await Promise.all([progressPromise, apiPromise])
      const data = await response.json()
      
      // Mark all steps as completed
      setProgressSteps(prev => 
        prev.map(step => ({ ...step, status: 'completed' }))
      )
      
      setResult(data)
    } catch (error) {
      console.error('Verification error:', error)
      
      // Mark current step as error
      setProgressSteps(prev => 
        prev.map(step => 
          step.status === 'active' ? { ...step, status: 'error' } : step
        )
      )
      
      setResult({
        verificationId: '',
        timestamp: '',
        imageKey: '',
        error: 'Failed to verify product. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setResult(null)
    setManualNafdacNumber('')
    setProgressSteps([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleNewVerification = () => {
    handleCancel()
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // Optional: Show a brief success indicator
      alert('Copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1><GiMedicines className="header-icon" /> Drug Verification</h1>
          <p>Verify the authenticity of pharmaceutical products</p>
        </div>
      </header>

      <main className="main">
        {!result && (
          <section className="upload-section">
            <h2>Verify Pharmaceutical Product</h2>
            <p>Choose how you want to verify the product</p>

            <div className="mode-toggle">
              <button
                className={`mode-button ${verificationMode === 'image' ? 'active' : ''}`}
                onClick={() => setVerificationMode('image')}
              >
                <MdCameraAlt /> Upload Image
              </button>
              <button
                className={`mode-button ${verificationMode === 'manual' ? 'active' : ''}`}
                onClick={() => setVerificationMode('manual')}
              >
                <MdEdit /> Enter Manually
              </button>
            </div>

            {verificationMode === 'image' ? (
              <>
                {!isLoading && (
                  <>
                    <p style={{ marginTop: '1.5rem' }}>Take a clear photo of the product showing the NAFDAC registration number</p>

                    <div
                      className={`upload-area ${isDragging ? 'drag-over' : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="upload-icon">📸</div>
                      <h3>Drag & Drop or Click to Upload</h3>
                      <p>Supports: JPEG, PNG, HEIC (Max 10MB)</p>
                      <button className="upload-button" type="button">
                        Choose Image
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="file-input"
                        accept="image/*"
                        onChange={handleFileInputChange}
                      />
                    </div>

                    {selectedFile && previewUrl && (
                      <div className="preview-section">
                        <div className="image-preview">
                          <img src={previewUrl} alt="Product preview" />
                        </div>
                        <div className="action-buttons">
                          <button
                            className="verify-button"
                            onClick={handleVerify}
                            disabled={isLoading}
                          >
                            {isLoading ? 'Verifying...' : '✓ Verify Product'}
                          </button>
                          <button
                            className="cancel-button"
                            onClick={handleCancel}
                            disabled={isLoading}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="manual-input-section">
                <p style={{ marginTop: '1.5rem' }}>Enter the NAFDAC registration number from the product</p>
                <div className="input-group">
                  <label htmlFor="nafdac-input">NAFDAC Registration Number</label>
                  <input
                    id="nafdac-input"
                    type="text"
                    className="nafdac-input"
                    placeholder="e.g., A4-1234 or 01-1234"
                    value={manualNafdacNumber}
                    onChange={(e) => setManualNafdacNumber(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="action-buttons">
                  <button
                    className="verify-button"
                    onClick={handleManualVerify}
                    disabled={isLoading || !manualNafdacNumber.trim()}
                  >
                    {isLoading ? 'Verifying...' : '✓ Verify Product'}
                  </button>
                  {manualNafdacNumber && (
                    <button
                      className="cancel-button"
                      onClick={handleCancel}
                      disabled={isLoading}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            {isLoading && (
              <div className="progress-container">
                <div className="progress-steps">
                  {progressSteps.map((step) => (
                    <div key={step.id} className={`progress-step ${step.status}`}>
                      <div className="step-indicator">
                        {step.status === 'completed' && <span className="step-icon">✓</span>}
                        {step.status === 'active' && <div className="step-spinner"></div>}
                        {step.status === 'error' && <span className="step-icon error">✗</span>}
                        {step.status === 'pending' && <span className="step-number">{step.id}</span>}
                      </div>
                      <div className="step-label">{step.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {result && (
          <section className="result-section">
            {result.error ? (
              <>
                <div className="result-header">
                  <div className="result-icon error">✗</div>
                  <h2 className="result-title error">Verification Failed</h2>
                </div>
                <div className="error-message">
                  <p>{result.error}</p>
                </div>
              </>
            ) : (
              <>
                <div className="result-header">
                  <div className={`result-icon ${result.validationResult?.found ? 'success' : 'error'}`}>
                    {result.validationResult?.found ? '✓' : '✗'}
                  </div>
                  <h2 className={`result-title ${result.validationResult?.found ? 'success' : 'error'}`}>
                    {result.validationResult?.found ? 'Product Verified' : 'Product Not Found'}
                  </h2>
                </div>

                {result.validationResult?.found && result.validationResult.results && result.validationResult.results.length > 0 && (
                  <>
                    {result.validationResult.results.length > 1 && (
                      <div className="results-count">
                        <p>Found {result.validationResult.results.length} matching products</p>
                      </div>
                    )}
                    
                    <div className="products-container">
                      {result.validationResult.results.map((product, index) => (
                        <div key={index} className="product-card">
                          {result.validationResult?.results && result.validationResult.results.length > 1 && (
                            <div className="product-number">Product {index + 1}</div>
                          )}
                          
                          <div className="product-details">
                            <div className="detail-row">
                              <span className="detail-label">Product Name:</span>
                              <span className="detail-value">{product.product_name}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">Active Ingredients:</span>
                              <span className="detail-value">{product.active_ingredients}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">Category:</span>
                              <span className="detail-value">{product.product_category}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">NAFDAC Number:</span>
                              <span className="detail-value">
                                {product.nrn}
                                <button 
                                  className="copy-button"
                                  onClick={() => copyToClipboard(product.nrn)}
                                  title="Copy NAFDAC number"
                                >
                                  📋
                                </button>
                              </span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">Status:</span>
                              <span className="detail-value">
                                <span className={`status-badge ${product.status.toLowerCase()}`}>
                                  {product.status}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {!result.validationResult?.found && (
                  <div className="error-message">
                    <p>
                      {result.validationResult?.message || 'Product not found in NAFDAC database'}
                    </p>
                    {result.nafdacNumber && (
                      <p style={{ marginTop: '0.5rem' }}>
                        NAFDAC Number: <strong>{result.nafdacNumber}</strong>
                        {result.ocrConfidence && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.9em', opacity: 0.8 }}>
                            (OCR Confidence: {result.ocrConfidence.toFixed(1)}%)
                          </span>
                        )}
                      </p>
                    )}
                    {result.extractedText && (
                      <details style={{ marginTop: '1rem' }}>
                        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                          View Extracted Text
                        </summary>
                        <p style={{ marginTop: '0.5rem', fontSize: '0.9em', opacity: 0.8 }}>
                          {result.extractedText}
                        </p>
                      </details>
                    )}
                  </div>
                )}

                <div className="verification-metadata">
                  <p><small>Verification ID: {result.verificationId}</small></p>
                  <p><small>Timestamp: {new Date(result.timestamp).toLocaleString()}</small></p>
                  {result.ocrConfidence && (
                    <p><small>OCR Confidence: {result.ocrConfidence.toFixed(1)}%</small></p>
                  )}
                </div>
              </>
            )}

            <button className="new-verification-button" onClick={handleNewVerification}>
              Verify Another Product
            </button>
          </section>
        )}
      </main>
    </div>
  )
}

export default App

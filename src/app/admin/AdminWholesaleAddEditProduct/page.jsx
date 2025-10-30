'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import Swal from 'sweetalert2'
import Select from 'react-select'
import CreatableSelect from 'react-select/creatable'
import {
  PlusCircle,
  Upload,
  AlertCircle,
  Scan,
  Package,
  DollarSign,
  Hash,
  Store,
  Tag,
  Image as ImageIcon,
  Trash2,
  Save,
  RotateCcw,
  Plus,
  Zap,
  X,
  Edit,
  Settings,
  Palette,
  ToggleLeft,
  ToggleRight,
  List,
  Minus,
  PillBottle,
  Battery,
  Clock,
} from 'lucide-react'

// For barcode scanning
import BarcodeReader from 'react-barcode-reader'

const MySwal = Swal

// Nicotine options
const NICOTINE_OPTIONS = [
  { value: '0mg', label: '0mg' },
  { value: '3mg', label: '3mg' },
  { value: '6mg', label: '6mg' },
  { value: '9mg', label: '9mg' },
  { value: '12mg', label: '12mg' },
  { value: '15mg', label: '15mg' },
  { value: '18mg', label: '18mg' },
  { value: '20mg', label: '20mg' },
  { value: '25mg', label: '25mg' },
  { value: '30mg', label: '30mg' },
  { value: '35mg', label: '35mg' },
  { value: '40mg', label: '40mg' },
  { value: '45mg', label: '45mg' },
  { value: '50mg', label: '50mg' },
]

const VG_PG_OPTIONS = [
  { value: '50/50', label: '50/50' },
  { value: '60/40', label: '60/40' },
  { value: '70/30', label: '70/30' },
  { value: '80/20', label: '80/20' },
  { value: 'Max VG', label: 'Max VG' },
]

// Color options
const COLOR_OPTIONS = [
  { value: 'red', label: 'Red', color: '#FF0000' },
  { value: 'blue', label: 'Blue', color: '#0000FF' },
  { value: 'green', label: 'Green', color: '#008000' },
  { value: 'yellow', label: 'Yellow', color: '#FFFF00' },
  { value: 'orange', label: 'Orange', color: '#FFA500' },
  { value: 'purple', label: 'Purple', color: '#800080' },
  { value: 'pink', label: 'Pink', color: '#FFC0CB' },
  { value: 'black', label: 'Black', color: '#000000' },
  { value: 'white', label: 'White', color: '#FFFFFF' },
  { value: 'gray', label: 'Gray', color: '#808080' },
  { value: 'silver', label: 'Silver', color: '#C0C0C0' },
  { value: 'gold', label: 'Gold', color: '#FFD700' },
  { value: 'transparent', label: 'Transparent', color: 'transparent' },
]

// Detect color from input
const detectColorFromInput = (input) => {
  if (!input || typeof input !== 'string') return null
  
  const normalizedInput = input.toLowerCase().trim()
  const matchedColor = COLOR_OPTIONS.find(color => 
    color.value.toLowerCase() === normalizedInput ||
    color.label.toLowerCase() === normalizedInput
  )
  
  if (matchedColor) return matchedColor
  
  return {
    value: normalizedInput,
    label: input.charAt(0).toUpperCase() + input.slice(1).toLowerCase(),
    color: '#808080',
    isCustom: true
  }
}

// Custom color option component
const ColorOption = ({ innerRef, innerProps, data }) => (
  <div
    ref={innerRef}
    {...innerProps}
    className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer"
  >
    <div
      className="w-4 h-4 rounded-full border border-gray-300"
      style={{ backgroundColor: data.color === 'transparent' ? 'transparent' : data.color }}
    />
    <span>{data.label}</span>
    {data.isCustom && <span className="text-xs text-gray-500">(Custom)</span>}
  </div>
)

// Custom multi-value component with color
const ColorMultiValue = ({ data, removeProps, innerProps }) => (
  <div
    {...innerProps}
    className="flex items-center gap-1 bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-sm mr-1 mb-1"
  >
    <div
      className="w-3 h-3 rounded-full border border-gray-300"
      style={{ backgroundColor: data.color === 'transparent' ? 'transparent' : data.color }}
    />
    <span>{data.label}</span>
    <button
      {...removeProps}
      className="ml-1 text-purple-600 hover:text-purple-800"
    >
      ×
    </button>
  </div>
)

// Select styles
const selectStyles = {
  control: (provided) => ({
    ...provided,
    padding: '6px',
    borderRadius: '12px',
    border: '1px solid #d1d5db',
    boxShadow: 'none',
    minHeight: '45px',
    '&:hover': {
      border: '1px solid #8b5cf6',
    },
    '&:focus-within': {
      border: '1px solid #8b5cf6',
      boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.1)',
    },
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: '#8b5cf6',
    color: 'white',
    borderRadius: '8px',
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: 'white',
    fontSize: '12px',
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: 'white',
    '&:hover': {
      backgroundColor: '#7c3aed',
      color: 'white',
    },
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#8b5cf6' : state.isFocused ? '#f3f4f6' : 'white',
    color: state.isSelected ? 'white' : '#374151',
    '&:hover': {
      backgroundColor: '#f3f4f6',
      color: '#374151',
    },
  }),
}

const colorSelectStyles = {
  ...selectStyles,
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: 'transparent',
    border: 'none',
    margin: 0,
    padding: 0,
  }),
}

// Additional product fields
const ADDITIONAL_FIELDS_CONFIG = [
  { key: 'bottleSizes', label: 'Bottle Sizes', icon: PillBottle },
  { key: 'bottleType', label: 'Bottle Type', icon: Package },
  { key: 'unit', label: 'Unit', icon: Hash },
  { key: 'puffs', label: 'Puffs', icon: Zap },
  { key: 'coil', label: 'Coil', icon: Settings },
  { key: 'volume', label: 'Volume', icon: PillBottle },
  { key: 'charging', label: 'Charging', icon: Battery },
  { key: 'chargingTime', label: 'Charging Time', icon: Clock },
]

// Wholesale categories (static)
const WHOLESALE_CATEGORIES = {
  'E-LIQUID': ['Fruits', 'Bakery & Dessert', 'Tobacco', 'Custard & Cream', 'Coffee', 'Menthol/Mint'],
  'TANKS': ['Rda', 'Rta', 'Rdta', 'Subohm', 'Disposable'],
  'NIC SALTS': ['Fruits', 'Bakery & Dessert', 'Tobacco', 'Custard & Cream', 'Coffee', 'Menthol/Mint'],
  'POD SYSTEM': ['Disposable', 'Refillable Pod Kit', 'Pre-Filled Cartridge'],
  'DEVICE': ['Kit', 'Only Mod'],
  'BORO': ['Alo (Boro)', 'Boro Bridge and Cartridge', 'Boro Accessories And Tools'],
  'ACCESSORIES': ['SubOhm Coil', 'Charger', 'Cotton', 'Premade Coil', 'Battery', 'Tank Glass', 'Cartridge', 'RBA/RBK', 'WIRE SPOOL', 'DRIP TIP'],
}

export default function WholesaleAddEditProduct() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = searchParams.get('id')
  const isEditMode = !!productId

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors },
    reset,
    trigger,
  } = useForm({
    mode: 'onChange',
    defaultValues: {
      name: '',
      brand: '',
      barcode: '',
      category: '',
      subcategory: '',
      price: '',
      buyingPrice: '',
      comparePrice: '',
      description: '',
      tags: '',
      flavor: '',
      resistance: '',
      wattageRange: '',
      bottleSizes: '',
      bottleType: '',
      unit: '',
      puffs: '',
      coil: '',
      volume: '',
      charging: '',
      chargingTime: '',
      status: 'active',
      stock: 0,
      nicotineStrength: [],
      vgPgRatio: [],
      colors: [],
    },
  })

  const [subCategoryOptions, setSubCategoryOptions] = useState([])
  const [images, setImages] = useState([])
  const [existingImages, setExistingImages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [additionalFields, setAdditionalFields] = useState({
    bottleSizes: false,
    bottleType: false,
    unit: false,
    puffs: false,
    coil: false,
    volume: false,
    charging: false,
    chargingTime: false,
  })
  const [productFeatures, setProductFeatures] = useState([{ id: 1, value: '' }])
  const [eachSetContains, setEachSetContains] = useState([{ id: 1, value: '' }])
  const [showFeatures, setShowFeatures] = useState(false)
  const [showEachSetContains, setShowEachSetContains] = useState(false)

  const fileInputRef = useRef(null)
  const category = watch('category')

  // Load product for editing
  useEffect(() => {
    if (isEditMode && productId) {
      loadProduct(productId)
    }
  }, [isEditMode, productId])

  const loadProduct = async (id) => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('auth-token')
      const response = await fetch(`/api/uttara_wholesale_products?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) throw new Error('Failed to load product')

      const product = await response.json()
      
      // Set basic fields
      setValue('name', product.name || '')
      setValue('brand', product.brand || '')
      setValue('barcode', product.barcode || '')
      setValue('category', product.category || '')
      setValue('subcategory', product.subcategory || '')
      setValue('price', product.price || '')
      setValue('buyingPrice', product.buyingPrice || '')
      setValue('comparePrice', product.comparePrice || '')
      setValue('description', product.description || '')
      setValue('flavor', product.flavor || '')
      setValue('resistance', product.resistance || '')
      setValue('wattageRange', product.wattageRange || '')
      setValue('status', product.status || 'active')
      setValue('stock', product.stock || 0)
      setValue('tags', product.tags?.join(', ') || '')

      // Set additional fields
      if (product.bottleSizes) {
        setAdditionalFields(prev => ({ ...prev, bottleSizes: true }))
        setValue('bottleSizes', product.bottleSizes)
      }
      if (product.bottleType) {
        setAdditionalFields(prev => ({ ...prev, bottleType: true }))
        setValue('bottleType', product.bottleType)
      }
      if (product.unit) {
        setAdditionalFields(prev => ({ ...prev, unit: true }))
        setValue('unit', product.unit)
      }
      if (product.puffs) {
        setAdditionalFields(prev => ({ ...prev, puffs: true }))
        setValue('puffs', product.puffs)
      }
      if (product.coil) {
        setAdditionalFields(prev => ({ ...prev, coil: true }))
        setValue('coil', product.coil)
      }
      if (product.volume) {
        setAdditionalFields(prev => ({ ...prev, volume: true }))
        setValue('volume', product.volume)
      }
      if (product.charging) {
        setAdditionalFields(prev => ({ ...prev, charging: true }))
        setValue('charging', product.charging)
      }
      if (product.chargingTime) {
        setAdditionalFields(prev => ({ ...prev, chargingTime: true }))
        setValue('chargingTime', product.chargingTime)
      }

      // Set branch specifications
      if (product.branchSpecifications?.uttara_wholesale) {
        const branchSpec = product.branchSpecifications.uttara_wholesale
        
        if (branchSpec.nicotineStrength) {
          const nicValues = Array.isArray(branchSpec.nicotineStrength)
            ? branchSpec.nicotineStrength.map(val => ({ value: val, label: val }))
            : [{ value: branchSpec.nicotineStrength, label: branchSpec.nicotineStrength }]
          setValue('nicotineStrength', nicValues)
        }

        if (branchSpec.vgPgRatio) {
          const vgValues = Array.isArray(branchSpec.vgPgRatio)
            ? branchSpec.vgPgRatio.map(val => ({ value: val, label: val }))
            : [{ value: branchSpec.vgPgRatio, label: branchSpec.vgPgRatio }]
          setValue('vgPgRatio', vgValues)
        }

        if (branchSpec.colors) {
          const colorValues = Array.isArray(branchSpec.colors)
            ? branchSpec.colors.map(colorValue => {
                const detected = detectColorFromInput(colorValue)
                return detected || { value: colorValue, label: colorValue, color: '#808080' }
              })
            : [detectColorFromInput(branchSpec.colors) || { value: branchSpec.colors, label: branchSpec.colors, color: '#808080' }]
          setValue('colors', colorValues)
        }
      }

      // Set features
      if (product.features && product.features.length > 0) {
        setShowFeatures(true)
        setProductFeatures(product.features.map((f, idx) => ({
          id: idx + 1,
          value: f.replace(/^\d+\.\s*/, '')
        })))
      }

      // Set each set contains
      if (product.eachSetContains && product.eachSetContains.length > 0) {
        setShowEachSetContains(true)
        setEachSetContains(product.eachSetContains.map((item, idx) => ({
          id: idx + 1,
          value: item.replace(/^\d+\.\s*/, '')
        })))
      }

      // Set existing images
      if (product.images && product.images.length > 0) {
        setExistingImages(product.images)
      }

    } catch (error) {
      console.error('Error loading product:', error)
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load product data',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Update subcategory options when category changes
  useEffect(() => {
    if (category && WHOLESALE_CATEGORIES[category]) {
      setSubCategoryOptions(WHOLESALE_CATEGORIES[category])
    } else {
      setSubCategoryOptions([])
    }
  }, [category])

  // Feature management
  const addFeature = () => {
    const newId = Math.max(...productFeatures.map(f => f.id)) + 1
    setProductFeatures([...productFeatures, { id: newId, value: '' }])
  }

  const removeFeature = (id) => {
    if (productFeatures.length > 1) {
      setProductFeatures(productFeatures.filter(f => f.id !== id))
    }
  }

  const updateFeature = (id, value) => {
    setProductFeatures(productFeatures.map(f => 
      f.id === id ? { ...f, value } : f
    ))
  }

  // Each set contains management
  const addEachSetItem = () => {
    const newId = Math.max(...eachSetContains.map(f => f.id)) + 1
    setEachSetContains([...eachSetContains, { id: newId, value: '' }])
  }

  const removeEachSetItem = (id) => {
    if (eachSetContains.length > 1) {
      setEachSetContains(eachSetContains.filter(f => f.id !== id))
    }
  }

  const updateEachSetItem = (id, value) => {
    setEachSetContains(eachSetContains.map(f => 
      f.id === id ? { ...f, value } : f
    ))
  }

  const toggleAdditionalField = (fieldKey) => {
    setAdditionalFields(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey]
    }))
  }

  const handleBarcodeScan = async (data) => {
    try {
      if (data) {
        const token = localStorage.getItem('auth-token')
        const response = await fetch(`/api/uttara_wholesale_products?barcode=${data}`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (response.ok) {
          const productData = await response.json()
          if (productData.products && productData.products.length > 0) {
            const product = productData.products[0]
            // Auto-fill form with scanned product data
            setValue('name', product.name || '')
            setValue('brand', product.brand || '')
            setValue('barcode', data)
            setValue('price', product.price || '')
            setValue('category', product.category || '')
            setValue('subcategory', product.subcategory || '')
            setValue('description', product.description || '')

            MySwal.fire({
              icon: 'success',
              title: 'Product Found!',
              text: 'Product data loaded from barcode',
              timer: 2000,
              showConfirmButton: false,
              toast: true,
              position: 'top-end',
            })
          } else {
            setValue('barcode', data)
            MySwal.fire({
              icon: 'info',
              title: 'Product Not Found',
              text: 'Barcode filled - enter details manually',
              timer: 3000,
              showConfirmButton: false,
              toast: true,
              position: 'top-end',
            })
          }
        } else {
          setValue('barcode', data)
        }
        setShowBarcodeScanner(false)
      }
    } catch (error) {
      console.error('Barcode scan error:', error)
      setValue('barcode', data)
      setShowBarcodeScanner(false)
    }
  }

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files)
    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9),
    }))
    setImages((prev) => [...prev, ...newImages])
  }

  const removeImage = (imageId) => {
    setImages((prev) => prev.filter((img) => img.id !== imageId))
    const imageToRemove = images.find((img) => img.id === imageId)
    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.preview)
    }
  }

  const removeExistingImage = async (publicId) => {
    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch(
        `/api/uttara_wholesale_products?productId=${productId}&imagePublicId=${publicId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      if (response.ok) {
        setExistingImages(prev => prev.filter(img => img.publicId !== publicId))
        MySwal.fire({
          icon: 'success',
          title: 'Image Deleted',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
        })
      }
    } catch (error) {
      console.error('Error deleting image:', error)
    }
  }

  const onSubmit = async (data) => {
    const isFormValid = await trigger()
    
    if (!isFormValid) {
      const errorMessages = Object.entries(errors)
        .map(([field, error]) => `${field}: ${error.message}`)
        .join('\n')
      
      MySwal.fire({
        icon: 'error',
        title: 'Form Validation Failed',
        html: `<pre style="text-align: left; font-size: 12px;">${errorMessages || 'Please fill in all required fields'}</pre>`,
        confirmButtonColor: '#8B5CF6',
      })
      return
    }

    setIsLoading(true)
    try {
      // Process branch specifications
      const branchSpecifications = {
        uttara_wholesale: {
          nicotineStrength: data.nicotineStrength?.map(item => item.value) || [],
          vgPgRatio: data.vgPgRatio?.map(item => item.value) || [],
          colors: data.colors?.map(item => item.value) || [],
        }
      }

      // Process additional fields
      const additionalFieldsData = {}
      ADDITIONAL_FIELDS_CONFIG.forEach(field => {
        if (additionalFields[field.key] && data[field.key]) {
          additionalFieldsData[field.key] = data[field.key]
        }
      })

      // Process features
      const featuresData = showFeatures ? productFeatures
        .filter(f => f.value.trim() !== '')
        .map((f, index) => `${index + 1}. ${f.value.trim()}`) : []

      const eachSetContainsData = showEachSetContains ? eachSetContains
        .filter(f => f.value.trim() !== '')
        .map((f, index) => `${index + 1}. ${f.value.trim()}`) : []

      const processedData = {
        ...data,
        action: isEditMode ? 'update' : undefined,
        id: isEditMode ? productId : undefined,
        stock: parseInt(data.stock) || 0,
        branchSpecifications,
        ...additionalFieldsData,
        features: featuresData,
        eachSetContains: eachSetContainsData,
        resistance: data.resistance || null,
        wattageRange: data.wattageRange || null,
        tags: data.tags ? data.tags.split(',').map((tag) => tag.trim()) : [],
      }

      const token = localStorage.getItem('auth-token')
      const response = await fetch('/api/uttara_wholesale_products', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(processedData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save product')
      }

      const result = await response.json()
      const savedProductId = isEditMode ? productId : result.product._id

      // Upload new images
      if (images.length > 0) {
        const formData = new FormData()
        formData.append('productId', savedProductId)
        images.forEach((image) => {
          formData.append('images', image.file)
        })

        const imageResponse = await fetch('/api/uttara_wholesale_products', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })

        if (!imageResponse.ok) {
          console.error('Image upload failed')
        }
      }

      MySwal.fire({
        icon: 'success',
        title: 'Success!',
        text: `Product ${isEditMode ? 'updated' : 'added'} successfully!`,
        confirmButtonColor: '#8B5CF6',
      }).then(() => {
        if (!isEditMode) {
          // Reset form for add mode
          reset()
          setImages([])
          setExistingImages([])
          setProductFeatures([{ id: 1, value: '' }])
          setEachSetContains([{ id: 1, value: '' }])
          setShowFeatures(false)
          setShowEachSetContains(false)
          setAdditionalFields({
            bottleSizes: false,
            bottleType: false,
            unit: false,
            puffs: false,
            coil: false,
            volume: false,
            charging: false,
            chargingTime: false,
          })
        } else {
          // Redirect to products list in edit mode
          router.push('/wholesale-admin/products')
        }
      })
    } catch (error) {
      console.error('Error saving product:', error)
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to save product',
        confirmButtonColor: '#8B5CF6',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
            <Package className="text-purple-600" size={40} />
            {isEditMode ? 'Edit' : 'Add'} Wholesale Product
          </h1>
          <p className="text-gray-600">
            Manage Uttara Wholesale inventory
          </p>
        </motion.div>

        {/* Main Form */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
            <div className="flex justify-between items-center">
              <div className="text-white">
                <h2 className="text-2xl font-bold">Product Information</h2>
                <p className="opacity-90">Fill in the details below</p>
              </div>
              {!isEditMode && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowBarcodeScanner(true)}
                  className="bg-white bg-opacity-20 text-purple-500 px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-opacity-30 transition-all"
                >
                  <Scan size={20} />
                  Scan Barcode
                </motion.button>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Basic Info */}
              <div className="space-y-6">
                {/* Basic Information */}
                <motion.div variants={itemVariants} className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <Package size={20} className="text-purple-600" />
                    Basic Information
                  </h3>

                  {/* Product Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      {...register('name', {
                        required: 'Product name is required',
                        minLength: { value: 1, message: 'Name must be at least 1 character' }
                      })}
                      placeholder="Enter product name"
                      className="w-full p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <AnimatePresence>
                      {errors.name && (
                        <motion.span
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-red-500 text-sm flex items-center gap-1 mt-1"
                        >
                          <AlertCircle size={16} /> {errors.name.message}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Brand */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand
                    </label>
                    <input
                      type="text"
                      {...register('brand')}
                      placeholder="Enter brand name"
                      className="w-full p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Barcode */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Barcode
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        {...register('barcode')}
                        placeholder="Enter or scan barcode"
                        className="w-full p-4 pr-12 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <Hash
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                        size={20}
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Categories */}
                <motion.div variants={itemVariants} className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <Tag size={20} className="text-purple-600" />
                    Categories
                  </h3>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      {...register('category', { required: 'Category is required' })}
                      className="w-full p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    >
                      <option value="">Select Category</option>
                      {Object.keys(WHOLESALE_CATEGORIES).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <AnimatePresence>
                      {errors.category && (
                        <motion.span
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-red-500 text-sm flex items-center gap-1 mt-1"
                        >
                          <AlertCircle size={16} /> {errors.category.message}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Subcategory */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subcategory *
                    </label>
                    <select
                      {...register('subcategory', { required: 'Subcategory is required' })}
                      className="w-full p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    >
                      <option value="">Select Subcategory</option>
                      {subCategoryOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <AnimatePresence>
                      {errors.subcategory && (
                        <motion.span
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-red-500 text-sm flex items-center gap-1 mt-1"
                        >
                          <AlertCircle size={16} /> {errors.subcategory.message}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* Pricing */}
                <motion.div variants={itemVariants} className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <DollarSign size={20} className="text-purple-600" />
                    Pricing
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Selling Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Selling Price *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          {...register('price', {
                            required: 'Selling price is required',
                            min: 0,
                          })}
                          placeholder="0.00"
                          className="w-full p-4 pl-12 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <DollarSign
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                          size={20}
                        />
                      </div>
                      <AnimatePresence>
                        {errors.price && (
                          <motion.span
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-red-500 text-sm flex items-center gap-1 mt-1"
                          >
                            <AlertCircle size={16} /> {errors.price.message}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Buying Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Buying Price
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          {...register('buyingPrice', { min: 0 })}
                          placeholder="0.00"
                          className="w-full p-4 pl-12 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <DollarSign
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                          size={20}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Cost price</p>
                    </div>

                    {/* Compare Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Compare Price
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          {...register('comparePrice', { min: 0 })}
                          placeholder="0.00"
                          className="w-full p-4 pl-12 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <DollarSign
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                          size={20}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Original price</p>
                    </div>
                  </div>
                </motion.div>

                {/* Stock */}
                <motion.div variants={itemVariants} className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <Store size={20} className="text-purple-600" />
                    Stock
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Wholesale Stock Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('stock')}
                      className="w-full p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </motion.div>

                {/* Additional Fields */}
                <motion.div variants={itemVariants} className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <Settings size={20} className="text-purple-600" />
                    Additional Fields
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ADDITIONAL_FIELDS_CONFIG.map((field) => {
                      const IconComponent = field.icon
                      return (
                        <div key={field.key} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <IconComponent size={16} className="text-purple-600" />
                              <label className="text-sm font-medium text-gray-700">
                                {field.label}
                              </label>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleAdditionalField(field.key)}
                              className={`p-1 rounded-lg transition-colors ${
                                additionalFields[field.key]
                                  ? 'text-purple-600 hover:bg-purple-100'
                                  : 'text-gray-400 hover:bg-gray-200'
                              }`}
                            >
                              {additionalFields[field.key] ? (
                                <ToggleRight size={20} />
                              ) : (
                                <ToggleLeft size={20} />
                              )}
                            </button>
                          </div>
                          
                          <AnimatePresence>
                            {additionalFields[field.key] && (
                              <motion.input
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                type="text"
                                {...register(field.key)}
                                placeholder={`Enter ${field.label.toLowerCase()}`}
                                className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                              />
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>

                {/* Features */}
                <motion.div variants={itemVariants} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                      <List size={20} className="text-purple-600" />
                      Product Features
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowFeatures(!showFeatures)}
                      className={`p-2 rounded-lg transition-colors ${
                        showFeatures
                          ? 'text-purple-600 hover:bg-purple-100'
                          : 'text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {showFeatures ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                  </div>

                  <AnimatePresence>
                    {showFeatures && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-gray-50 rounded-lg p-4 space-y-3"
                      >
                        {productFeatures.map((feature, index) => (
                          <div key={feature.id} className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600 w-8">
                              {index + 1}.
                            </span>
                            <input
                              type="text"
                              value={feature.value}
                              onChange={(e) => updateFeature(feature.id, e.target.value)}
                              placeholder={`Feature ${index + 1}`}
                              className="flex-1 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                            />
                            {productFeatures.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeFeature(feature.id)}
                                className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50"
                              >
                                <Minus size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                        
                        <button
                          type="button"
                          onClick={addFeature}
                          className="w-full p-3 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:border-purple-400 hover:text-purple-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus size={16} />
                          Add Feature
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Each Set Contains */}
                <motion.div variants={itemVariants} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                      <Package size={20} className="text-purple-600" />
                      Each Set Contains
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowEachSetContains(!showEachSetContains)}
                      className={`p-2 rounded-lg transition-colors ${
                        showEachSetContains
                          ? 'text-purple-600 hover:bg-purple-100'
                          : 'text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {showEachSetContains ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                  </div>

                  <AnimatePresence>
                    {showEachSetContains && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-gray-50 rounded-lg p-4 space-y-3"
                      >
                        {eachSetContains.map((item, index) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600 w-8">
                              {index + 1}.
                            </span>
                            <input
                              type="text"
                              value={item.value}
                              onChange={(e) => updateEachSetItem(item.id, e.target.value)}
                              placeholder={`Item ${index + 1}`}
                              className="flex-1 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                            />
                            {eachSetContains.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeEachSetItem(item.id)}
                                className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50"
                              >
                                <Minus size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                        
                        <button
                          type="button"
                          onClick={addEachSetItem}
                          className="w-full p-3 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:border-purple-400 hover:text-purple-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus size={16} />
                          Add Item
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              {/* Right Column - Specifications & Images */}
              <div className="space-y-6">
                {/* Vape Specifications */}
                <motion.div variants={itemVariants} className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <Zap size={20} className="text-purple-600" />
                    Vape Specifications
                  </h3>

                  <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                    {/* Nicotine Strength */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nicotine Strength (Multiple)
                      </label>
                      <Controller
                        name="nicotineStrength"
                        control={control}
                        render={({ field }) => (
                          <Select
                            {...field}
                            options={NICOTINE_OPTIONS}
                            isMulti
                            closeMenuOnSelect={false}
                            placeholder="Select strengths..."
                            styles={selectStyles}
                          />
                        )}
                      />
                    </div>

                    {/* VG/PG Ratio */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        VG/PG Ratio (Multiple)
                      </label>
                      <Controller
                        name="vgPgRatio"
                        control={control}
                        render={({ field }) => (
                          <Select
                            {...field}
                            options={VG_PG_OPTIONS}
                            isMulti
                            closeMenuOnSelect={false}
                            placeholder="Select ratios..."
                            styles={selectStyles}
                          />
                        )}
                      />
                    </div>

                    {/* Colors */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Palette size={16} className="text-purple-600" />
                        Colors (Multiple)
                      </label>
                      <Controller
                        name="colors"
                        control={control}
                        render={({ field }) => (
                          <CreatableSelect
                            {...field}
                            options={COLOR_OPTIONS}
                            isMulti
                            closeMenuOnSelect={false}
                            placeholder="Type or select colors..."
                            styles={colorSelectStyles}
                            components={{
                              Option: ColorOption,
                              MultiValue: ColorMultiValue,
                            }}
                            formatCreateLabel={(inputValue) =>
                              `Add "${inputValue}" color`
                            }
                            onCreateOption={(inputValue) => {
                              const newColor = detectColorFromInput(inputValue)
                              if (newColor) {
                                const currentColors = field.value || []
                                field.onChange([...currentColors, newColor])
                              }
                            }}
                          />
                        )}
                      />
                    </div>

                    {/* General Specs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Resistance
                        </label>
                        <input
                          type="text"
                          {...register('resistance')}
                          placeholder="e.g., 0.5Ω"
                          className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Wattage Range
                        </label>
                        <input
                          type="text"
                          {...register('wattageRange')}
                          placeholder="e.g., 5-80W"
                          className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Flavor
                      </label>
                      <input
                        type="text"
                        {...register('flavor')}
                        placeholder="Enter flavor profile"
                        className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Image Upload */}
                <motion.div variants={itemVariants} className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <ImageIcon size={20} className="text-purple-600" />
                    Product Images
                  </h3>

                  {/* Existing Images */}
                  {existingImages.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Existing Images:</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        {existingImages.map((image) => (
                          <div key={image.publicId} className="relative group">
                            <img
                              src={image.url}
                              alt={image.alt}
                              className="w-full h-32 object-cover rounded-xl"
                            />
                            <button
                              type="button"
                              onClick={() => removeExistingImage(image.publicId)}
                              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-2 border-dashed border-purple-300 rounded-xl p-6 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Upload
                      className="mx-auto text-purple-400 mb-4"
                      size={48}
                    />
                    <p className="text-gray-600 mb-4">
                      Drag & drop images or click to browse
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                    >
                      Choose Files
                    </button>
                  </div>

                  {/* New Image Previews */}
                  {images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {images.map((image) => (
                        <div key={image.id} className="relative group">
                          <img
                            src={image.preview}
                            alt="Preview"
                            className="w-full h-32 object-cover rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(image.id)}
                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>

                {/* Status */}
                <motion.div variants={itemVariants} className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <Settings size={20} className="text-purple-600" />
                    Status
                  </h3>
                  <select
                    {...register('status')}
                    className="w-full p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                  </select>
                </motion.div>
              </div>
            </div>

            {/* Description & Tags */}
            <motion.div variants={itemVariants} className="mt-8 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={4}
                  placeholder="Enter product description"
                  className="w-full p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  {...register('tags')}
                  placeholder="e.g., sweet, fruity, popular"
                  className="w-full p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t border-gray-200"
            >
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/wholesale-admin/products')}
                className="flex-1 py-4 px-6 bg-gray-100 text-gray-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
              >
                <X size={20} />
                Cancel
              </motion.button>

              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={!isLoading ? { scale: 1.02 } : {}}
                whileTap={!isLoading ? { scale: 0.98 } : {}}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    {isEditMode ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    {isEditMode ? 'Update Product' : 'Add Product'}
                  </>
                )}
              </motion.button>
            </motion.div>
          </form>
        </motion.div>

        {/* Barcode Scanner Modal */}
        <AnimatePresence>
          {showBarcodeScanner && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-8 max-w-md w-full mx-4"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Scan size={24} className="text-purple-600" />
                    Barcode Scanner
                  </h3>
                  <button
                    onClick={() => setShowBarcodeScanner(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="bg-gray-100 rounded-xl p-4 mb-4">
                  <BarcodeReader
                    onError={(err) => console.error(err)}
                    onScan={handleBarcodeScan}
                    style={{ width: '100%' }}
                  />
                  <p className="text-gray-600 text-center mt-2">
                    Position barcode in the frame
                  </p>
                </div>

                <button
                  onClick={() => setShowBarcodeScanner(false)}
                  className="w-full py-3 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

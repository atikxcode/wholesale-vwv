'use client'

import { useState, useEffect, useContext, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import Swal from 'sweetalert2'
import Select from 'react-select'
import CreatableSelect from 'react-select/creatable'
import {
  Package,
  Edit,
  Trash2,
  Search,
  Filter,
  Plus,
  DollarSign,
  Store,
  Image as ImageIcon,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  X,
  Upload,
  Save,
  ArrowLeft,
  Settings,
  Tag,
  Hash,
  Palette,
  PillBottle,
  Battery,
  Clock,
  Zap,
  List,
  Minus,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { AuthContext } from '../../../../Provider/AuthProvider'

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

// Product Card Component
const ProductCard = ({ product, onEdit, onDelete, onView }) => {
  const mainImage = product.images && product.images.length > 0 ? product.images[0].url : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
    >
      {/* Image */}
      <div className="relative h-48 bg-gradient-to-br from-purple-100 to-indigo-100">
        {mainImage ? (
          <img
            src={mainImage}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <ImageIcon size={48} className="text-gray-400" />
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          {product.status === 'active' ? (
            <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs">
              Active
            </span>
          ) : (
            <span className="bg-gray-500 text-white px-2 py-1 rounded-full text-xs">
              Inactive
            </span>
          )}
        </div>
        {product.comparePrice && product.comparePrice > product.price && (
          <div className="absolute top-2 left-2">
            <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
              SALE
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
          {product.name}
        </h3>
        {product.brand && (
          <p className="text-sm text-gray-500 mb-2">{product.brand}</p>
        )}

        <div className="flex items-center gap-2 mb-2">
          <span className="text-purple-600 font-bold text-xl">
            ৳{product.price}
          </span>
          {product.comparePrice && product.comparePrice > product.price && (
            <span className="text-gray-400 line-through text-sm">
              ৳{product.comparePrice}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <Store size={14} />
          <span>Stock: {product.stock || 0}</span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
            {product.category}
          </span>
          {product.subcategory && (
            <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs">
              {product.subcategory}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onView(product)}
            className="flex-1 py-2 px-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-1 text-sm"
          >
            <Eye size={14} />
            View
          </button>
          <button
            onClick={() => onEdit(product)}
            className="flex-1 py-2 px-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-1 text-sm"
          >
            <Edit size={14} />
            Edit
          </button>
          <button
            onClick={() => onDelete(product._id)}
            className="py-2 px-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center text-sm"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// Product Details Modal
const ProductDetailsModal = ({ product, isOpen, onClose }) => {
  if (!isOpen || !product) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl max-w-4xl w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Product Details</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Images */}
          {product.images && product.images.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Images</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {product.images.map((image, index) => (
                  <img
                    key={index}
                    src={image.url}
                    alt={image.alt}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Name:</span>
                  <p className="text-gray-900">{product.name}</p>
                </div>
                {product.brand && (
                  <div>
                    <span className="font-medium text-gray-600">Brand:</span>
                    <p className="text-gray-900">{product.brand}</p>
                  </div>
                )}
                {product.barcode && (
                  <div>
                    <span className="font-medium text-gray-600">Barcode:</span>
                    <p className="text-gray-900">{product.barcode}</p>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-600">Category:</span>
                  <p className="text-gray-900">{product.category} / {product.subcategory}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Status:</span>
                  <p className={`inline-block px-2 py-1 rounded ${
                    product.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {product.status}
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Pricing</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Selling Price:</span>
                  <p className="text-gray-900 font-bold text-lg">৳{product.price}</p>
                </div>
                {product.buyingPrice > 0 && (
                  <div>
                    <span className="font-medium text-gray-600">Buying Price:</span>
                    <p className="text-gray-900">৳{product.buyingPrice}</p>
                  </div>
                )}
                {product.comparePrice && (
                  <div>
                    <span className="font-medium text-gray-600">Compare Price:</span>
                    <p className="text-gray-900">৳{product.comparePrice}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Stock */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Stock</h3>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Store className="text-purple-600" size={20} />
                  <span className="font-medium">Wholesale:</span>
                  <span className="font-bold text-lg">{product.stock || 0}</span>
                </div>
              </div>
            </div>

            {/* Vape Specifications */}
            {(product.flavor || product.resistance || product.wattageRange) && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Specifications</h3>
                <div className="space-y-2 text-sm">
                  {product.flavor && (
                    <div>
                      <span className="font-medium text-gray-600">Flavor:</span>
                      <p className="text-gray-900">{product.flavor}</p>
                    </div>
                  )}
                  {product.resistance && (
                    <div>
                      <span className="font-medium text-gray-600">Resistance:</span>
                      <p className="text-gray-900">{product.resistance}</p>
                    </div>
                  )}
                  {product.wattageRange && (
                    <div>
                      <span className="font-medium text-gray-600">Wattage:</span>
                      <p className="text-gray-900">{product.wattageRange}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Description</h3>
              <p className="text-gray-700 text-sm">{product.description}</p>
            </div>
          )}

          {/* Features */}
          {product.features && product.features.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Features</h3>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {product.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Each Set Contains */}
          {product.eachSetContains && product.eachSetContains.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Each Set Contains</h3>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {product.eachSetContains.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// Main Component
export default function WholesaleProductsManagement() {
  const { user } = useContext(AuthContext)
  const router = useRouter()
  
  // State
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSubcategory, setSelectedSubcategory] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [productsPerPage] = useState(12)
  const [sortBy, setSortBy] = useState('newest')
  const [showFilters, setShowFilters] = useState(false)
  
  // Edit/View state
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [viewProduct, setViewProduct] = useState(null)
  const [showProductModal, setShowProductModal] = useState(false)

  // Edit form states
  const [subCategoryOptions, setSubCategoryOptions] = useState([])
  const [images, setImages] = useState([])
  const [existingImages, setExistingImages] = useState([])
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

  const category = watch('category')

  // Auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth-token')
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  // Check authentication
  const checkAuth = () => {
    const token = localStorage.getItem('auth-token')
    if (!token) {
      router.push('/login')
      return false
    }
    return true
  }

  // Load categories
  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/uttara_wholesale_products?getCategories=true', {
        headers: getAuthHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        if (data.categories) {
          setCategories(data.categories)
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  // Update subcategories when category changes (for filters)
  useEffect(() => {
    if (selectedCategory && categories.length > 0) {
      const category = categories.find(cat => cat.name === selectedCategory)
      if (category) {
        setSubcategories(category.subcategories || [])
      }
    } else {
      setSubcategories([])
      setSelectedSubcategory('')
    }
  }, [selectedCategory, categories])

  // Update subcategories when category changes in edit form
  useEffect(() => {
    if (category && WHOLESALE_CATEGORIES[category]) {
      setSubCategoryOptions(WHOLESALE_CATEGORIES[category])
    } else {
      setSubCategoryOptions([])
    }
  }, [category])

  // Load products
  useEffect(() => {
    if (user) {
      loadProducts()
    }
  }, [user])

  const loadProducts = async () => {
    if (!checkAuth()) return

    try {
      setIsLoading(true)
      const response = await fetch('/api/uttara_wholesale_products?limit=100', {
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to load products')
      }

      const data = await response.json()
      setProducts(data.products || [])
      setFilteredProducts(data.products || [])
    } catch (error) {
      console.error('Error loading products:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load products',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Filter and sort products
  useEffect(() => {
    let filtered = [...products]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category === selectedCategory)
    }

    // Subcategory filter
    if (selectedSubcategory) {
      filtered = filtered.filter(product => product.subcategory === selectedSubcategory)
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(product => product.status === selectedStatus)
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        break
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        break
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price)
        break
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price)
        break
      case 'name-az':
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'name-za':
        filtered.sort((a, b) => b.name.localeCompare(a.name))
        break
      case 'stock-low':
        filtered.sort((a, b) => (a.stock || 0) - (b.stock || 0))
        break
      case 'stock-high':
        filtered.sort((a, b) => (b.stock || 0) - (a.stock || 0))
        break
      default:
        break
    }

    setFilteredProducts(filtered)
    setCurrentPage(1)
  }, [searchTerm, selectedCategory, selectedSubcategory, selectedStatus, sortBy, products])

  // Pagination
  const indexOfLastProduct = currentPage * productsPerPage
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct)
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage)

  // Handle edit
const handleEdit = async (product) => {
  setSelectedProduct(product)
  setEditMode(true)

  // Set basic fields
  setValue('name', product.name || '')
  setValue('brand', product.brand || '')
  setValue('barcode', product.barcode || '')
  setValue('category', product.category || '')
  
  // 🔥 FIX: Update subcategory options immediately after category is set
  if (product.category && WHOLESALE_CATEGORIES[product.category]) {
    setSubCategoryOptions(WHOLESALE_CATEGORIES[product.category])
  }
  
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
  }

  // Handle view
  const handleView = (product) => {
    setViewProduct(product)
    setShowProductModal(true)
  }

  // Handle delete
  const handleDelete = async (productId) => {
    if (!checkAuth()) return

    const result = await Swal.fire({
      title: 'Delete Product?',
      text: 'This will permanently delete the product and all its images!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    })

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/uttara_wholesale_products?productId=${productId}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        })

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login')
            return
          }
          throw new Error('Failed to delete product')
        }

        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Product has been deleted.',
          timer: 2000,
          showConfirmButton: false,
        })

        loadProducts()
      } catch (error) {
        console.error('Error deleting product:', error)
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to delete product',
        })
      }
    }
  }

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCategory('')
    setSelectedSubcategory('')
    setSelectedStatus('all')
    setSortBy('newest')
  }

  // Cancel edit
  const cancelEdit = () => {
    setEditMode(false)
    setSelectedProduct(null)
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
  }

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
        `/api/uttara_wholesale_products?productId=${selectedProduct._id}&imagePublicId=${publicId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      if (response.ok) {
        setExistingImages(prev => prev.filter(img => img.publicId !== publicId))
        Swal.fire({
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

  // Submit edit
  const onSubmitEdit = async (data) => {
    const isFormValid = await trigger()
    
    if (!isFormValid) {
      const errorMessages = Object.entries(errors)
        .map(([field, error]) => `${field}: ${error.message}`)
        .join('\n')
      
      Swal.fire({
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
        action: 'update',
        id: selectedProduct._id,
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
        throw new Error(errorData.error || 'Failed to update product')
      }

      // Upload new images
      if (images.length > 0) {
        const formData = new FormData()
        formData.append('productId', selectedProduct._id)
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

      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Product updated successfully!',
        confirmButtonColor: '#8B5CF6',
      }).then(() => {
        cancelEdit()
        loadProducts()
      })
    } catch (error) {
      console.error('Error updating product:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update product',
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

  // If in edit mode, show edit form
  if (editMode && selectedProduct) {
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
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={cancelEdit}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={24} />
                Back to Products
              </button>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
              <Edit className="text-purple-600" size={40} />
              Edit Product
            </h1>
            <p className="text-gray-600">
              Update product information
            </p>
          </motion.div>

          {/* Main Form */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
              <div className="text-white">
                <h2 className="text-2xl font-bold">Product Information</h2>
                <p className="opacity-90">Update the details below</p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmitEdit)} className="p-8">
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
                          placeholder="Enter barcode"
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
                  onClick={cancelEdit}
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
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      Update Product
                    </>
                  )}
                </motion.button>
              </motion.div>
            </form>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  // List view
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Package className="text-purple-600" size={36} />
                Wholesale Products
              </h1>
              <p className="text-gray-600 mt-1">
                Manage Uttara wholesale inventory • {filteredProducts.length} products
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadProducts}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
              <button
                onClick={() => router.push('/admin/AdminAddProduct')}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                Add Product
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Filter size={20} className="text-purple-600" />
              Filters & Search
            </h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden px-4 py-2 bg-purple-100 text-purple-700 rounded-lg"
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>
          </div>

          <div className={`space-y-4 ${showFilters ? 'block' : 'hidden md:block'}`}>
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, brand, or barcode..."
                className="w-full p-3 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Category */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>

              {/* Subcategory */}
              <select
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
                className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                disabled={!selectedCategory}
              >
                <option value="">All Subcategories</option>
                {subcategories.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>

              {/* Status */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name-az">Name (A-Z)</option>
                <option value="name-za">Name (Z-A)</option>
                <option value="price-low">Price (Low-High)</option>
                <option value="price-high">Price (High-Low)</option>
                <option value="stock-low">Stock (Low-High)</option>
                <option value="stock-high">Stock (High-Low)</option>
              </select>
            </div>

            {/* Active Filters */}
            {(searchTerm || selectedCategory || selectedSubcategory || selectedStatus !== 'all') && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600">Active filters:</span>
                {searchTerm && (
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    Search: {searchTerm}
                    <button onClick={() => setSearchTerm('')}>
                      <X size={14} />
                    </button>
                  </span>
                )}
                {selectedCategory && (
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    {selectedCategory}
                    <button onClick={() => setSelectedCategory('')}>
                      <X size={14} />
                    </button>
                  </span>
                )}
                {selectedSubcategory && (
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    {selectedSubcategory}
                    <button onClick={() => setSelectedSubcategory('')}>
                      <X size={14} />
                    </button>
                  </span>
                )}
                {selectedStatus !== 'all' && (
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    {selectedStatus}
                    <button onClick={() => setSelectedStatus('all')}>
                      <X size={14} />
                    </button>
                  </span>
                )}
                <button
                  onClick={clearFilters}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading products...</p>
            </div>
          </div>
        ) : currentProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
              {currentProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onView={handleView}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white rounded-2xl shadow-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {indexOfFirstProduct + 1} to {Math.min(indexOfLastProduct, filteredProducts.length)} of {filteredProducts.length} products
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </button>
                    <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      Next
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Package size={64} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">No Products Found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || selectedCategory || selectedSubcategory || selectedStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first product'}
            </p>
            {!searchTerm && !selectedCategory && !selectedSubcategory && selectedStatus === 'all' && (
              <button
                onClick={() => router.push('/admin/AdminAddProduct')}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors flex items-center gap-2 mx-auto"
              >
                <Plus size={20} />
                Add Your First Product
              </button>
            )}
          </div>
        )}

        {/* Product Details Modal */}
        <AnimatePresence>
          {showProductModal && (
            <ProductDetailsModal
              product={viewProduct}
              isOpen={showProductModal}
              onClose={() => {
                setShowProductModal(false)
                setViewProduct(null)
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

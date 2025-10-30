// src/app/api/uttara_wholesale_products/route.js

import clientPromise from '../../../../lib/mongodb'
import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { verifyApiToken, createAuthError, checkRateLimit } from '../../../../lib/auth'

// 🔐 SECURITY CONSTANTS
const MAX_IMAGE_SIZE = 100 * 1024 * 1024 // 100MB for admin
const MAX_IMAGES_PER_UPLOAD = 10
const MAX_REQUEST_BODY_SIZE = 50000 // 50KB
const MAX_SEARCH_LENGTH = 100
const MAX_FILENAME_LENGTH = 255
const MAX_DESCRIPTION_WORDS = 2000
const MAX_NAME_LENGTH = 100
const MAX_STOCK = 999999
const MAX_PRICE = 999999

// CONFIGURATION
const COLLECTION_NAME = 'uttara_wholesale_products'
const BRANCH_NAME = 'uttara_wholesale' // Fixed branch for all products

// Rate limiting per role
const RATE_LIMITS = {
  PUBLIC: { requests: 200, windowMs: 60000 },
  ADMIN: { requests: 500, windowMs: 60000 },
  MODERATOR: { requests: 300, windowMs: 60000 },
  POS: { requests: 300, windowMs: 60000 },
  MANAGER: { requests: 400, windowMs: 60000 }
}

// IP-based upload tracking to prevent abuse
const uploadTracker = new Map()

// STATIC CATEGORIES AND SUBCATEGORIES
const STATIC_CATEGORIES = [
  { name: 'E-LIQUID', subcategories: [
    'Fruits', 'Bakery & Dessert', 'Tobacco', 'Custard & Cream', 'Coffee', 'Menthol/Mint'
  ] },
  { name: 'TANKS', subcategories: [
    'Rda', 'Rta', 'Rdta', 'Subohm', 'Disposable'
  ] },
  { name: 'NIC SALTS', subcategories: [
    'Fruits', 'Bakery & Dessert', 'Tobacco', 'Custard & Cream', 'Coffee', 'Menthol/Mint'
  ] },
  { name: 'POD SYSTEM', subcategories: [
    'Disposable', 'Refillable Pod Kit', 'Pre-Filled Cartridge'
  ] },
  { name: 'DEVICE', subcategories: [
    'Kit', 'Only Mod'
  ] },
  { name: 'BORO', subcategories: [
    'Alo (Boro)', 'Boro Bridge and Cartridge', 'Boro Accessories And Tools'
  ] },
  { name: 'ACCESSORIES', subcategories: [
    'SubOhm Coil', 'Charger', 'Cotton', 'Premade Coil', 'Battery', 'Tank Glass', 'Cartridge', 'RBA/RBK', 'WIRE SPOOL', 'DRIP TIP'
  ] }
]

// Validate environment variables
console.log('Checking Cloudinary environment variables...')
if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  console.error('Missing Cloudinary environment variables!')
  throw new Error('Missing required Cloudinary environment variables')
}
console.log('Cloudinary environment variables validated ✓')

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// 🔐 SECURITY: Enhanced request logging
function logRequest(req, method) {
  const timestamp = new Date().toISOString()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
            req.headers.get('x-real-ip') || 
            'unknown'
  const userAgent = req.headers.get('user-agent') || 'unknown'
  console.log(`[${timestamp}] ${method} /api/uttara_wholesale_products - IP: ${ip} - UserAgent: ${userAgent.substring(0, 100)}`)
  console.log('URL:', req.url)
}

// Security: Error handler
function handleApiError(error, context = '') {
  console.error(`🚨 API Error in ${context}:`, error)
  console.error('Error stack:', error.stack)
  const isDevelopment = process.env.NODE_ENV === 'development'
  return NextResponse.json(
    {
      error: isDevelopment ? error.message : 'Internal server error',
      context: isDevelopment ? context : undefined,
      timestamp: new Date().toISOString(),
    },
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  )
}

// Helper: Get user info
async function getUserInfo(req) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { role: 'public', userId: null, isAuthenticated: false }
    }
    // Development mode shortcut
    if (authHeader === 'Bearer temp-admin-token-for-development') {
      console.log('🔧 Using temporary admin token for development')
      return { role: 'admin', userId: 'temp-admin', isAuthenticated: true }
    }
    const user = await verifyApiToken(req)
    return {
      role: user.role || 'user',
      userId: user.userId || user.id,
      email: user.email || null,
      isAuthenticated: true
    }
  } catch (authError) {
    console.log('🔧 Authentication failed, treating as public user:', authError.message)
    return { role: 'public', userId: null, isAuthenticated: false }
  }
}

// 🔐 SECURITY: Get user IP
function getUserIP(req) {
  return req.headers.get('x-forwarded-for')?.split(',')[0] || 
         req.headers.get('x-real-ip') || 
         'unknown'
}

// 🔐 SECURITY: Check upload abuse
function checkUploadAbuse(ip) {
  const now = Date.now()
  const userUploads = uploadTracker.get(ip) || []
  
  // Remove uploads older than 1 hour
  const recentUploads = userUploads.filter(time => now - time < 3600000)
  
  // Allow max 50 uploads per hour per IP
  if (recentUploads.length >= 50) {
    throw new Error('Upload limit exceeded. Try again later.')
  }
  
  recentUploads.push(now)
  uploadTracker.set(ip, recentUploads)
}

// 🔐 SECURITY: Validate ObjectId
function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id)
}

// Input sanitization functions
function sanitizeInput(input) {
  if (typeof input !== 'string') return input
  return input
    .replace(/[<>"'%;()&+${}]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .trim()
    .substring(0, 1000)
}

function sanitizeProductInput(input) {
  if (typeof input !== 'string') return input
  return input
    .replace(/[<>"'%;]/g, '')
    .replace(/\$/g, '')
    .replace(/\{/g, '')
    .replace(/\}/g, '')
    .replace(/\+/g, '')
    .replace(/\(/g, '')
    .replace(/\)/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/expression\(/gi, '')
    .trim()
    .substring(0, 1000)
}

function sanitizeDescriptionInput(input) {
  if (typeof input !== 'string') return input
  
  let sanitized = input
    .replace(/[<>"'%;]/g, '')
    .replace(/\$/g, '')
    .replace(/\{/g, '')
    .replace(/\}/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/expression\(/gi, '')
    .trim()
  
  const words = sanitized.split(/\s+/).filter(word => word.length > 0)
  if (words.length > MAX_DESCRIPTION_WORDS) {
    sanitized = words.slice(0, MAX_DESCRIPTION_WORDS).join(' ')
  }
  
  return sanitized
}

function sanitizeCategoryInput(input) {
  if (typeof input !== 'string') return input
  return input
    .replace(/[<>"'%;]/g, '')
    .replace(/\$/g, '')
    .replace(/\{/g, '')
    .replace(/\}/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/expression\(/gi, '')
    .trim()
    .substring(0, 100)
}

function sanitizeSearchInput(input) {
  if (typeof input !== 'string') return input
  return input
    .replace(/[<>"'%;()&+${}]/g, '')
    .replace(/[\/\\]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/expression\(/gi, '')
    .replace(/\*/g, '')
    .replace(/\?/g, '')
    .trim()
    .substring(0, 100)
}

function sanitizeAndValidateArray(input, fieldName, maxItems = 10, maxLength = 200, useProductSanitizer = false) {
  if (!input) return []
  
  const sanitizer = useProductSanitizer ? sanitizeProductInput : sanitizeInput
  
  if (Array.isArray(input)) {
    return input
      .map(item => sanitizer(String(item)))
      .filter(item => item && item.length > 0 && item.length <= maxLength)
      .slice(0, maxItems)
  }
  
  if (typeof input === 'string' && input.trim()) {
    const sanitized = sanitizer(input)
    return sanitized && sanitized.length <= maxLength ? [sanitized] : []
  }
  
  console.warn(`${fieldName} received invalid format:`, typeof input)
  return []
}

function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') return 'unnamed_file'
  
  let sanitized = filename
    .replace(/[<>"'%;()&+${}]/g, '')
    .replace(/[\/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .trim()
  
  if (sanitized.length > MAX_FILENAME_LENGTH) {
    const extension = sanitized.split('.').pop()
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'))
    const maxNameLength = MAX_FILENAME_LENGTH - extension.length - 1
    
    if (maxNameLength > 0) {
      sanitized = nameWithoutExt.substring(0, maxNameLength) + '.' + extension
    } else {
      sanitized = sanitized.substring(0, MAX_FILENAME_LENGTH)
    }
  }
  
  return sanitized
}

// Helper: strict static category check
function isValidCategoryAndSubcategory(category, subcategory) {
  const foundCat = STATIC_CATEGORIES.find(cat => cat.name.toLowerCase() === category.toLowerCase())
  if (!foundCat) return false
  return foundCat.subcategories.map(s => s.toLowerCase()).includes(subcategory.toLowerCase())
}

// GET: List products, filter by category/subcategory, support pagination
export async function GET(req) {
  logRequest(req, 'GET')
  try {
    const params = new URL(req.url).searchParams
    const id = sanitizeInput(params.get('id'))
    const barcode = sanitizeInput(params.get('barcode'))
    const category = sanitizeCategoryInput(params.get('category'))
    const subcategory = sanitizeCategoryInput(params.get('subcategory'))
    const search = sanitizeSearchInput(params.get('search'))
    const status = sanitizeInput(params.get('status')) || 'active'
    const limit = Math.min(parseInt(params.get('limit') || '20'), 100)
    const page = Math.max(parseInt(params.get('page') || '1'), 1)
    const inStock = params.get('inStock')
    const getCategories = Boolean(params.get('getCategories'))

    const userInfo = await getUserInfo(req)
    const rateLimit = RATE_LIMITS[userInfo.role?.toUpperCase()] || RATE_LIMITS.PUBLIC
    if (typeof checkRateLimit === 'function' && userInfo.role !== 'admin') {
      try {
        checkRateLimit(req, rateLimit)
      } catch (err) {}
    }

    const client = await clientPromise
    const db = client.db('VWV')

    // Return static categories if requested
    if (getCategories) {
      return NextResponse.json({ categories: STATIC_CATEGORIES }, { 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300'
        } 
      })
    }

    // Get single product by ID
    if (id) {
      if (!isValidObjectId(id)) {
        return NextResponse.json({ error: 'Invalid product ID format' }, { status: 400 })
      }

      const { ObjectId } = require('mongodb')
      const product = await db
        .collection(COLLECTION_NAME)
        .findOne({ 
          _id: new ObjectId(id),
          status: userInfo.role === 'public' ? 'active' : status
        })

      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }

      return NextResponse.json(product, {
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': userInfo.role === 'public' ? 'public, max-age=300' : 'private, max-age=60'
        },
      })
    }

    // Get product by barcode
    if (barcode) {
      if (!/^[a-zA-Z0-9\-_]{1,50}$/.test(barcode)) {
        return NextResponse.json({ error: 'Invalid barcode format' }, { status: 400 })
      }

      let product = await db
        .collection(COLLECTION_NAME)
        .findOne({ 
          barcode: barcode.trim(),
          status: userInfo.role === 'public' ? 'active' : status
        })

      if (!product) {
        product = await db.collection(COLLECTION_NAME).findOne({
          barcode: { $regex: `^${barcode.trim()}$`, $options: 'i' },
          status: userInfo.role === 'public' ? 'active' : status
        })
      }

      if (!product) {
        return NextResponse.json(
          {
            products: [],
            pagination: {
              currentPage: 1,
              totalPages: 0,
              totalProducts: 0,
              hasNextPage: false,
              hasPrevPage: false,
            },
          },
          { headers: { 'Content-Type': 'application/json' } }
        )
      }

      return NextResponse.json(
        {
          products: [product],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalProducts: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Build query for filtering
    let query = { status: userInfo.role === 'public' ? 'active' : status }

    if (category) {
      if (category.length > 50) {
        return NextResponse.json({ error: 'Category name too long' }, { status: 400 })
      }
      query.category = { $regex: category, $options: 'i' }
    }

    if (subcategory) {
      if (subcategory.length > 50) {
        return NextResponse.json({ error: 'Subcategory name too long' }, { status: 400 })
      }
      query.subcategory = { $regex: subcategory, $options: 'i' }
    }

    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
        { category: { $regex: safeSearch, $options: 'i' } },
        { subcategory: { $regex: safeSearch, $options: 'i' } },
        { brand: { $regex: safeSearch, $options: 'i' } },
        { barcode: { $regex: safeSearch, $options: 'i' } },
        { tags: { $in: [new RegExp(safeSearch, 'i')] } },
      ]
    }

    if (inStock === 'true') {
      query.stock = { $gt: 0 }
    }

    const totalProducts = await db.collection(COLLECTION_NAME).countDocuments(query)
    const skip = (page - 1) * limit
    const products = await db
      .collection(COLLECTION_NAME)
      .find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json(
      {
        products,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalProducts / limit),
          totalProducts,
          pageSize: limit,
          hasNextPage: skip + products.length < totalProducts,
          hasPrevPage: page > 1,
        }
      },
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return handleApiError(error, 'GET /api/uttara_wholesale_products')
  }
}

// POST: Create new product (Admin only)
export async function POST(req) {
  const ip = getUserIP(req)
  logRequest(req, 'POST')

  try {
    const userInfo = await getUserInfo(req)
    if (!userInfo.isAuthenticated || userInfo.role !== 'admin') {
      return createAuthError('Only admins can create products', 403)
    }

    const body = await req.json()
    const bodySize = JSON.stringify(body).length
    if (bodySize > MAX_REQUEST_BODY_SIZE) {
      return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
    }

    const { action } = body

    const client = await clientPromise
    const db = client.db('VWV')

    // Handle product update
    if (action === 'update') {
      console.log('POST: Updating product:', body.id)
      const productId = sanitizeInput(body.id)

      if (!isValidObjectId(productId)) {
        return NextResponse.json({ error: 'Invalid product ID format' }, { status: 400 })
      }

      const {
        name,
        description,
        price,
        buyingPrice,
        comparePrice,
        brand,
        barcode,
        category,
        subcategory,
        stock,
        status,
        specifications,
        tags,
        branchSpecifications,
        flavor,
        resistance,
        wattageRange,
        imageOrder,
        bottleSizes,
        bottleType,
        unit,
        puffs,
        coil,
        volume,
        charging,
        chargingTime,
        features,
        eachSetContains,
      } = body

      const sanitizedName = sanitizeProductInput(name)
      const sanitizedDescription = sanitizeDescriptionInput(description)
      const sanitizedBrand = sanitizeProductInput(brand)
      const sanitizedBarcode = sanitizeInput(barcode)
      const sanitizedCategory = sanitizeCategoryInput(category)
      const sanitizedSubcategory = sanitizeCategoryInput(subcategory)
      const sanitizedFlavor = sanitizeProductInput(flavor)
      const sanitizedStatus = sanitizeInput(status)
      const sanitizedBottleSizes = sanitizeProductInput(bottleSizes)
      const sanitizedBottleType = sanitizeProductInput(bottleType)
      const sanitizedUnit = sanitizeProductInput(unit)
      const sanitizedPuffs = sanitizeProductInput(puffs)
      const sanitizedCoil = sanitizeProductInput(coil)
      const sanitizedVolume = sanitizeProductInput(volume)
      const sanitizedCharging = sanitizeProductInput(charging)
      const sanitizedChargingTime = sanitizeProductInput(chargingTime)

      if (!sanitizedName || !price || !sanitizedCategory) {
        return NextResponse.json({ error: 'Name, price, and category are required' }, { status: 400 })
      }

      if (sanitizedName.length > MAX_NAME_LENGTH) {
        return NextResponse.json({ error: `Product name too long (max ${MAX_NAME_LENGTH} characters)` }, { status: 400 })
      }

      if (sanitizedDescription && sanitizedDescription.split(/\s+/).length > MAX_DESCRIPTION_WORDS) {
        return NextResponse.json({ error: `Description too long (max ${MAX_DESCRIPTION_WORDS} words)` }, { status: 400 })
      }

      if (!isValidCategoryAndSubcategory(sanitizedCategory, sanitizedSubcategory)) {
        return NextResponse.json({ error: 'Invalid category or subcategory' }, { status: 400 })
      }

      const numPrice = parseFloat(price)
      const numComparePrice = comparePrice ? parseFloat(comparePrice) : null

      if (isNaN(numPrice) || numPrice < 0 || numPrice > MAX_PRICE) {
        return NextResponse.json({ error: 'Invalid price value' }, { status: 400 })
      }

      if (sanitizedStatus && !['active', 'inactive', 'draft'].includes(sanitizedStatus)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
      }

      if (stock !== undefined) {
        const stockNum = parseInt(stock)
        if (isNaN(stockNum) || stockNum < 0 || stockNum > MAX_STOCK) {
          return NextResponse.json({ error: 'Invalid stock value' }, { status: 400 })
        }
      }

      const { ObjectId } = require('mongodb')

      const existingProduct = await db
        .collection(COLLECTION_NAME)
        .findOne({ _id: new ObjectId(productId) })
      
      if (!existingProduct) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }

      if (sanitizedBarcode && sanitizedBarcode !== existingProduct.barcode) {
        const duplicateBarcode = await db.collection(COLLECTION_NAME).findOne({
          barcode: sanitizedBarcode,
          _id: { $ne: new ObjectId(productId) },
        })
        if (duplicateBarcode) {
          return NextResponse.json({ error: 'Barcode already exists for another product' }, { status: 400 })
        }
      }

      const existingBranchSpecs = existingProduct.branchSpecifications || {}
      const mergedBranchSpecifications = { ...existingBranchSpecs }
      
      if (branchSpecifications && typeof branchSpecifications === 'object') {
        Object.keys(branchSpecifications).forEach(branch => {
          mergedBranchSpecifications[branch] = branchSpecifications[branch]
        })
      }

      const sanitizedFeatures = sanitizeAndValidateArray(features, 'features', 20, 200, true)
      const sanitizedEachSetContains = sanitizeAndValidateArray(eachSetContains, 'eachSetContains', 20, 200, true)

      const updateData = {
        name: sanitizedName.trim(),
        description: sanitizedDescription?.trim() || '',
        price: numPrice,
        buyingPrice: parseFloat(buyingPrice) || 0,
        comparePrice: numComparePrice,
        brand: sanitizedBrand?.trim() || '',
        barcode: sanitizedBarcode?.trim() || null,
        category: sanitizedCategory?.trim() || '',
        subcategory: sanitizedSubcategory?.trim() || '',
        stock: stock !== undefined ? parseInt(stock) : existingProduct.stock,
        status: sanitizedStatus || 'active',
        specifications: specifications || {},
        tags: Array.isArray(tags) 
          ? tags.map(tag => sanitizeProductInput(tag)).filter(tag => tag.length > 0 && tag.length <= 50).slice(0, 20) 
          : [],
        branchSpecifications: mergedBranchSpecifications,
        flavor: sanitizedFlavor?.trim() || '',
        resistance: resistance || null,
        wattageRange: wattageRange || null,
        bottleSizes: sanitizedBottleSizes?.trim() || '',
        bottleType: sanitizedBottleType?.trim() || '',
        unit: sanitizedUnit?.trim() || '',
        puffs: sanitizedPuffs?.trim() || '',
        coil: sanitizedCoil?.trim() || '',
        volume: sanitizedVolume?.trim() || '',
        charging: sanitizedCharging?.trim() || '',
        chargingTime: sanitizedChargingTime?.trim() || '',
        features: sanitizedFeatures,
        eachSetContains: sanitizedEachSetContains,
        branch: BRANCH_NAME,
        updatedAt: new Date(),
        updatedBy: userInfo.userId,
      }

      if (imageOrder && Array.isArray(imageOrder)) {
        const validImages = imageOrder
          .filter((img) => img.publicId && img.url)
          .slice(0, MAX_IMAGES_PER_UPLOAD)
          .map((img, index) => ({
            url: sanitizeInput(img.url),
            publicId: sanitizeInput(img.publicId),
            alt: sanitizeProductInput(img.alt) || `Product image ${index + 1}`,
          }))

        if (validImages.length > 0) {
          updateData.images = validImages
        }
      }

      const updateResult = await db
        .collection(COLLECTION_NAME)
        .updateOne({ _id: new ObjectId(productId) }, { $set: updateData })

      if (updateResult.matchedCount === 0) {
        return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
      }

      const updatedProduct = await db
        .collection(COLLECTION_NAME)
        .findOne({ _id: new ObjectId(productId) })

      return NextResponse.json(
        {
          message: 'Product updated successfully',
          product: updatedProduct,
        },
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Handle product creation (default behavior)
    console.log('POST: Creating new product:', body.name)
    const {
      name,
      description,
      price,
      buyingPrice,
      comparePrice,
      brand,
      barcode,
      category,
      subcategory,
      stock,
      status,
      specifications,
      tags,
      branchSpecifications,
      flavor,
      resistance,
      wattageRange,
      bottleSizes,
      bottleType,
      unit,
      puffs,
      coil,
      volume,
      charging,
      chargingTime,
      features,
      eachSetContains,
    } = body

    const sanitizedName = sanitizeProductInput(name)
    const sanitizedDescription = sanitizeDescriptionInput(description)
    const sanitizedBrand = sanitizeProductInput(brand)
    const sanitizedBarcode = sanitizeInput(barcode)
    const sanitizedCategory = sanitizeCategoryInput(category)
    const sanitizedSubcategory = sanitizeCategoryInput(subcategory)
    const sanitizedFlavor = sanitizeProductInput(flavor)
    const sanitizedStatus = sanitizeInput(status)
    const sanitizedBottleSizes = sanitizeProductInput(bottleSizes)
    const sanitizedBottleType = sanitizeProductInput(bottleType)
    const sanitizedUnit = sanitizeProductInput(unit)
    const sanitizedPuffs = sanitizeProductInput(puffs)
    const sanitizedCoil = sanitizeProductInput(coil)
    const sanitizedVolume = sanitizeProductInput(volume)
    const sanitizedCharging = sanitizeProductInput(charging)
    const sanitizedChargingTime = sanitizeProductInput(chargingTime)

    if (!sanitizedName || !price || !sanitizedCategory) {
      return NextResponse.json({ error: 'Name, price, and category are required' }, { status: 400 })
    }

    if (sanitizedName.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: `Product name too long (max ${MAX_NAME_LENGTH} characters)` }, { status: 400 })
    }

    if (sanitizedDescription && sanitizedDescription.split(/\s+/).length > MAX_DESCRIPTION_WORDS) {
      return NextResponse.json({ error: `Description too long (max ${MAX_DESCRIPTION_WORDS} words)` }, { status: 400 })
    }

    if (!isValidCategoryAndSubcategory(sanitizedCategory, sanitizedSubcategory)) {
      return NextResponse.json({ error: 'Invalid category or subcategory. Use static values only.' }, { status: 400 })
    }

    const numPrice = parseFloat(price)
    const numComparePrice = comparePrice ? parseFloat(comparePrice) : null

    if (isNaN(numPrice) || numPrice < 0 || numPrice > MAX_PRICE) {
      return NextResponse.json({ error: 'Invalid price value' }, { status: 400 })
    }

    if (sanitizedBarcode) {
      const existingBarcode = await db
        .collection(COLLECTION_NAME)
        .findOne({ barcode: sanitizedBarcode.trim() })
      if (existingBarcode) {
        return NextResponse.json({ error: 'Barcode already exists' }, { status: 400 })
      }
    }

    const initialStock = stock !== undefined ? parseInt(stock) : 0
    if (isNaN(initialStock) || initialStock < 0 || initialStock > MAX_STOCK) {
      return NextResponse.json({ error: 'Invalid stock value' }, { status: 400 })
    }

    const initialBranchSpecifications = {}
    if (branchSpecifications && typeof branchSpecifications === 'object') {
      Object.keys(branchSpecifications).forEach(branch => {
        if (branchSpecifications[branch] && Object.keys(branchSpecifications[branch]).length > 0) {
          initialBranchSpecifications[branch] = branchSpecifications[branch]
        }
      })
    }

    const sanitizedFeatures = sanitizeAndValidateArray(features, 'features', 20, 200, true)
    const sanitizedEachSetContains = sanitizeAndValidateArray(eachSetContains, 'eachSetContains', 20, 200, true)

    const newProduct = {
      name: sanitizedName.trim(),
      description: sanitizedDescription?.trim() || '',
      price: numPrice,
      buyingPrice: parseFloat(buyingPrice) || 0,
      comparePrice: numComparePrice,
      brand: sanitizedBrand?.trim() || '',
      barcode: sanitizedBarcode?.trim() || null,
      category: sanitizedCategory?.trim() || '',
      subcategory: sanitizedSubcategory?.trim() || '',
      stock: initialStock,
      status: sanitizedStatus || 'active',
      specifications: specifications || {},
      tags: Array.isArray(tags) 
        ? tags.map(tag => sanitizeProductInput(tag)).filter(tag => tag.length > 0 && tag.length <= 50).slice(0, 20)
        : [],
      branchSpecifications: initialBranchSpecifications,
      flavor: sanitizedFlavor?.trim() || '',
      resistance: resistance || null,
      wattageRange: wattageRange || null,
      bottleSizes: sanitizedBottleSizes?.trim() || '',
      bottleType: sanitizedBottleType?.trim() || '',
      unit: sanitizedUnit?.trim() || '',
      puffs: sanitizedPuffs?.trim() || '',
      coil: sanitizedCoil?.trim() || '',
      volume: sanitizedVolume?.trim() || '',
      charging: sanitizedCharging?.trim() || '',
      chargingTime: sanitizedChargingTime?.trim() || '',
      features: sanitizedFeatures,
      eachSetContains: sanitizedEachSetContains,
      branch: BRANCH_NAME,
      images: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userInfo.userId,
    }

    const result = await db.collection(COLLECTION_NAME).insertOne(newProduct)
    const createdProduct = await db
      .collection(COLLECTION_NAME)
      .findOne({ _id: result.insertedId })

    return NextResponse.json(
      {
        message: 'Product created successfully',
        product: createdProduct,
      },
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return handleApiError(error, 'POST /api/uttara_wholesale_products')
  }
}

// PUT: Image upload (Admin only)
export async function PUT(req) {
  const ip = getUserIP(req)
  logRequest(req, 'PUT')

  try {
    checkUploadAbuse(ip)

    const userInfo = await getUserInfo(req)
    if (!userInfo.isAuthenticated || userInfo.role !== 'admin') {
      return createAuthError('Only admins can upload product images', 403)
    }

    console.log('PUT: Processing image upload...')
    const formData = await req.formData()
    const productId = sanitizeInput(formData.get('productId'))
    const files = formData.getAll('images')

    console.log('PUT: Product ID:', productId, 'Files count:', files.length)

    if (!productId || files.length === 0) {
      return NextResponse.json({ error: 'Product ID and at least one image file are required' }, { status: 400 })
    }

    if (!isValidObjectId(productId)) {
      return NextResponse.json({ error: 'Invalid product ID format' }, { status: 400 })
    }

    if (files.length > MAX_IMAGES_PER_UPLOAD) {
      return NextResponse.json({ error: `Maximum ${MAX_IMAGES_PER_UPLOAD} images allowed per upload` }, { status: 400 })
    }

    const { ObjectId } = require('mongodb')
    const client = await clientPromise
    const db = client.db('VWV')

    const existingProduct = await db
      .collection(COLLECTION_NAME)
      .findOne({ _id: new ObjectId(productId) })
    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const uploadedImages = []
    const uploadErrors = []

    console.log('PUT: Starting image uploads to Cloudinary...')
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      console.log(`PUT: Processing file ${i + 1}/${files.length}, size: ${file.size}, type: ${file.type}`)

      if (!file.type.startsWith('image/')) {
        const error = `File ${i + 1}: Only image files are allowed`
        uploadErrors.push(error)
        continue
      }

      if (file.size > MAX_IMAGE_SIZE) {
        const error = `File ${i + 1}: File size must be less than 100MB`
        uploadErrors.push(error)
        continue
      }

      if (file.size === 0) {
        const error = `File ${i + 1}: Empty file not allowed`
        uploadErrors.push(error)
        continue
      }

      const sanitizedFilename = sanitizeFilename(file.name)

      try {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const uploadResponse = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              folder: 'vwv_wholesale_products',
              public_id: `wholesale_product_${productId}_${Date.now()}_${i}`,
              allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'],
              transformation: [
                { width: 800, height: 800, crop: 'limit' },
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
              ],
              access_mode: 'public',
              timeout: 60000,
            },
            (error, result) => {
              if (error) {
                reject(new Error(`Cloudinary upload failed: ${error.message}`))
              } else if (!result) {
                reject(new Error('Cloudinary upload failed: No result returned'))
              } else {
                resolve(result)
              }
            }
          )
          
          try {
            uploadStream.end(buffer)
          } catch (streamError) {
            reject(new Error(`Upload stream error: ${streamError.message}`))
          }
        })

        if (!uploadResponse.secure_url || !uploadResponse.public_id) {
          throw new Error('Invalid upload response: missing URL or public ID')
        }

        const newImage = {
          url: uploadResponse.secure_url,
          publicId: uploadResponse.public_id,
          alt: `${existingProduct.name} - ${existingProduct.category} image ${uploadedImages.length + 1}`,
        }

        uploadedImages.push(newImage)
        
      } catch (uploadError) {
        const error = `File ${i + 1}: ${uploadError.message}`
        uploadErrors.push(error)
      }
    }

    if (uploadedImages.length === 0) {
      return NextResponse.json(
        { 
          error: 'No images were uploaded successfully', 
          errors: uploadErrors,
        },
        { status: 400 }
      )
    }

    const updateResult = await db.collection(COLLECTION_NAME).updateOne(
      { _id: new ObjectId(productId) },
      {
        $push: { images: { $each: uploadedImages } },
        $set: { 
          updatedAt: new Date(),
          updatedBy: userInfo.userId,
        },
      }
    )

    if (updateResult.matchedCount === 0) {
      for (const image of uploadedImages) {
        try {
          await cloudinary.uploader.destroy(image.publicId)
        } catch (cleanupError) {
          console.error('Error cleaning up image:', cleanupError)
        }
      }
      return NextResponse.json({ error: 'Failed to update product with images' }, { status: 500 })
    }
    
    const response = {
      message: 'Images uploaded successfully',
      uploadedImages,
      summary: {
        successful: uploadedImages.length,
        failed: uploadErrors.length,
        total: files.length
      }
    }
    
    if (uploadErrors.length > 0) {
      response.uploadErrors = uploadErrors
      response.message = `${uploadedImages.length} of ${files.length} images uploaded successfully`
    }

    return NextResponse.json(response, { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    })
    
  } catch (err) {
    return handleApiError(err, 'PUT /api/uttara_wholesale_products')
  }
}

// DELETE: Remove product or image (Admin only)
export async function DELETE(req) {
  const ip = getUserIP(req)
  logRequest(req, 'DELETE')

  try {
    const userInfo = await getUserInfo(req)
    if (!userInfo.isAuthenticated || userInfo.role !== 'admin') {
      return createAuthError('Only admins can delete products or images', 403)
    }

    const { searchParams } = new URL(req.url)
    const productId = sanitizeInput(searchParams.get('productId'))
    const imagePublicId = sanitizeInput(searchParams.get('imagePublicId'))

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    if (!isValidObjectId(productId)) {
      return NextResponse.json({ error: 'Invalid product ID format' }, { status: 400 })
    }

    const { ObjectId } = require('mongodb')
    const client = await clientPromise
    const db = client.db('VWV')

    const product = await db
      .collection(COLLECTION_NAME)
      .findOne({ _id: new ObjectId(productId) })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Delete specific image
    if (imagePublicId) {
      if (!/^[a-zA-Z0-9_\/-]{10,100}$/.test(imagePublicId)) {
        return NextResponse.json({ error: 'Invalid image public ID format' }, { status: 400 })
      }

      const imageToDelete = product.images?.find((img) => img.publicId === imagePublicId)
      if (!imageToDelete) {
        return NextResponse.json({ error: 'Image not found in product' }, { status: 404 })
      }

      try {
        await cloudinary.uploader.destroy(imagePublicId)
      } catch (deleteError) {
        console.error('Error deleting image from Cloudinary:', deleteError)
      }

      const updateResult = await db.collection(COLLECTION_NAME).updateOne(
        { _id: new ObjectId(productId) },
        {
          $pull: { images: { publicId: imagePublicId } },
          $set: { 
            updatedAt: new Date(),
            updatedBy: userInfo.userId,
          },
        }
      )

      if (updateResult.matchedCount === 0) {
        return NextResponse.json({ error: 'Failed to remove image from product' }, { status: 500 })
      }

      return NextResponse.json(
        { message: 'Image deleted successfully' },
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Delete entire product
    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        try {
          await cloudinary.uploader.destroy(image.publicId)
        } catch (deleteError) {
          console.error('Error deleting product image:', deleteError)
        }
      }
    }

    const deleteResult = await db
      .collection(COLLECTION_NAME)
      .deleteOne({ _id: new ObjectId(productId) })

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
    }

    return NextResponse.json(
      { message: 'Product deleted successfully' },
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return handleApiError(err, 'DELETE /api/uttara_wholesale_products')
  }
}

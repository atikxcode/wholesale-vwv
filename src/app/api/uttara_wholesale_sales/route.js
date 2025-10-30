// src/app/api/uttara_wholesale_sales/route.js
import clientPromise from '../../../../lib/mongodb'
import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { verifyApiToken, requireRole, createAuthError, checkRateLimit } from '../../../../lib/auth'

// 🔐 SECURITY CONSTANTS
const MAX_ITEMS_PER_SALE = 100
const MAX_QUANTITY_PER_ITEM = 10000 // Higher limit for wholesale
const MAX_CUSTOMER_NAME_LENGTH = 100
const MAX_CUSTOMER_PHONE_LENGTH = 20
const MAX_CUSTOMER_ADDRESS_LENGTH = 300
const MAX_REQUEST_BODY_SIZE = 150000 // 150KB for wholesale sales
const MAX_SEARCH_LENGTH = 100

// Rate limiting per role
const RATE_LIMITS = {
  PUBLIC: { requests: 50, windowMs: 60000 },
  ADMIN: { requests: 500, windowMs: 60000 },
  WHOLESALE_POS: { requests: 300, windowMs: 60000 },
}

// Enhanced error handling wrapper
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
    {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
}

// 🔐 SECURITY: Enhanced request logging
function logRequest(req, method) {
  const timestamp = new Date().toISOString()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
            req.headers.get('x-real-ip') || 
            'unknown'
  const userAgent = req.headers.get('user-agent') || 'unknown'
  
  console.log(`[${timestamp}] ${method} /api/uttara_wholesale_sales - IP: ${ip} - UserAgent: ${userAgent.substring(0, 100)}`)
  console.log('URL:', req.url)
}

// 🔐 SECURITY: Input sanitization
function sanitizeInput(input) {
  if (typeof input !== 'string') return input
  
  return input
    .replace(/[<>"'%;()&+${}]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .trim()
    .substring(0, 1000)
}

// 🔐 SECURITY: Validate ObjectId
function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id)
}

// 🔐 SECURITY: Get user IP
function getUserIP(req) {
  return req.headers.get('x-forwarded-for')?.split(',')[0] || 
         req.headers.get('x-real-ip') || 
         'unknown'
}

// Date validation helper function
function validateDate(dateString, fieldName) {
  if (!dateString) return null
  
  try {
    const date = new Date(dateString)
    
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid ${fieldName}: ${dateString}`)
    }
    
    const year = date.getFullYear()
    if (year < 1900 || year > 2100) {
      throw new Error(`Invalid ${fieldName} year: ${year}. Must be between 1900 and 2100.`)
    }
    
    return date
  } catch (error) {
    throw new Error(`Date validation failed for ${fieldName}: ${error.message}`)
  }
}

// JWT-based authentication with role verification
async function getUserInfo(req) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { role: 'public', branch: null, userId: null, name: null, isAuthenticated: false }
    }
    
    const token = authHeader.substring('Bearer '.length).trim()
    
    if (token === 'temp-admin-token-for-development') {
      console.log('🔧 Using temporary admin token for development')
      return { role: 'admin', branch: 'uttara_wholesale', userId: 'temp-admin', name: 'Admin', isAuthenticated: true }
    }
    
    const user = await verifyApiToken(req)
    console.log('✅ JWT verification successful:', { role: user.role, branch: user.branch, userId: user.userId })
    
    return { 
      role: user.role || 'user', 
      branch: user.branch || null, 
      userId: user.userId || user.id,
      name: user.name || 'Unknown User',
      isAuthenticated: true 
    }
  } catch (authError) {
    console.log('❌ JWT verification failed:', authError.message)
    return { role: 'public', branch: null, userId: null, name: null, isAuthenticated: false }
  }
}

// Generate secure sale ID for wholesale
function generateWholesaleSaleId() {
  const now = new Date()
  const timestamp = now.getTime()
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `WSALE-${timestamp}-${random}`
}

// Validate payment method
function validatePaymentMethod(method) {
  const validMethods = ['cash', 'bkash', 'bank', 'bank_transfer']
  const validTypes = ['cash', 'mobile_banking', 'bank_transfer']
  
  return (
    method &&
    typeof method === 'object' &&
    method.id &&
    method.name &&
    method.type &&
    validMethods.includes(method.id) &&
    validTypes.includes(method.type) &&
    typeof method.amount === 'number' &&
    method.amount > 0 &&
    method.amount <= 99999999
  )
}

// Validate sale item
function validateSaleItem(item) {
  return (
    item &&
    typeof item === 'object' &&
    item.productId &&
    isValidObjectId(item.productId) &&
    item.productName &&
    typeof item.productName === 'string' &&
    item.productName.length <= 200 &&
    item.branch &&
    typeof item.branch === 'string' &&
    item.branch === 'uttara_wholesale' &&
    typeof item.quantity === 'number' &&
    item.quantity > 0 &&
    item.quantity <= MAX_QUANTITY_PER_ITEM &&
    typeof item.unitPrice === 'number' &&
    item.unitPrice >= 0 &&
    item.unitPrice <= 9999999 &&
    typeof item.totalPrice === 'number' &&
    item.totalPrice >= 0 &&
    item.totalPrice <= 99999999 &&
    Math.abs(item.totalPrice - (item.unitPrice * item.quantity)) < 0.01
  )
}

// 🔥 POST method - Create wholesale sale
export async function POST(req) {
  const ip = getUserIP(req)
  logRequest(req, 'POST')

  try {
    console.log('POST: Starting wholesale sale creation process...')

    const userInfo = await getUserInfo(req)
    console.log('POST: User info obtained:', userInfo)

    if (!userInfo.isAuthenticated) {
      return NextResponse.json(
        { error: 'Authentication required. Please provide a valid JWT token.' },
        { status: 401 }
      )
    }

    // Only admin and wholesale_pos can create sales
    if (!['admin', 'wholesale_pos'].includes(userInfo.role)) {
      return NextResponse.json(
        { error: 'Access denied. Only admins and wholesale POS users can create sales.' },
        { status: 403 }
      )
    }

    // Verify branch is uttara_wholesale
    if (userInfo.role === 'wholesale_pos' && userInfo.branch !== 'uttara_wholesale') {
      return NextResponse.json(
        { error: 'Access denied. This API is only for Uttara Wholesale branch.' },
        { status: 403 }
      )
    }

    const rateLimit = RATE_LIMITS[userInfo.role?.toUpperCase()] || RATE_LIMITS.PUBLIC
    if (typeof checkRateLimit === 'function' && userInfo.role !== 'admin') {
      try {
        checkRateLimit(req, rateLimit)
      } catch (rateLimitError) {
        console.warn('Rate limit check failed:', rateLimitError.message)
      }
    }

    console.log('POST: Reading request body...')
    const body = await req.json()

    const bodySize = JSON.stringify(body).length
    if (bodySize > MAX_REQUEST_BODY_SIZE) {
      console.log('POST: Request body too large:', bodySize)
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 413 }
      )
    }

    console.log('POST: Processing wholesale sale creation...', {
      itemsCount: body.items?.length || 0,
      totalAmount: body.totalAmount,
      discount: body.discount,
      adjustedAmount: body.adjustedAmount,
      paymentMethod: body.paymentMethod
    })

    // Validate items
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Items are required and must be a non-empty array' },
        { status: 400 }
      )
    }

    if (body.items.length > MAX_ITEMS_PER_SALE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_ITEMS_PER_SALE} items allowed per sale` },
        { status: 400 }
      )
    }

    // Validate each item
    for (let i = 0; i < body.items.length; i++) {
      if (!validateSaleItem(body.items[i])) {
        console.log('POST: Invalid item at index', i, body.items[i])
        return NextResponse.json(
          { error: `Invalid item data at index ${i}` },
          { status: 400 }
        )
      }
    }

    // Validate payment
    if (!body.payment || typeof body.payment !== 'object') {
      return NextResponse.json(
        { error: 'Payment information is required' },
        { status: 400 }
      )
    }

    if (!body.payment.methods || !Array.isArray(body.payment.methods) || body.payment.methods.length === 0) {
      return NextResponse.json(
        { error: 'Payment methods are required' },
        { status: 400 }
      )
    }

    for (const method of body.payment.methods) {
      if (!validatePaymentMethod(method)) {
        console.log('POST: Invalid payment method:', method)
        return NextResponse.json(
          { error: 'Invalid payment method data' },
          { status: 400 }
        )
      }
    }

    // Validate amounts
    const totalAmount = parseFloat(body.totalAmount)
    const totalPaid = parseFloat(body.payment.totalPaid)
    const discount = parseFloat(body.discount) || 0
    const adjustedAmount = parseFloat(body.adjustedAmount) || totalAmount - discount
    
    if (isNaN(totalAmount) || totalAmount <= 0 || totalAmount > 99999999) {
      return NextResponse.json(
        { error: 'Invalid total amount' },
        { status: 400 }
      )
    }

    if (isNaN(totalPaid) || totalPaid <= 0 || totalPaid > 99999999) {
      return NextResponse.json(
        { error: 'Invalid total paid amount' },
        { status: 400 }
      )
    }

    if (totalPaid < adjustedAmount) {
      return NextResponse.json(
        { error: 'Insufficient payment amount' },
        { status: 400 }
      )
    }

    if (discount < 0 || discount > totalAmount) {
      return NextResponse.json(
        { error: 'Invalid discount amount' },
        { status: 400 }
      )
    }

    // Validate customer info
    const customerName = sanitizeInput(body.customer?.name || 'Walk-in Customer')
    const customerPhone = sanitizeInput(body.customer?.phone || '')
    const customerAddress = sanitizeInput(body.customer?.address || '')

    if (customerName.length > MAX_CUSTOMER_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Customer name too long (max ${MAX_CUSTOMER_NAME_LENGTH} characters)` },
        { status: 400 }
      )
    }

    if (customerPhone && (customerPhone.length > MAX_CUSTOMER_PHONE_LENGTH || !/^[+\-0-9\s()]{0,20}$/.test(customerPhone))) {
      return NextResponse.json(
        { error: 'Invalid customer phone format' },
        { status: 400 }
      )
    }

    if (customerAddress && customerAddress.length > MAX_CUSTOMER_ADDRESS_LENGTH) {
      return NextResponse.json(
        { error: `Customer address too long (max ${MAX_CUSTOMER_ADDRESS_LENGTH} characters)` },
        { status: 400 }
      )
    }

    // Validate status
    const status = sanitizeInput(body.status || 'completed')
    if (!['completed', 'pending', 'cancelled', 'refunded'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      )
    }

    // Validate payment type
    const paymentType = sanitizeInput(body.paymentType || 'cash')
    if (!['cash', 'mobile_banking', 'bank_transfer', 'mixed'].includes(paymentType)) {
      return NextResponse.json(
        { error: 'Invalid payment type' },
        { status: 400 }
      )
    }

    console.log('POST: Connecting to database...')
    const client = await clientPromise
    const db = client.db('VWV')

    const session = client.startSession()
    console.log('POST: Starting database transaction...')

    try {
      let saleResult
      let saleData

      await session.withTransaction(async () => {
        const saleId = generateWholesaleSaleId()
        console.log('POST: Generated wholesale sale ID:', saleId)

        const itemsWithBuyingPrice = []
        
        for (let i = 0; i < body.items.length; i++) {
          const item = body.items[i]
          
          // Fetch product from uttara_wholesale_products collection
          const product = await db
            .collection('uttara_wholesale_products')
            .findOne({ _id: new ObjectId(item.productId) }, { session })

          if (!product) {
            throw new Error(`Product not found: ${item.productName} (ID: ${item.productId})`)
          }

          // Check stock
          const currentStock = product.stock || 0
          
          if (currentStock < item.quantity) {
            throw new Error(
              `Insufficient stock for ${product.name}. Available: ${currentStock}, Requested: ${item.quantity}`
            )
          }

          const buyingPrice = parseFloat(product.buyingPrice) || 0
          const quantity = parseInt(item.quantity)
          const costOfGoods = buyingPrice * quantity
          const itemProfit = parseFloat(item.totalPrice) - costOfGoods

          itemsWithBuyingPrice.push({
            productId: item.productId,
            productName: sanitizeInput(item.productName).trim(),
            productCode: sanitizeInput(item.productCode || '').trim(),
            category: sanitizeInput(item.category || '').trim(),
            subcategory: sanitizeInput(item.subcategory || '').trim(),
            branch: 'uttara_wholesale',
            quantity: quantity,
            unitPrice: parseFloat(item.unitPrice),
            buyingPrice: buyingPrice,
            totalPrice: parseFloat(item.totalPrice),
            costOfGoods: costOfGoods,
            profit: itemProfit,
          })

          console.log(`💰 Item ${i + 1}: ${item.productName} - Buying: ৳${buyingPrice}, Selling: ৳${item.unitPrice}, Profit: ৳${itemProfit}`)
        }

        // Calculate total profit
        const totalProfit = itemsWithBuyingPrice.reduce((sum, item) => sum + item.profit, 0)

        saleData = {
          saleId,
          customer: {
            name: customerName.trim(),
            phone: customerPhone.trim(),
            address: customerAddress.trim(),
          },
          items: itemsWithBuyingPrice,
          payment: {
            methods: body.payment.methods.map(method => ({
              id: sanitizeInput(method.id),
              name: sanitizeInput(method.name),
              type: sanitizeInput(method.type),
              amount: parseFloat(method.amount),
            })),
            totalAmount: totalAmount,
            totalPaid: totalPaid,
            change: totalPaid - adjustedAmount,
          },
          totalAmount: totalAmount,
          discount: discount,
          adjustedAmount: adjustedAmount,
          totalProfit: totalProfit,
          paymentType: paymentType,
          status: status,
          branch: 'uttara_wholesale',
          cashier: userInfo.name || sanitizeInput(body.cashier || 'Unknown Cashier'),
          cashierRole: userInfo.role,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: userInfo.userId,
          createdByRole: userInfo.role,
          timestamp: new Date(),
        }

        console.log('POST: Inserting wholesale sale record...')
        saleResult = await db.collection('uttara_wholesale_sales').insertOne(saleData, { session })

        console.log('POST: Updating product stock...')
        for (let i = 0; i < itemsWithBuyingPrice.length; i++) {
          const item = itemsWithBuyingPrice[i]
          console.log(`POST: Processing item ${i + 1}/${itemsWithBuyingPrice.length} - ${item.productName}`)

          const updateResult = await db.collection('uttara_wholesale_products').updateOne(
            { _id: new ObjectId(item.productId) },
            {
              $inc: { stock: -item.quantity },
              $set: { 
                updatedAt: new Date(),
                updatedBy: userInfo.userId 
              },
            },
            { session }
          )

          if (updateResult.matchedCount === 0) {
            throw new Error(`Failed to update stock for product: ${item.productName}`)
          }

          console.log(`POST: Updated stock for ${item.productName} - reduced by ${item.quantity}`)
        }

        console.log('POST: Transaction completed successfully ✓')
      })

      console.log('POST: Wholesale sale processed successfully ✓')
      return NextResponse.json(
        {
          success: true,
          message: 'Wholesale sale processed successfully',
          saleId: saleData.saleId,
          insertedId: saleResult.insertedId,
          totalProfit: saleData.totalProfit,
        },
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      )

    } finally {
      await session.endSession()
      console.log('POST: Database session ended')
    }

  } catch (error) {
    console.error('POST: Critical error in wholesale sale processing:', error)
    return handleApiError(error, 'POST /api/uttara_wholesale_sales')
  }
}

// 🔥 GET method - Fetch wholesale sales
export async function GET(req) {
  const ip = getUserIP(req)
  logRequest(req, 'GET')

  try {
    const userInfo = await getUserInfo(req)
    console.log('GET: User info obtained:', userInfo)

    if (!userInfo.isAuthenticated) {
      return NextResponse.json(
        { error: 'Authentication required. Please provide a valid JWT token.' },
        { status: 401 }
      )
    }

    if (!['admin', 'wholesale_pos'].includes(userInfo.role)) {
      return NextResponse.json(
        { error: 'Access denied. Only admins and wholesale POS users can view sales data.' },
        { status: 403 }
      )
    }

    // Verify branch for wholesale_pos users
    if (userInfo.role === 'wholesale_pos' && userInfo.branch !== 'uttara_wholesale') {
      return NextResponse.json(
        { error: 'Access denied. This API is only for Uttara Wholesale branch.' },
        { status: 403 }
      )
    }

    const rateLimit = RATE_LIMITS[userInfo.role?.toUpperCase()] || RATE_LIMITS.PUBLIC
    if (typeof checkRateLimit === 'function' && userInfo.role !== 'admin') {
      try {
        checkRateLimit(req, rateLimit)
      } catch (rateLimitError) {
        console.warn('Rate limit check failed:', rateLimitError.message)
      }
    }

    console.log('GET: Fetching wholesale sales...')
    const { searchParams } = new URL(req.url)

    const limit = Math.min(Math.max(parseInt(searchParams.get('limit')) || 50, 1), 1000)
    const page = Math.max(parseInt(searchParams.get('page')) || 1, 1)
    const skip = (page - 1) * limit

    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const paymentType = sanitizeInput(searchParams.get('paymentType'))
    const status = sanitizeInput(searchParams.get('status'))
    const cashier = sanitizeInput(searchParams.get('cashier'))
    const customerName = sanitizeInput(searchParams.get('customerName'))
    const saleId = sanitizeInput(searchParams.get('saleId'))
    const searchParam = sanitizeInput(searchParams.get('search'))
    const phoneParam = sanitizeInput(searchParams.get('phone'))

    console.log('GET: Query parameters:', { 
      limit, page, startDateParam, endDateParam, paymentType, status, cashier, searchParam, phoneParam,
      userRole: userInfo.role, userBranch: userInfo.branch 
    })

    const client = await clientPromise
    const db = client.db('VWV')

    let andConditions = []

    // Always filter by uttara_wholesale branch
    andConditions.push({ branch: 'uttara_wholesale' })

    // Date range filter
    try {
      if (startDateParam || endDateParam) {
        let startDate = null
        let endDate = null

        if (startDateParam) {
          startDate = validateDate(startDateParam, 'start date')
          startDate.setHours(0, 0, 0, 0)
        }

        if (endDateParam) {
          endDate = validateDate(endDateParam, 'end date')
          endDate.setHours(23, 59, 59, 999)
        }

        if (!startDate && endDate) {
          startDate = new Date('1900-01-01')
          startDate.setHours(0, 0, 0, 0)
        }
        if (startDate && !endDate) {
          endDate = new Date()
          endDate.setHours(23, 59, 59, 999)
        }

        if (startDate && endDate && startDate > endDate) {
          return NextResponse.json(
            { error: 'Start date cannot be after end date' },
            { status: 400 }
          )
        }

        if (startDate && endDate) {
          andConditions.push({ createdAt: { $gte: startDate, $lte: endDate } })
          console.log('GET: Applied date filter:', { start: startDate.toISOString(), end: endDate.toISOString() })
        }
      }
    } catch (dateError) {
      console.error('GET: Date validation error:', dateError.message)
      return NextResponse.json(
        { error: dateError.message },
        { status: 400 }
      )
    }

    // Payment type filter
    if (paymentType && ['cash', 'mobile_banking', 'bank_transfer', 'mixed'].includes(paymentType)) {
      andConditions.push({ paymentType: paymentType })
    }

    // Status filter
    if (status && ['completed', 'pending', 'cancelled', 'refunded'].includes(status)) {
      andConditions.push({ status: status })
    }

    // Cashier filter
    if (cashier && cashier.length <= 50) {
      andConditions.push({ cashier: { $regex: cashier, $options: 'i' } })
    }

    // Customer name filter
    if (customerName && customerName.length <= 50) {
      andConditions.push({ 'customer.name': { $regex: customerName, $options: 'i' } })
    }

    // Sale ID filter
    if (saleId && saleId.length <= 50) {
      andConditions.push({ saleId: { $regex: saleId, $options: 'i' } })
    }

    // Phone filter
    if (phoneParam && phoneParam.length <= 20) {
      andConditions.push({ 'customer.phone': { $regex: phoneParam, $options: 'i' } })
      console.log('GET: Applied phone filter:', phoneParam)
    }

    // Search filter
    if (searchParam && searchParam.length <= MAX_SEARCH_LENGTH) {
      const searchRegex = { $regex: searchParam, $options: 'i' }
      andConditions.push({
        $or: [
          { saleId: searchRegex },
          { 'customer.name': searchRegex },
          { 'customer.phone': searchRegex },
          { cashier: searchRegex },
          { 'items.productName': searchRegex }
        ]
      })
    }

    const filter = andConditions.length > 0 ? { $and: andConditions } : {}

    console.log('GET: Built query filter:', JSON.stringify(filter, null, 2))

    const totalCount = await db.collection('uttara_wholesale_sales').countDocuments(filter)
    const totalPages = Math.ceil(totalCount / limit)

    console.log('GET: Total wholesale sales found:', totalCount)

    const sales = await db
      .collection('uttara_wholesale_sales')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    console.log('GET: Wholesale sales fetched successfully, count:', sales.length)

    return NextResponse.json(
      {
        success: true,
        sales: sales,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          limit,
        },
        metadata: {
          userRole: userInfo.role,
          userBranch: userInfo.branch,
          branch: 'uttara_wholesale',
          appliedFilters: {
            dateRange: startDateParam && endDateParam ? `${startDateParam} to ${endDateParam}` : 'all',
            status: status || 'all',
            paymentType: paymentType || 'all',
            phone: phoneParam || 'none',
            search: searchParam || 'none'
          }
        }
      },
      {
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=60'
        },
      }
    )

  } catch (error) {
    console.error('GET: Critical error:', error)
    return handleApiError(error, 'GET /api/uttara_wholesale_sales')
  }
}

// 🔥 PUT method - Update wholesale sale status (admin only)
export async function PUT(req) {
  const ip = getUserIP(req)
  logRequest(req, 'PUT')

  try {
    const userInfo = await getUserInfo(req)
    console.log('PUT: User info obtained:', userInfo)
    
    if (!userInfo.isAuthenticated) {
      return NextResponse.json(
        { error: 'Authentication required. Please provide a valid JWT token.' },
        { status: 401 }
      )
    }

    if (userInfo.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Only admins can update wholesale sales.' },
        { status: 403 }
      )
    }

    console.log('PUT: Reading request body...')
    const body = await req.json()

    const bodySize = JSON.stringify(body).length
    if (bodySize > MAX_REQUEST_BODY_SIZE) {
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 413 }
      )
    }

    const { saleId, status } = body

    if (!saleId || !status) {
      return NextResponse.json(
        { error: 'Sale ID and status are required' },
        { status: 400 }
      )
    }

    if (!['completed', 'pending', 'cancelled', 'refunded'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      )
    }

    console.log('PUT: Updating wholesale sale status...')
    const client = await clientPromise
    const db = client.db('VWV')

    const updateResult = await db.collection('uttara_wholesale_sales').updateOne(
      { saleId: sanitizeInput(saleId) },
      {
        $set: {
          status: sanitizeInput(status),
          updatedAt: new Date(),
          updatedBy: userInfo.userId,
          updatedByRole: userInfo.role,
        },
      }
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      )
    }

    console.log('PUT: Wholesale sale status updated successfully ✓')
    return NextResponse.json(
      {
        success: true,
        message: 'Wholesale sale status updated successfully',
        updatedBy: userInfo.userId,
        updatedAt: new Date().toISOString()
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    return handleApiError(error, 'PUT /api/uttara_wholesale_sales')
  }
}

// 🔥 DELETE method - Delete wholesale sale (admin only)
export async function DELETE(req) {
  const ip = getUserIP(req)
  logRequest(req, 'DELETE')

  try {
    const userInfo = await getUserInfo(req)
    console.log('DELETE: User info obtained:', userInfo)
    
    if (!userInfo.isAuthenticated) {
      return NextResponse.json(
        { error: 'Authentication required. Please provide a valid JWT token.' },
        { status: 401 }
      )
    }

    if (userInfo.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Only admins can delete wholesale sales.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const saleId = sanitizeInput(searchParams.get('saleId'))

    if (!saleId) {
      return NextResponse.json(
        { error: 'Sale ID is required' },
        { status: 400 }
      )
    }

    console.log('DELETE: Deleting wholesale sale:', saleId)
    const client = await clientPromise
    const db = client.db('VWV')

    const existingSale = await db.collection('uttara_wholesale_sales').findOne({ saleId: saleId })
    if (!existingSale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      )
    }

    const deleteResult = await db.collection('uttara_wholesale_sales').deleteOne({ saleId: saleId })

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to delete sale' },
        { status: 500 }
      )
    }

    console.log('DELETE: Wholesale sale deleted successfully ✓')
    return NextResponse.json(
      {
        success: true,
        message: 'Wholesale sale deleted successfully',
        deletedSaleId: saleId,
        deletedBy: userInfo.userId,
        deletedAt: new Date().toISOString()
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    return handleApiError(error, 'DELETE /api/uttara_wholesale_sales')
  }
}

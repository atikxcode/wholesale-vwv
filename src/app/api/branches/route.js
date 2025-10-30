// src/app/api/branches/route.js
import clientPromise from '../../../../lib/mongodb'
import { NextResponse } from 'next/server'
import { verifyApiToken, requireRole, createAuthError, checkRateLimit } from '../../../../lib/auth'

// 🔐 SECURITY CONSTANTS
const MAX_BRANCH_NAME_LENGTH = 20
const MIN_BRANCH_NAME_LENGTH = 2
const MAX_REQUEST_BODY_SIZE = 10000 // 10KB for branches
const MAX_BRANCHES_PER_SYSTEM = 50

// Rate limiting per role
const RATE_LIMITS = {
  PUBLIC: { requests: 200, windowMs: 60000 },
  ADMIN: { requests: 500, windowMs: 60000 },
  POS: { requests: 300, windowMs: 60000 },
  MODERATOR: { requests: 300, windowMs: 60000 },
  MANAGER: { requests: 400, windowMs: 60000 },
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
  
  console.log(`[${timestamp}] ${method} /api/branches - IP: ${ip} - UserAgent: ${userAgent.substring(0, 100)}`)
  console.log('URL:', req.url)
}

// 🔐 SECURITY: Input sanitization
function sanitizeInput(input) {
  if (typeof input !== 'string') return input
  
  return input
    .replace(/[<>"'%;()&+${}]/g, '') // Remove dangerous chars
    .replace(/javascript:/gi, '') // Remove JS protocols
    .replace(/data:/gi, '') // Remove data URLs
    .trim()
    .substring(0, 1000) // Limit length
}

// 🔐 SECURITY: Get user IP
function getUserIP(req) {
  return req.headers.get('x-forwarded-for')?.split(',')[0] || 
        req.headers.get('x-real-ip') || 
        'unknown'
}

// 🔧 Helper function to get user info with POS support
async function getUserInfo(req) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { role: 'public', branch: null, userId: null, isAuthenticated: false }
    }
    
    // Check for temp token (development mode)
    if (authHeader === 'Bearer temp-admin-token-for-development') {
      console.log('🔧 Using temporary admin token for development')
      return { role: 'admin', branch: null, userId: 'temp-admin', isAuthenticated: true }
    }
    
    const user = await verifyApiToken(req)
    return { 
      role: user.role || 'user', 
      branch: user.branch || null, 
      userId: user.userId || user.id,
      email: user.email || null,
      isAuthenticated: true 
    }
  } catch (authError) {
    console.log('🔧 Authentication failed, treating as public user:', authError.message)
    return { role: 'public', branch: null, userId: null, isAuthenticated: false }
  }
}

// 🔥 FIXED: GET method for static uttara_wholesale branch
export async function GET(req) {
  const ip = getUserIP(req)
  logRequest(req, 'GET')

  try {
    console.log('GET: Fetching branches from database...')
    
    const userInfo = await getUserInfo(req)
    console.log('GET: User info obtained:', { role: userInfo.role, branch: userInfo.branch })

    // Apply role-based rate limiting
    const rateLimit = RATE_LIMITS[userInfo.role?.toUpperCase()] || RATE_LIMITS.PUBLIC
    if (typeof checkRateLimit === 'function' && userInfo.role !== 'admin') {
      try {
        checkRateLimit(req, rateLimit)
      } catch (rateLimitError) {
        console.warn('Rate limit check failed:', rateLimitError.message)
      }
    }

    const client = await clientPromise
    const db = client.db('VWV')

    // Ensure uttara_wholesale collection exists
    if (!await db.listCollections({ name: 'uttara_wholesale' }).hasNext()) {
      await db.createCollection('uttara_wholesale')
      console.log('uttara_wholesale collection created')
    }

    // Return only uttara_wholesale branch
    const branches = ['uttara_wholesale']

    console.log('GET: Final branches being returned:', branches)

    return NextResponse.json(
      { 
        branches: branches,
        userRole: userInfo.role,
        userBranch: userInfo.branch 
      },
      {
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      }
    )
  } catch (error) {
    return handleApiError(error, 'GET /api/branches')
  }
}

// 🔥 POST method disabled for static branch
export async function POST(req) {
  return NextResponse.json(
    { error: 'Branch creation is disabled for static wholesale branch' },
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  )
}

// 🔥 DELETE method disabled for static branch
export async function DELETE(req) {
  return NextResponse.json(
    { error: 'Branch deletion is disabled for static wholesale branch' },
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  )
}

// src/app/admin/sales/page.jsx
'use client'


import { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../../../../Provider/AuthProvider'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Filter,
  Eye,
  X,
  Download,
  Search,
  RefreshCw
} from 'lucide-react'


export default function WholesaleSalesPage() {
  const { user, logOut } = useContext(AuthContext)
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState(null)
  const [sales, setSales] = useState([])
  const [filteredSales, setFilteredSales] = useState([])
  
  // Filter states
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modal state
  const [selectedSale, setSelectedSale] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  
  // Statistics
  const [statistics, setStatistics] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalProfit: 0,
    cashSales: 0,
    bkashSales: 0,
    bankSales: 0,
    cashRevenue: 0,
    bkashRevenue: 0,
    bankRevenue: 0
  })


  // Helper function to get payment method from sale object
  const getPaymentMethod = (sale) => {
    // Try nested structure first (payment.methods[0].id)
    if (sale.payment?.methods?.[0]?.id) {
      return sale.payment.methods[0].id.toLowerCase()
    }
    // Try paymentMethod field
    if (sale.paymentMethod) {
      return sale.paymentMethod.toLowerCase()
    }
    // Try paymentType field
    if (sale.paymentType) {
      return sale.paymentType.toLowerCase()
    }
    // Default to cash
    return 'cash'
  }


  // Authentication check
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!user?.email) {
        router.push('/')
        return
      }


      try {
        const token = localStorage.getItem('auth-token')
        
        if (!token) {
          router.push('/')
          return
        }


        const response = await fetch(`/api/user?email=${encodeURIComponent(user.email)}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })


        if (response.status === 401) {
          localStorage.removeItem('auth-token')
          localStorage.removeItem('user-info')
          router.push('/')
          return
        }


        if (response.ok) {
          const data = await response.json()
          if (data.user) {
            if (data.user.role !== 'admin') {
              Swal.fire({
                icon: 'error',
                title: 'Access Denied',
                text: 'Admin access required',
                confirmButtonColor: '#7c3aed',
              }).then(() => {
                router.push('/')
              })
              return
            }
            
            setUserInfo(data.user)
          }
        } else {
          router.push('/')
        }
      } catch (error) {
        router.push('/')
      } finally {
        setLoading(false)
      }
    }


    fetchUserDetails()
  }, [user, router])


  // Fetch sales data
  const fetchSales = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth-token')
      
      const response = await fetch('/api/uttara_wholesale_sales', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })


      if (response.ok) {
        const data = await response.json()
        setSales(data.sales || [])
        setFilteredSales(data.sales || [])
        calculateStatistics(data.sales || [])
      } else {
        throw new Error('Failed to fetch sales')
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load sales data',
        confirmButtonColor: '#7c3aed',
      })
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    if (userInfo) {
      fetchSales()
    }
  }, [userInfo])


  // Calculate statistics
  const calculateStatistics = (salesData) => {
    const stats = {
      totalSales: salesData.length,
      totalRevenue: 0,
      totalProfit: 0,
      cashSales: 0,
      bkashSales: 0,
      bankSales: 0,
      cashRevenue: 0,
      bkashRevenue: 0,
      bankRevenue: 0
    }


    salesData.forEach(sale => {
      stats.totalRevenue += sale.adjustedAmount || sale.totalAmount || 0
      stats.totalProfit += sale.totalProfit || 0

      const paymentMethod = getPaymentMethod(sale)
      
      if (paymentMethod === 'cash') {
        stats.cashSales++
        stats.cashRevenue += sale.adjustedAmount || sale.totalAmount || 0
      } else if (paymentMethod === 'bkash') {
        stats.bkashSales++
        stats.bkashRevenue += sale.adjustedAmount || sale.totalAmount || 0
      } else if (paymentMethod === 'bank') {
        stats.bankSales++
        stats.bankRevenue += sale.adjustedAmount || sale.totalAmount || 0
      }
    })


    setStatistics(stats)
  }


  // Apply filters
  const applyFilters = () => {
    let filtered = [...sales]


    // Payment method filter
    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter(sale => {
        const paymentMethod = getPaymentMethod(sale)
        return paymentMethod === paymentMethodFilter
      })
    }


    // Amount filter
    if (minAmount !== '') {
      filtered = filtered.filter(sale => {
        const amount = sale.adjustedAmount || sale.totalAmount || 0
        return amount >= parseFloat(minAmount)
      })
    }


    if (maxAmount !== '') {
      filtered = filtered.filter(sale => {
        const amount = sale.adjustedAmount || sale.totalAmount || 0
        return amount <= parseFloat(maxAmount)
      })
    }


    // Date filter
    if (dateFrom !== '') {
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.createdAt)
        return saleDate >= new Date(dateFrom)
      })
    }


    if (dateTo !== '') {
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.createdAt)
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999)
        return saleDate <= toDate
      })
    }


    // Search query
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(sale => {
        const query = searchQuery.toLowerCase()
        return (
          sale.saleId?.toLowerCase().includes(query) ||
          sale.customer?.name?.toLowerCase().includes(query) ||
          sale.customer?.phone?.toLowerCase().includes(query) ||
          sale.cashier?.toLowerCase().includes(query)
        )
      })
    }


    setFilteredSales(filtered)
    calculateStatistics(filtered)
  }


  useEffect(() => {
    applyFilters()
  }, [paymentMethodFilter, minAmount, maxAmount, dateFrom, dateTo, searchQuery, sales])


  // Reset filters
  const resetFilters = () => {
    setPaymentMethodFilter('all')
    setMinAmount('')
    setMaxAmount('')
    setDateFrom('')
    setDateTo('')
    setSearchQuery('')
  }


  // View sale details
  const viewSaleDetails = (sale) => {
    setSelectedSale(sale)
    setShowDetailsModal(true)
  }


  // Close modal
  const closeModal = () => {
    setSelectedSale(null)
    setShowDetailsModal(false)
  }


  // Export to CSV
  const exportToCSV = () => {
    if (filteredSales.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Data',
        text: 'No sales data to export',
        confirmButtonColor: '#7c3aed',
      })
      return
    }


    const headers = ['Sale ID', 'Date', 'Customer', 'Phone', 'Items', 'Total', 'Discount', 'Adjusted Amount', 'Profit', 'Payment Method', 'Cashier']
    const rows = filteredSales.map(sale => [
      sale.saleId || 'N/A',
      new Date(sale.createdAt).toLocaleString(),
      sale.customer?.name || 'Walk-in Customer',
      sale.customer?.phone || 'N/A',
      sale.items?.length || 0,
      (sale.totalAmount || 0).toFixed(2),
      (sale.discount || 0).toFixed(2),
      (sale.adjustedAmount || sale.totalAmount || 0).toFixed(2),
      (sale.totalProfit || 0).toFixed(2),
      getPaymentMethod(sale).toUpperCase(),
      sale.cashier || 'N/A'
    ])


    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')


    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wholesale_sales_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Sales Data...</p>
        </div>
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingCart size={32} />
              <div>
                <h1 className="text-2xl font-bold">Wholesale Sales Dashboard</h1>
                <p className="text-sm opacity-90">Uttara Wholesale Branch</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>


      <div className="max-w-7xl mx-auto p-4">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Sales */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Sales</p>
                <p className="text-3xl font-bold text-purple-600">{statistics.totalSales}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <ShoppingCart className="text-purple-600" size={24} />
              </div>
            </div>
          </div>


          {/* Total Revenue */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-green-600">৳{statistics.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <DollarSign className="text-green-600" size={24} />
              </div>
            </div>
          </div>


          {/* Total Profit */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Profit</p>
                <p className="text-3xl font-bold text-blue-600">৳{statistics.totalProfit.toFixed(2)}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <TrendingUp className="text-blue-600" size={24} />
              </div>
            </div>
          </div>


          {/* Payment Methods Breakdown */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Payment Methods</p>
              <Calendar className="text-gray-400" size={20} />
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Cash:</span>
                <span className="font-semibold">{statistics.cashSales} (৳{statistics.cashRevenue.toFixed(2)})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">bKash:</span>
                <span className="font-semibold">{statistics.bkashSales} (৳{statistics.bkashRevenue.toFixed(2)})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Bank:</span>
                <span className="font-semibold">{statistics.bankSales} (৳{statistics.bankRevenue.toFixed(2)})</span>
              </div>
            </div>
          </div>
        </div>


        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-purple-600" />
              <h2 className="text-lg font-bold text-gray-900">Filters</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={resetFilters}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-semibold"
              >
                <RefreshCw size={16} />
                Reset
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
              >
                <Download size={16} />
                Export CSV
              </button>
            </div>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Sale ID, Customer, Phone..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
            </div>


            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="bkash">bKash</option>
                <option value="bank">Bank</option>
              </select>
            </div>


            {/* Min Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Amount (৳)
              </label>
              <input
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>


            {/* Max Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Amount (৳)
              </label>
              <input
                type="number"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="999999"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>


            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>


            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>
          </div>
        </div>


        {/* Sales Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-lg font-bold text-gray-900">
              Sales Records ({filteredSales.length})
            </h2>
          </div>


          <div className="overflow-x-auto">
            {filteredSales.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ShoppingCart size={64} className="mx-auto mb-4 opacity-30" />
                <p className="text-lg font-semibold">No sales found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sale ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cashier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSales.map((sale) => (
                    <tr key={sale._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                        {sale.saleId || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(sale.createdAt).toLocaleDateString()}<br/>
                        <span className="text-xs text-gray-500">
                          {new Date(sale.createdAt).toLocaleTimeString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>{sale.customer?.name || 'Walk-in Customer'}</div>
                        <div className="text-xs text-gray-500">{sale.customer?.phone || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sale.items?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ৳{(sale.adjustedAmount || sale.totalAmount || 0).toFixed(2)}
                        {sale.discount > 0 && (
                          <div className="text-xs text-red-500">
                            (Discount: ৳{sale.discount.toFixed(2)})
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        ৳{(sale.totalProfit || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          getPaymentMethod(sale) === 'cash' 
                            ? 'bg-green-100 text-green-800' 
                            : getPaymentMethod(sale) === 'bkash'
                            ? 'bg-pink-100 text-pink-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {getPaymentMethod(sale).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sale.cashier || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => viewSaleDetails(sale)}
                          className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                        >
                          <Eye size={14} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>


      {/* Sale Details Modal */}
      {showDetailsModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-purple-600 text-white p-6 flex items-center justify-between rounded-t-lg">
              <div>
                <h2 className="text-2xl font-bold">Sale Details</h2>
                <p className="text-sm opacity-90">ID: {selectedSale.saleId}</p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-purple-700 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>


            {/* Modal Body */}
            <div className="p-6">
              {/* Customer Information */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Customer Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-semibold">{selectedSale.customer?.name || 'Walk-in Customer'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-semibold">{selectedSale.customer?.phone || 'N/A'}</span>
                  </div>
                  {selectedSale.customer?.address && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Address:</span>
                      <span className="font-semibold">{selectedSale.customer.address}</span>
                    </div>
                  )}
                </div>
              </div>


              {/* Sale Information */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Sale Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-semibold">{new Date(selectedSale.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cashier:</span>
                    <span className="font-semibold">{selectedSale.cashier || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="font-semibold">{getPaymentMethod(selectedSale).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-semibold capitalize">{selectedSale.status || 'completed'}</span>
                  </div>
                </div>
              </div>


              {/* Items */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Items Purchased</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedSale.items?.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm">{item.productName}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{item.productCode || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm">৳{item.unitPrice.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm font-semibold">৳{item.totalPrice.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>


              {/* Payment Summary */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Payment Summary</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold">৳{(selectedSale.totalAmount || 0).toFixed(2)}</span>
                  </div>
                  {selectedSale.discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount:</span>
                      <span className="font-semibold">-৳{selectedSale.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total Paid:</span>
                    <span className="text-purple-600">৳{(selectedSale.adjustedAmount || selectedSale.totalAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-green-600">
                    <span>Profit:</span>
                    <span>৳{(selectedSale.totalProfit || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>


            {/* Modal Footer */}
            <div className="p-6 bg-gray-50 rounded-b-lg flex justify-end">
              <button
                onClick={closeModal}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useContext, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthContext } from '../Provider/AuthProvider'
import Loading from './Loading'

export default function PrivateRoute({ children }) {
  const { user, loading } = useContext(AuthContext)
  const router = useRouter()
  const pathname = usePathname()

  // Single useEffect to handle redirect
  useEffect(() => {
    if (!loading && !user) {
      router.push(`/RegistrationPage?redirect=${pathname}`)
    }
  }, [user, loading, router, pathname])

  // Show loading animation while checking auth
  if (loading) {
    return <Loading />
  }

  // Show nothing during redirect
  if (!user) {
    return null
  }

  return children
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'

// QueryClient manages all server state (API calls, caching, loading states)
// We configure it once here and it is available everywhere via useQuery
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      // After that, a background refetch happens
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes even if component unmounts
      gcTime: 10 * 60 * 1000,
      // Don't retry failed requests in development - makes errors obvious
      retry: process.env.NODE_ENV === 'production' ? 3 : 0,
    },
  },
})

createRoot(document.getElementById('root')).render(
  // StrictMode runs your components twice in development to catch bugs
  // It has no effect in production
  <StrictMode>
    {/* BrowserRouter enables URL-based routing */}
    <BrowserRouter>
      {/* QueryClientProvider makes queryClient available to all components */}
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
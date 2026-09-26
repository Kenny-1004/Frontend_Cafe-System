import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter } from 'react-router'
import { ApiError } from '@/api/client'
import { SessionProvider } from '@/auth/SessionProvider'
import { CartProvider } from '@/cart/CartProvider'
import { ToastProvider } from '@/ui/ToastProvider'
import App from '@/App'
import './index.css'
import './staff.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry network and server errors, but not 4xx answers like 401, 404 or validation errors
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
      refetchOnWindowFocus: true,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionProvider>
          <ToastProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </ToastProvider>
        </SessionProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  </StrictMode>,
)

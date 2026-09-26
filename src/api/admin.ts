import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { json, request } from '@/api/client'
import type {
  AdminOrderDetail,
  AdminOrderSummary,
  AdminProduct,
  AdminProductDetail,
  BestSeller,
  Category,
  DailySales,
  Dashboard,
  DeliveryDetail,
  DeliveryStatus,
  DeliverySummary,
  Employee,
  EmployeeRole,
  Ingredient,
  LowStock,
  OrderStatus,
  Page,
  ProductType,
  SalesSummary,
  StockMovement,
  Supplier,
  SupplierDetail,
} from '@/api/types'

const qs = (params: Record<string, string | number | null | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value !== null && value !== undefined && value !== '') search.set(key, String(value))
  const text = search.toString()
  return text ? `?${text}` : ''
}

export const adminKeys = {
  all: ['admin'] as const,
  dashboard: ['admin', 'dashboard'] as const,
  categories: ['admin', 'categories'] as const,
  products: (filters: object) => ['admin', 'products', filters] as const,
  product: (id: number) => ['admin', 'product', id] as const,
  ingredients: (filters: object) => ['admin', 'ingredients', filters] as const,
  movements: (id: number) => ['admin', 'movements', id] as const,
  lowStock: ['admin', 'low-stock'] as const,
  suppliers: ['admin', 'suppliers'] as const,
  supplier: (id: number) => ['admin', 'supplier', id] as const,
  deliveries: (status: string) => ['admin', 'deliveries', status] as const,
  delivery: (id: number) => ['admin', 'delivery', id] as const,
  employees: ['admin', 'employees'] as const,
  orders: (filters: object) => ['admin', 'orders', filters] as const,
  order: (id: number) => ['admin', 'order', id] as const,
  report: (name: string, range: object) => ['admin', 'report', name, range] as const,
  kiosks: ['admin', 'kiosks'] as const,
}

// Mutations refresh every admin screen that could show the changed data
function useAdminMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>, invalidate: QueryKey[] = [adminKeys.all]) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => Promise.all(invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  })
}

/* ---------- Dashboard & reports ---------- */
export const useDashboard = () =>
  useQuery({ queryKey: adminKeys.dashboard, queryFn: () => request<Dashboard>('/admin/dashboard'), refetchInterval: 60_000 })

export type Range = { from?: string; to?: string }

export const useDailySales = (range: Range) =>
  useQuery({
    queryKey: adminKeys.report('daily', range),
    queryFn: () => request<{ from: string; to: string; days: DailySales[] }>(`/admin/reports/daily-sales${qs(range)}`),
    placeholderData: keepPreviousData,
  })

export const useBestSellers = (range: Range, limit = 10) =>
  useQuery({
    queryKey: adminKeys.report('best', { ...range, limit }),
    queryFn: () => request<{ from: string; to: string; products: BestSeller[] }>(`/admin/reports/best-sellers${qs({ ...range, limit })}`),
    placeholderData: keepPreviousData,
  })

export const useSalesSummary = (range: Range) =>
  useQuery({
    queryKey: adminKeys.report('summary', range),
    queryFn: () => request<SalesSummary & { from: string; to: string }>(`/admin/reports/summary${qs(range)}`),
    placeholderData: keepPreviousData,
  })

/* ---------- Catalog ---------- */
export const useCategories = () => useQuery({ queryKey: adminKeys.categories, queryFn: () => request<Category[]>('/admin/categories') })

export const useCreateCategory = () =>
  useAdminMutation((body: { name: string; sortOrder?: number }) => request<Category>('/admin/categories', json('POST', body)))

export const useUpdateCategory = () =>
  useAdminMutation(({ id, ...body }: { id: number; name?: string; sortOrder?: number }) =>
    request<Category>(`/admin/categories/${id}`, json('PATCH', body)),
  )

export type ProductFilters = { categoryId?: number; search?: string; status?: 'all' | 'active' | 'inactive' }

export const useProducts = (filters: ProductFilters) =>
  useQuery({
    queryKey: adminKeys.products(filters),
    queryFn: () => request<AdminProduct[]>(`/admin/products${qs(filters)}`),
    placeholderData: keepPreviousData,
  })

export const useProduct = (id: number | null) =>
  useQuery({ queryKey: adminKeys.product(id ?? 0), queryFn: () => request<AdminProductDetail>(`/admin/products/${id}`), enabled: id !== null })

export type ProductInput = {
  categoryId: number
  name: string
  description: string | null
  productType: ProductType
  price: string
  imageUrl: string | null
  isActive: boolean
}

export const useSaveProduct = () =>
  useAdminMutation(({ id, ...body }: Partial<ProductInput> & { id?: number }) =>
    id ? request<AdminProductDetail>(`/admin/products/${id}`, json('PATCH', body)) : request<AdminProductDetail>('/admin/products', json('POST', body)),
  )

export const useSaveRecipe = () =>
  useAdminMutation(({ id, lines }: { id: number; lines: { ingredientId: number; quantity: string }[] }) =>
    request<AdminProductDetail>(`/admin/products/${id}/recipe`, json('PUT', { lines })),
  )

/* ---------- Inventory ---------- */
export type IngredientFilters = { search?: string; status?: 'all' | 'active' | 'inactive' | 'low' }

export const useIngredients = (filters: IngredientFilters = {}) =>
  useQuery({
    queryKey: adminKeys.ingredients(filters),
    queryFn: () => request<Ingredient[]>(`/admin/ingredients${qs(filters)}`),
    placeholderData: keepPreviousData,
  })

export const useLowStock = () => useQuery({ queryKey: adminKeys.lowStock, queryFn: () => request<LowStock[]>('/admin/stock/low') })

export const useSaveIngredient = () =>
  useAdminMutation(({ id, ...body }: { id?: number; name?: string; unit?: string; reorderLevel?: string; isActive?: boolean; openingStock?: string }) =>
    id ? request<Ingredient>(`/admin/ingredients/${id}`, json('PATCH', body)) : request<Ingredient>('/admin/ingredients', json('POST', body)),
  )

export const useRecordMovement = () =>
  useAdminMutation(({ id, ...body }: { id: number; type: 'restock' | 'waste' | 'adjustment'; quantity: string; note?: string | null }) =>
    request<Ingredient>(`/admin/ingredients/${id}/movements`, json('POST', body)),
  )

export const useMovements = (id: number | null) =>
  useInfiniteQuery({
    queryKey: adminKeys.movements(id ?? 0),
    queryFn: ({ pageParam }) => request<Page<StockMovement>>(`/admin/ingredients/${id}/movements${qs({ limit: 20, cursor: pageParam })}`),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: id !== null,
  })

/* ---------- Suppliers & deliveries ---------- */
export const useSuppliers = () => useQuery({ queryKey: adminKeys.suppliers, queryFn: () => request<Supplier[]>('/admin/suppliers') })

export const fetchSupplier = (id: number) => request<SupplierDetail>(`/admin/suppliers/${id}`)

export const useSupplier = (id: number | null) =>
  useQuery({ queryKey: adminKeys.supplier(id ?? 0), queryFn: () => fetchSupplier(id!), enabled: id !== null })

export type SupplierInput = { name: string; contactPerson: string | null; phone: string | null; email: string | null; address: string | null; isActive: boolean }

export const useSaveSupplier = () =>
  useAdminMutation(({ id, ...body }: Partial<SupplierInput> & { id?: number }) =>
    id ? request<SupplierDetail>(`/admin/suppliers/${id}`, json('PATCH', body)) : request<SupplierDetail>('/admin/suppliers', json('POST', body)),
  )

export const useSavePriceList = () =>
  useAdminMutation(({ id, items }: { id: number; items: { ingredientId: number; unitCost: string }[] }) =>
    request<SupplierDetail>(`/admin/suppliers/${id}/ingredients`, json('PUT', { items })),
  )

export const useDeliveries = (status: DeliveryStatus | 'all') =>
  useInfiniteQuery({
    queryKey: adminKeys.deliveries(status),
    queryFn: ({ pageParam }) =>
      request<Page<DeliverySummary>>(`/admin/deliveries${qs({ status: status === 'all' ? null : status, limit: 25, cursor: pageParam })}`),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  })

export const useDelivery = (id: number | null) =>
  useQuery({ queryKey: adminKeys.delivery(id ?? 0), queryFn: () => request<DeliveryDetail>(`/admin/deliveries/${id}`), enabled: id !== null })

export const useCreateDelivery = () =>
  useAdminMutation((body: { supplierId: number; expectedAt: string | null; notes: string | null; items: { ingredientId: number; quantity: string; unitCost: string }[] }) =>
    request<DeliveryDetail>('/admin/deliveries', json('POST', body)),
  )

export const useReceiveDelivery = () =>
  useAdminMutation(({ id, received }: { id: number; received: { ingredientId: number; quantityReceived: string }[] }) =>
    request<DeliveryDetail>(`/admin/deliveries/${id}/receive`, json('POST', { received })),
  )

export const useCancelDelivery = () =>
  useAdminMutation((id: number) => request<DeliveryDetail>(`/admin/deliveries/${id}/cancel`, json('POST')))

/* ---------- Staff ---------- */
export const useEmployees = () => useQuery({ queryKey: adminKeys.employees, queryFn: () => request<Employee[]>('/admin/employees') })

export const useSaveEmployee = () =>
  useAdminMutation(
    ({ id, ...body }: { id?: number; username?: string; fullName?: string; role?: EmployeeRole; isActive?: boolean; password?: string }) =>
      id ? request<Employee>(`/admin/employees/${id}`, json('PATCH', body)) : request<Employee>('/admin/employees', json('POST', body)),
    [adminKeys.employees],
  )

/* ---------- Orders ---------- */
export type OrderFilters = { date?: string; status?: OrderStatus | ''; search?: string }

export const useAdminOrders = (filters: OrderFilters) =>
  useInfiniteQuery({
    queryKey: adminKeys.orders(filters),
    queryFn: ({ pageParam }) => request<Page<AdminOrderSummary>>(`/admin/orders${qs({ ...filters, limit: 30, cursor: pageParam })}`),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    placeholderData: keepPreviousData,
  })

export const useAdminOrder = (id: number | null) =>
  useQuery({ queryKey: adminKeys.order(id ?? 0), queryFn: () => request<AdminOrderDetail>(`/admin/orders/${id}`), enabled: id !== null })

/* ---------- Kiosk devices ---------- */
export type KioskDevice = {
  id: number
  name: string
  status: 'paired' | 'pairing' | 'unpaired'
  isActive: boolean
  pairingExpiresAt: string | null
  pairedAt: string | null
  lastSeenAt: string | null
  createdAt: string
  createdByName: string
}

export type PairingCode = { kiosk: KioskDevice; pairingCode: string }

export const useKiosks = () =>
  useQuery({ queryKey: adminKeys.kiosks, queryFn: () => request<KioskDevice[]>('/admin/kiosks'), refetchInterval: 15_000 })

export const useRegisterKiosk = () =>
  useAdminMutation((name: string) => request<PairingCode>('/admin/kiosks', json('POST', { name })), [adminKeys.kiosks])

export const useIssuePairingCode = () =>
  useAdminMutation((id: number) => request<PairingCode>(`/admin/kiosks/${id}/pairing-code`, json('POST')), [adminKeys.kiosks])

export const useUpdateKiosk = () =>
  useAdminMutation(({ id, ...body }: { id: number; name?: string; isActive?: boolean }) =>
    request<KioskDevice>(`/admin/kiosks/${id}`, json('PATCH', body)), [adminKeys.kiosks])

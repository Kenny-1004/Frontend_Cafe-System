// Mirrors the backend response shapes. Money is always a decimal string ("160.00"),
// stock quantities too ("907.000"); never JS numbers.

export type ServiceType = 'dine_in' | 'take_out'
export type OrderStatus = 'unpaid' | 'pending' | 'serving' | 'completed' | 'cancelled' | 'expired'
export type EmployeeRole = 'cashier' | 'kitchen' | 'admin'
export type ProductType = 'prepared' | 'ready_made'
export type MovementType = 'delivery' | 'restock' | 'sale' | 'adjustment' | 'waste'
export type DeliveryStatus = 'ordered' | 'received' | 'cancelled'

export type ApiErrorDetail = { field?: string; message: string }

// Every endpoint answers { success, message, data, error }
export type ApiEnvelope<T> = {
  success: boolean
  message: string
  data: T | null
  error: { code: string; details: ApiErrorDetail[] | null } | null
}

export type Page<T> = { items: T[]; nextCursor: string | null }

/* ---------- Kiosk ---------- */
export type MenuProduct = {
  id: number
  name: string
  description: string | null
  productType: ProductType
  price: string
  imageUrl: string | null
  isAvailable: boolean
}

export type MenuCategory = { id: number; name: string; products: MenuProduct[] }

export type OrderLine = {
  productId: number
  name: string
  quantity: number
  unitPrice: string
  lineTotal: string
  notes: string | null
}

// What the kiosk sees: identified by the unguessable publicId
export type Order = {
  publicId: string
  orderNumber: number
  businessDate: string
  status: OrderStatus
  serviceType: ServiceType
  total: string
  createdAt: string
  items: OrderLine[]
}

export type PlaceOrderInput = {
  serviceType: ServiceType
  items: { productId: number; quantity: number; notes?: string }[]
}

export type OrderStatusEvent = { orderId: number; publicId: string; orderNumber: number; status: OrderStatus }

/* ---------- Staff ---------- */
export type Staff = { id: number; username: string; fullName: string; role: EmployeeRole }

export type CashierOrderSummary = {
  id: number
  orderNumber: number
  status: OrderStatus
  serviceType: ServiceType
  customerName: string | null
  total: string
  itemCount: number
  createdAt: string
}

export type CashierOrder = CashierOrderSummary & { businessDate: string; paidAt: string | null; items: OrderLine[] }

export type PaymentResult = {
  orderId: number
  orderNumber: number
  status: OrderStatus
  customerName: string
  total: string
  cashTendered: string
  change: string
}

export type CashierSummary = {
  unpaidCount: number
  paidCount: number
  paidTotal: string
  myPaidCount: number
  myPaidTotal: string
}

export type BoardItem = { name: string; quantity: number; notes: string | null; prepared: boolean }

export type BoardCard = {
  id: number
  orderNumber: number
  businessDate: string
  customerName: string
  status: 'pending' | 'serving'
  serviceType: ServiceType
  paidAt: string
  servingAt: string | null
  items: BoardItem[]
}

export type Board = { pending: BoardCard[]; serving: BoardCard[] }

/* ---------- Admin ---------- */
export type Category = { id: number; name: string; sortOrder: number; productCount: number }

export type AdminProduct = {
  id: number
  categoryId: number
  categoryName: string
  name: string
  description: string | null
  productType: ProductType
  price: string
  imageUrl: string | null
  isActive: boolean
  isAvailable: boolean
  recipeLines: number
}

export type RecipeLine = { ingredientId: number; name: string; unit: string; quantity: string; stockQty: string; isActive: boolean }

export type AdminProductDetail = AdminProduct & { recipe: RecipeLine[] }

export type Ingredient = {
  id: number
  name: string
  unit: string
  stockQty: string
  reorderLevel: string
  isActive: boolean
  isLow: boolean
  usedInProducts: number
  createdAt: string
}

export type StockMovement = {
  id: number
  movementType: MovementType
  quantityDelta: string
  note: string | null
  orderId: number | null
  orderNumber: number | null
  deliveryId: number | null
  employeeName: string | null
  createdAt: string
}

export type LowStock = { id: number; name: string; unit: string; stockQty: string; reorderLevel: string }

export type Supplier = {
  id: number
  name: string
  contactPerson: string | null
  phone: string | null
  email: string | null
  address: string | null
  isActive: boolean
  ingredientCount: number
  openDeliveries: number
  createdAt: string
}

export type PriceListItem = { ingredientId: number; name: string; unit: string; unitCost: string }
export type SupplierDetail = Supplier & { priceList: PriceListItem[] }

export type DeliverySummary = {
  id: number
  supplierId: number
  supplierName: string
  status: DeliveryStatus
  orderedAt: string
  expectedAt: string | null
  receivedAt: string | null
  notes: string | null
  itemCount: number
  totalCost: string
  createdByName: string
  receivedByName: string | null
}

export type DeliveryItem = {
  id: number
  ingredientId: number
  name: string
  unit: string
  quantityOrdered: string
  quantityReceived: string | null
  unitCost: string
  lineCost: string
}

export type DeliveryDetail = DeliverySummary & { items: DeliveryItem[] }

export type Employee = {
  id: number
  username: string
  fullName: string
  role: EmployeeRole
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
  activeSessions: number
}

export type AdminOrderSummary = {
  id: number
  orderNumber: number
  businessDate: string
  status: OrderStatus
  serviceType: ServiceType
  customerName: string | null
  total: string
  itemCount: number
  createdAt: string
  paidAt: string | null
  closedAt: string | null
}

export type AdminOrderDetail = AdminOrderSummary & {
  items: OrderLine[]
  payment: { amountDue: string; cashTendered: string; changeGiven: string; paidAt: string; receivedByName: string } | null
  history: { id: number; fromStatus: OrderStatus | null; toStatus: OrderStatus; changedAt: string; changedByName: string | null }[]
}

export type DailySales = { businessDate: string; ordersPaid: number; grossSales: string }
export type BestSeller = { productId: number; productName: string; unitsSold: number; revenue: string }

export type SalesSummary = {
  ordersPaid: number
  grossSales: string
  averageOrder: string
  itemsSold: number
  cancelledOrders: number
  expiredOrders: number
}

export type Dashboard = {
  today: string
  todaySummary: SalesSummary
  openOrders: { unpaid: number; pending: number; serving: number }
  bestSellersToday: BestSeller[]
  last7Days: DailySales[]
  salesByHour: { hour: number; orders: number; sales: string }[]
}

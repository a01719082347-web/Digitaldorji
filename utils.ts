
import { AppConfig, Order, Expense, Worker, WorkerLog, FabricSale } from './types'; // Import Order type
import { CUSTOMER_NAMES } from './names';

export const getMeasurementLabel = (key: string, appConfig: AppConfig): string => {
  const labels: Record<string, string> = {
    length: 'লম্বা',
    body: 'বডি',
    belly: 'পেট',
    hip: 'হিপ',
    gher: 'ঘের',
    shoulder: 'কাঁধ',
    sleeveLength: 'হাতার লম্বা',
    sleeveOpen: 'ওপেন',
    sideSlit: 'সাইড স্লিট',
    collar: 'কলার',
    waist: 'মাজা',
    thigh: 'থাই',
    high: 'হাই',
    knee: 'হাঁটু',
    bottom: 'মুরা',
    belt: 'বেল্ট',
    fly: 'ফ্লাই',
    pocket: 'পকেট'
  };
  return labels[key] || appConfig.measurementLabels[key] || key;
};

/**
 * Retrieves offline orders from local storage.
 */
export const getOfflineOrders = (): Order[] => {
  const offlineOrdersRaw = localStorage.getItem('asraful_tailor_offline_orders');
  return offlineOrdersRaw ? JSON.parse(offlineOrdersRaw) : [];
};

/**
 * Saves a new offline order to local storage.
 */
export const saveOfflineOrder = (order: Order) => {
  const orders = getOfflineOrders();
  // Check if order with this ID already exists (for edits)
  const existingIndex = orders.findIndex(o => o.id === order.id);
  if (existingIndex > -1) {
    orders[existingIndex] = order; // Update existing order
  } else {
    orders.push(order); // Add new order
  }
  localStorage.setItem('asraful_tailor_offline_orders', JSON.stringify(orders));
};

/**
 * Removes an offline order from local storage by ID.
 */
export const removeOfflineOrder = (orderId: string) => {
  const orders = getOfflineOrders();
  const updatedOrders = orders.filter(order => order.id !== orderId);
  localStorage.setItem('asraful_tailor_offline_orders', JSON.stringify(updatedOrders));
};

/**
 * Clears all offline orders from local storage.
 */
export const clearAllOfflineOrders = () => {
  localStorage.removeItem('asraful_tailor_offline_orders');
};

/**
 * Retrieves offline expenses from local storage.
 */
export const getOfflineExpenses = (): Expense[] => {
  const offlineExpensesRaw = localStorage.getItem('asraful_tailor_offline_expenses');
  return offlineExpensesRaw ? JSON.parse(offlineExpensesRaw) : [];
};

/**
 * Saves a new offline expense to local storage.
 */
export const saveOfflineExpense = (expense: Expense) => {
  const expenses = getOfflineExpenses();
  const existingIndex = expenses.findIndex(e => e.id === expense.id);
  if (existingIndex > -1) {
    expenses[existingIndex] = expense;
  } else {
    expenses.push(expense);
  }
  localStorage.setItem('asraful_tailor_offline_expenses', JSON.stringify(expenses));
};

/**
 * Removes an offline expense from local storage by ID.
 */
export const removeOfflineExpense = (expenseId: string) => {
  const expenses = getOfflineExpenses();
  const updatedExpenses = expenses.filter(expense => expense.id !== expenseId);
  localStorage.setItem('asraful_tailor_offline_expenses', JSON.stringify(updatedExpenses));
};

/**
 * Clears all offline expenses from local storage.
 */
export const clearAllOfflineExpenses = () => {
  localStorage.removeItem('asraful_tailor_offline_expenses');
};

/**
 * Retrieves offline workers from local storage.
 */
export const getOfflineWorkers = (): Worker[] => {
  const offlineWorkersRaw = localStorage.getItem('asraful_tailor_offline_workers');
  return offlineWorkersRaw ? JSON.parse(offlineWorkersRaw) : [];
};

/**
 * Saves a new offline worker to local storage.
 */
export const saveOfflineWorker = (worker: Worker) => {
  const workers = getOfflineWorkers();
  const existingIndex = workers.findIndex(w => w.id === worker.id);
  if (existingIndex > -1) {
    workers[existingIndex] = worker;
  } else {
    workers.push(worker);
  }
  localStorage.setItem('asraful_tailor_offline_workers', JSON.stringify(workers));
};

/**
 * Removes an offline worker from local storage by ID.
 */
export const removeOfflineWorker = (workerId: string) => {
  const workers = getOfflineWorkers();
  const updatedWorkers = workers.filter(worker => worker.id !== workerId);
  localStorage.setItem('asraful_tailor_offline_workers', JSON.stringify(updatedWorkers));
};

/**
 * Clears all offline workers from local storage.
 */
export const clearAllOfflineWorkers = () => {
  localStorage.removeItem('asraful_tailor_offline_workers');
};

/**
 * Retrieves offline worker logs from local storage.
 */
export const getOfflineWorkerLogs = (): WorkerLog[] => {
  const offlineWorkerLogsRaw = localStorage.getItem('asraful_tailor_offline_worker_logs');
  return offlineWorkerLogsRaw ? JSON.parse(offlineWorkerLogsRaw) : [];
};

/**
 * Saves a new offline worker log to local storage.
 */
export const saveOfflineWorkerLog = (workerLog: WorkerLog) => {
  const workerLogs = getOfflineWorkerLogs();
  const existingIndex = workerLogs.findIndex(l => l.id === workerLog.id);
  if (existingIndex > -1) {
    workerLogs[existingIndex] = workerLog;
  } else {
    workerLogs.push(workerLog);
  }
  localStorage.setItem('asraful_tailor_offline_worker_logs', JSON.stringify(workerLogs));
};

/**
 * Removes an offline worker log from local storage by ID.
 */
export const removeOfflineWorkerLog = (workerLogId: string) => {
  const workerLogs = getOfflineWorkerLogs();
  const updatedWorkerLogs = workerLogs.filter(log => log.id !== workerLogId);
  localStorage.setItem('asraful_tailor_offline_worker_logs', JSON.stringify(updatedWorkerLogs));
};

/**
 * Clears all offline worker logs from local storage.
 */
export const clearAllOfflineWorkerLogs = () => {
  localStorage.removeItem('asraful_tailor_offline_worker_logs');
};

/**
 * Retrieves offline fabric sales from local storage.
 */
export const getOfflineFabricSales = (): FabricSale[] => {
  const offlineFabricSalesRaw = localStorage.getItem('asraful_tailor_offline_fabric_sales');
  return offlineFabricSalesRaw ? JSON.parse(offlineFabricSalesRaw) : [];
};

/**
 * Saves a new offline fabric sale to local storage.
 */
export const saveOfflineFabricSale = (fabricSale: FabricSale) => {
  const fabricSales = getOfflineFabricSales();
  const existingIndex = fabricSales.findIndex(s => s.id === fabricSale.id);
  if (existingIndex > -1) {
    fabricSales[existingIndex] = fabricSale;
  } else {
    fabricSales.push(fabricSale);
  }
  localStorage.setItem('asraful_tailor_offline_fabric_sales', JSON.stringify(fabricSales));
};

/**
 * Removes an offline fabric sale from local storage by ID.
 */
export const removeOfflineFabricSale = (saleId: string) => {
  const fabricSales = getOfflineFabricSales();
  const updatedSales = fabricSales.filter(sale => sale.id !== saleId);
  localStorage.setItem('asraful_tailor_offline_fabric_sales', JSON.stringify(updatedSales));
};

/**
 * Clears all offline fabric sales from local storage.
 */
export const clearAllOfflineFabricSales = () => {
  localStorage.removeItem('asraful_tailor_offline_fabric_sales');
};

/**
 * Gets the combined list of master names and user-added custom names
 */
export const getCombinedCustomerNames = (): string[] => {
  const customNamesRaw = localStorage.getItem('asraful_custom_customer_names');
  const customNames: string[] = customNamesRaw ? JSON.parse(customNamesRaw) : [];
  
  // Combine lists and remove duplicates
  const allNames = [...CUSTOMER_NAMES, ...customNames];
  return Array.from(new Set(allNames));
};

/**
 * Registers a new name to the custom names database if it doesn't already exist
 */
export const registerCustomerName = (name: string) => {
  if (!name || name.trim().length === 0) return;
  
  const trimmedName = name.trim();
  const allNames = getCombinedCustomerNames(); // Use getCombinedCustomerNames to check against all names
  
  if (!allNames.includes(trimmedName)) {
    const customNamesRaw = localStorage.getItem('asraful_custom_customer_names');
    const customNames: string[] = customNamesRaw ? JSON.parse(customNamesRaw) : [];
    
    customNames.push(trimmedName);
    localStorage.setItem('asraful_custom_customer_names', JSON.stringify(customNames));
  }
};
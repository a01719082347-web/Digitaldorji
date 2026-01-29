

export enum OrderStatus {
  PENDING = 'PENDING',
  CUTTING = 'CUTTING',
  READY = 'READY',
  DELIVERED = 'DELIVERED'
}

export enum MeasurementType {
  BODY = 'BODY',
  GARMENT = 'GARMENT'
}

export interface FabricItem {
  type: string;
  rate: number;
  quantity: number; 
  gira: number;     
  width: number;
  cost: number;
  isPiece?: boolean; 
}

export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export interface PersonMeasurements {
  id: string;
  personName: string; 
  orderItemType?: string; // e.g., "Kamiz", "Shirt", "Pant" - used for shirt/top type
  pantOrderItemType?: string; // Added for pant item type
  hasShirt: boolean;
  hasPant: boolean;
  measurementType?: MeasurementType; // Moved from Order to PersonMeasurements
  shirt: {
    length: string;
    body: string;
    belly: string;
    hip: string;
    gher: string;
    shoulder: string;
    sleeveLength: string;
    sleeveOpen: string;
    sideSlit: string;
    collar: string;
  };
  pant: {
    length: string;
    waist: string;
    hip: string;
    thigh: string;
    high: string;
    knee: string;
    bottom: string;
    belt: string;
    fly: string;
    pocket: string;
  };
  additionalMeasurements: CustomField[]; 
  shirtNotes: string;
  pantNotes: string;
  shirtImage?: string; // Added for shirt measurement image
  pantImage?: string;  // Added for pant measurement image
}

export interface Measurements {
  shirt: {
    length: string;
    body: string;
    belly: string;
    hip: string;
    gher: string;
    shoulder: string;
    sleeveLength: string;
    sleeveOpen: string;
    sideSlit: string;
    collar: string;
  };
  pant: {
    length: string;
    waist: string;
    hip: string;
    thigh: string;
    high: string;
    knee: string;
    bottom: string;
    belt: string;
    fly: string;
    pocket: string;
  };
  additionalMeasurements?: { category: 'shirt' | 'pant'; label: string; value: string }[];
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  mobileNumber: string;
  deliveryDate: string;
  // measurementType: MeasurementType; // Removed from Order interface
  itemDescription?: string;
  itemQuantity?: string;
  topType?: string;
  topQuantity?: string;
  bottomType?: string;
  bottomQuantity?: string;
  measurements: Measurements; 
  persons: PersonMeasurements[]; // Changed to always be an array
  fabricDetails: FabricItem[];
  designOptions: {
    referenceImage?: string;
    fabricType?: string;
  };
  payment: {
    tailoringCharge: number;
    fabricCost: number;
    total: number;
    advance: number;
    due: number;
    pointsEarned?: number;
  };
  notes: string;
  shirtNotes?: string;
  pantNotes?: string;
  status: OrderStatus;
  orderDate: string;
  hasShirt?: boolean;
  hasPant?: boolean;
  isOffline?: boolean; // Added for offline mode tracking
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  note: string;
}

export interface Worker {
  id: string;
  name: string;
  phone: string;
}

export interface WorkerLog {
  id: string;
  workerId: string;
  date: string;
  description: string;
  totalEarned: number; 
  amountTaken: number; 
  type: 'work' | 'payment';
}

export interface FabricSale {
  id: string;
  date: string;
  customerName: string;
  mobileNumber: string;
  fabricType: string;
  rate: number;
  quantity: number;
  gira?: number; // Added gira field
  total: number;
  isPiece?: boolean; // Added for Gaj/Piece toggle
  isOffline?: boolean; // Added for offline mode tracking
}

export interface UserProfile {
  uid: string;
  name: string;
  phone?: string;
  email?: string;
  createdAt: string;
  approved: boolean; // New field for admin approval
  role: 'admin' | 'user'; // New field for user roles
  trialEndsDate?: string; // New: Date when free trial ends (ISO string)
  isTrialActive?: boolean; // New: Flag to indicate if trial is currently active
  referralCode?: string; // New: Unique code for user to refer others (e.g., UID slice)
  referredBy?: string; // New: UID of the user who referred this user
  referrerMobile?: string; // New: Mobile number of the referrer (for payment to referrer)

  // Payment fields for referred users
  hasPaid?: boolean; // Whether the user has paid the one-time fee
  paymentMethod?: 'bKash' | 'Rocket'; // Payment method used by referred user
  transactionId?: string; // Transaction ID for the one-time payment
  paymentAmount?: number; // Amount paid by the referred user (e.g., 3000 BDT)
  paymentDate?: string; // Date of payment by referred user

  referralEarnings?: number; // Total accumulated earnings from referring others (for referrer)
}

export interface AppConfig {
  appName: string;
  address?: string; // New: Shop address
  shopPhone?: string; // New: Shop contact phone
  tagline?: string;
  paymentInfo?: string; // New: Payment method details (e.g., bKash, Nagad)
  memoFooter?: string; // New: Custom text for memo footer
  primaryColor: string;
  secondaryColor: string;
  textColor: string;      
  backgroundColor: string; 
  fabricTypes: string[];
  measurementLabels: Record<string, string>;
  profileImage?: string; // New: Optional custom profile image for the app
  prayerTimes: {
    fajr: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
  };
  shirtNoteSuggestions?: string[]; // New: Customizable shirt note suggestions
  pantNoteSuggestions?: string[];  // New: Customizable pant note suggestions
  shirtItemSuggestions?: string[]; // New: Customizable shirt item quick selects
  pantItemSuggestions?: string[];  // New: Customizable pant item quick selects
  referralPaymentAmount?: number; // New: Amount referrer gets (e.g., 500 BDT)
  onetimeSignupFee?: number; // New: One-time fee for referred user (e.g., 3000 BDT)
  adminPaymentNumbers?: { bKash: string; Rocket: string; }; // New: Admin's numbers for receiving payments
}

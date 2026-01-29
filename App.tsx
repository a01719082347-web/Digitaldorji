
import React, { useState, useEffect, useCallback } from 'react';
import { Order, OrderStatus, AppConfig, Expense, Worker, WorkerLog, UserProfile, FabricSale } from './types';
import { HomeView } from './views/HomeView';
import { NewOrderView } from "./views/NewOrderView";
import { OrderListView } from './views/OrderListView';
import { ReportView } from './views/ReportView';
import { EditOrderView } from './views/EditOrderView';
import { AuthView } from './views/AuthView';
import { SettingsView } from './views/SettingsView'; // Changed from AdminView
import { ExpenseView } from './views/ExpenseView';
import { WorkerView } from './views/WorkerView';
import { SyncView } from './views/SyncView'; // Import SyncView
import { FabricSaleView } from './views/FabricSaleView'; // Import FabricSaleView
import { RewardsView } from './views/RewardsView'; // Import RewardsView
import { GuideView } from './views/GuideView'; // Import GuideView
import { MemoPrintView } from './views/MemoPrintView'; // NEW: Import MemoPrintView
// REMOVED: import { EntryView } from './views/EntryView';
import { auth, db } from './firebase';
import { onAuthStateChanged, User, updateProfile } from 'firebase/auth'; // Only Auth related imports from here, added updateProfile
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  orderBy,
  updateDoc,
  doc,
  setDoc, // Import setDoc for creating documents with a specific ID
  getDoc, // Import getDoc to check if a document exists
  getDocs, // Import getDocs for querying multiple documents
  deleteDoc, // Import deleteDoc to remove documents
  where // Import where for filtering
} from 'firebase/firestore'; // Firestore related imports from here
import { 
  getOfflineOrders, saveOfflineOrder, removeOfflineOrder, clearAllOfflineOrders,
  getOfflineExpenses, saveOfflineExpense, removeOfflineExpense, clearAllOfflineExpenses,
  getOfflineWorkers, saveOfflineWorker, removeOfflineWorker, clearAllOfflineWorkers,
  getOfflineWorkerLogs, saveOfflineWorkerLog, removeOfflineWorkerLog, clearAllOfflineWorkerLogs,
  getOfflineFabricSales, saveOfflineFabricSale, removeOfflineFabricSale, clearAllOfflineFabricSales,
} from './utils'; // Import all offline utilities

const PRAYER_QUOTES = [
  "কাজের চাইতে নামাজের গুরুত্ব বেশি দাও",
  "নামাজ মুমিনের প্রধান ইবাদত",
  "সময়মতো নামাজ পড়া উত্তম আমল",
  "সালাত আদায় করুন, শান্তিতে থাকুন"
];

// Updated ADMIN_EMAILS to an array of specific admin emails
const ADMIN_EMAILS = ["a01719082347@gmail.com", "namemdasraful@gmail.com", "as2013bd@gmail.com", "mdasrafulislamrony@gmail.com"]; // Added my email
const TRIAL_DAYS = 3; // 3-day free trial
// REMOVED: const REFERRAL_BONUS_DAYS = 7; // Days added for referral

const PrayerTicker: React.FC = () => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((prev) => (prev + 1) % PRAYER_QUOTES.length), 5000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="w-full text-center py-1 mt-1">
      <p className="text-[12px] font-black text-white/90 italic">{PRAYER_QUOTES[index]}</p>
    </div>
  );
};

const defaultConfig: AppConfig = {
  appName: "Digital দর্জি",
  tagline: "নিখুঁত হিসাবের বিশ্বস্ত ঠিকানা",
  primaryColor: "#009688",
  secondaryColor: "#00796b",
  textColor: "#1f2937",
  backgroundColor: "#f3f4f6",
  fabricTypes: ["এক কালার", "প্রিন্ট কাপড়", "টরে কাপড়", "থ্রি পিস"],
  measurementLabels: {},
  prayerTimes: { fajr: '05:00', dhuhr: '12:15', asr: '16:30', maghrib: '18:15', isha: '19:45' },
  shirtNoteSuggestions: [], // New default
  pantNoteSuggestions: [],  // New default
  shirtItemSuggestions: [], // New default
  pantItemSuggestions: [],  // New default
  referralPaymentAmount: 500, // Default referral payment
  onetimeSignupFee: 3000,    // Default one-time signup fee
  adminPaymentNumbers: { bKash: "01719082347", Rocket: "01719082347" }, // Default admin payment numbers
};

const PrayerTimer: React.FC<{ prayerTimes: AppConfig['prayerTimes'] }> = ({ prayerTimes }) => {
  const [displayInfo, setDisplayInfo] = useState({ name: '', countdown: '' });

  useEffect(() => {
    const calculateCountdown = () => {
      const now = new Date();
      const timings = [
        { name: 'ফজর', time: prayerTimes.fajr },
        { name: 'যোহর', time: prayerTimes.dhuhr },
        { name: 'আসর', time: prayerTimes.asr },
        { name: 'মাগরিব', time: prayerTimes.maghrib },
        { name: 'এশা', time: prayerTimes.isha },
      ];

      let nextFound = null;
      let targetDate = new Date();

      for (const p of timings) {
        const [h, m] = p.time.split(':').map(Number);
        const pDate = new Date();
        pDate.setHours(h, m, 0, 0);
        if (pDate > now) {
          nextFound = p;
          targetDate = pDate;
          break;
        }
      }

      if (!nextFound) {
        nextFound = timings[0];
        const [h, m] = nextFound.time.split(':').map(Number);
        targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 1);
        targetDate.setHours(h, m, 0, 0);
      }

      const diff = targetDate.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setDisplayInfo({
        name: nextFound.name,
        countdown: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      });
    };

    const timer = setInterval(calculateCountdown, 1000);
    calculateCountdown();
    return () => clearInterval(timer);
  }, [prayerTimes]);

  return (
    <div className="bg-black/20 px-3 py-1.5 rounded-2xl border border-white/10 flex flex-col items-center min-w-[95px]">
      <p className="text-[10px] font-black text-white/70 uppercase leading-none mb-0.5">{displayInfo.name} বাকি</p>
      <p className="text-[14px] font-black text-white leading-none tracking-tight font-mono">{displayInfo.countdown}</p>
    </div>
  );
};

type ViewState = 'home' | 'new-order' | 'orders' | 'reports' | 'edit-order' | 'settings' | 'auth' | 'expenses' | 'workers' | 'sync' | 'fabric-sales' | 'rewards' | 'guide' | 'memo-print'; // NEW: Added 'memo-print'

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(auth.currentUser); // Initialize user from auth.currentUser
  const [isOfflineMode, setIsOfflineMode] = useState(true); 
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<ViewState>('home'); 
  
  // Online data states
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workerLogs, setWorkerLogs] = useState<WorkerLog[]>([]);
  const [fabricSales, setFabricSales] = useState<FabricSale[]>([]);

  // Offline data states
  const [offlineOrders, setOfflineOrders] = useState<Order[]>(getOfflineOrders());
  const [offlineExpenses, setOfflineExpenses] = useState<Expense[]>(getOfflineExpenses());
  const [offlineWorkers, setOfflineWorkers] = useState<Worker[]>(getOfflineWorkers());
  const [offlineWorkerLogs, setOfflineWorkerLogs] = useState<WorkerLog[]>(getOfflineWorkerLogs());
  const [offlineFabricSales, setOfflineFabricSales] = useState<FabricSale[]>(getOfflineFabricSales());

  const [toast, setToast] = useState<string | null>(null);
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('asraful_tailor_config');
    const savedConfig = saved ? JSON.parse(saved) : {};
    return { ...defaultConfig, ...savedConfig }; // Merge with default config
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // New state for user profile
  const [pendingApprovalUsersCount, setPendingApprovalUsersCount] = useState(0); // New state for pending user count
  const [initialReferrerMobile, setInitialReferrerMobile] = useState<string | undefined>(undefined); // New state for referrer mobile from URL
  
  // Check if user's email is in the ADMIN_EMAILS array and they have 'admin' role
  const isCurrentUserAdmin = userProfile?.email ? ADMIN_EMAILS.includes(userProfile.email) && userProfile?.role === 'admin' : false;

  // New derived state to determine if online features can be accessed
  const canAccessOnlineFeatures = userProfile 
    ? (isCurrentUserAdmin && userProfile.approved) || // Admin users must be approved
      (userProfile.role === 'user' && userProfile.approved) || // Permanently approved general users
      // For referred users, isTrialActive is no longer applicable. Instead, check for `hasPaid` and `approved`.
      (userProfile.role === 'user' && userProfile.hasPaid && userProfile.approved) ||
      (userProfile.role === 'user' && userProfile.isTrialActive === true && userProfile.trialEndsDate && new Date(userProfile.trialEndsDate) > new Date()) // Active trial for general users (legacy/non-paid flow)
    : false;

  const [trialMessage, setTrialMessage] = useState<string | null>(null);

  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  const [orderToPrint, setOrderToPrint] = useState<Order | null>(null); // NEW: State to hold order for printing
  const [initialAuthType, setInitialAuthType] = useState<'signup' | 'login' | undefined>(undefined); // New state to control AuthView mode
  const [authOrigin, setAuthOrigin] = useState<'home' | 'settings'>('home'); // Tracks where auth was initiated from

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);

  // Parse referrer mobile from URL on app load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const referrerMobile = urlParams.get('referrer'); // Changed from 'referral' to 'referrer'
    if (referrerMobile) {
      setInitialReferrerMobile(referrerMobile);
      showToast(`রেফারেল মোবাইল "${referrerMobile}" ব্যবহার করা হচ্ছে!`);
    }
  }, [showToast]);


  // Function to sync ALL offline data to Firebase
  const syncAllOfflineDataToFirebase = useCallback(async () => {
    // Only allow sync if user is logged in AND has online access (approved or active trial / paid)
    if (!user || !canAccessOnlineFeatures) {
      showToast('অনলাইন ব্যাকআপ নিতে লগইন করুন অথবা আপনার অ্যাকাউন্ট অনুমোদন করুন।');
      return;
    }

    let totalSyncedCount = 0;
    let syncSuccess = true;

    // Sync Orders
    const pendingOrders = getOfflineOrders();
    for (const offlineOrder of pendingOrders) {
      try {
        const orderRef = doc(db, 'users', user.uid, 'orders', offlineOrder.id);
        const orderToSave = { ...offlineOrder };
        delete orderToSave.isOffline; 
        await setDoc(orderRef, orderToSave);
        removeOfflineOrder(offlineOrder.id);
        totalSyncedCount++;
      } catch (e) {
        console.error(`Failed to sync offline order ${offlineOrder.id}:`, e);
        syncSuccess = false;
      }
    }

    // Sync Expenses
    const pendingExpenses = getOfflineExpenses();
    for (const offlineExpense of pendingExpenses) {
      try {
        const expenseRef = doc(db, 'users', user.uid, 'expenses', offlineExpense.id);
        await setDoc(expenseRef, offlineExpense);
        removeOfflineExpense(offlineExpense.id);
        totalSyncedCount++;
      }
      catch (e) {
        console.error(`Failed to sync offline expense ${offlineExpense.id}:`, e);
        syncSuccess = false;
      }
    }

    // Sync Workers
    const pendingWorkers = getOfflineWorkers();
    for (const offlineWorker of pendingWorkers) {
      try {
        const workerRef = doc(db, 'users', user.uid, 'workers', offlineWorker.id);
        await setDoc(workerRef, offlineWorker);
        removeOfflineWorker(offlineWorker.id);
        totalSyncedCount++;
      }
      catch (e) {
        console.error(`Failed to sync offline worker ${offlineWorker.id}:`, e);
        syncSuccess = false;
      }
    }

    // Sync Worker Logs
    const pendingWorkerLogs = getOfflineWorkerLogs();
    for (const offlineWorkerLog of pendingWorkerLogs) {
      try {
        const workerLogRef = doc(db, 'users', user.uid, 'workerLogs', offlineWorkerLog.id);
        await setDoc(workerLogRef, offlineWorkerLog);
        removeOfflineWorkerLog(offlineWorkerLog.id);
        totalSyncedCount++;
      }
      catch (e) {
        console.error(`Failed to sync offline worker log ${offlineWorkerLog.id}:`, e);
        syncSuccess = false;
      }
    }

    // Sync Fabric Sales
    const pendingFabricSales = getOfflineFabricSales();
    for (const offlineFabricSale of pendingFabricSales) {
      try {
        const fabricSaleRef = doc(db, 'users', user.uid, 'fabricSales', offlineFabricSale.id);
        // Remove the isOffline flag before saving to Firebase, as it's an offline-only indicator
        const fabricSaleToSave = { ...offlineFabricSale };
        delete fabricSaleToSave.isOffline;
        await setDoc(fabricSaleRef, fabricSaleToSave);
        removeOfflineFabricSale(offlineFabricSale.id);
        totalSyncedCount++;
      }
      catch (e) {
        console.error(`Failed to sync offline fabric sale ${offlineFabricSale.id}:`, e);
        syncSuccess = false;
      }
    }

    // Update all offline states
    setOfflineOrders(getOfflineOrders());
    setOfflineExpenses(getOfflineExpenses());
    setOfflineWorkers(getOfflineWorkers());
    setOfflineWorkerLogs(getOfflineWorkerLogs());
    setOfflineFabricSales(getOfflineFabricSales());

    if (totalSyncedCount > 0) {
      showToast(`${totalSyncedCount}টি ডাটা সফলভাবে অনলাইনে সিঙ্ক হয়েছে!`);
    } else if (!syncSuccess) {
      showToast('কিছু ডাটা সিঙ্ক করা যায়নি।');
    } else {
      // No toast if nothing was pending and no errors occurred (message handled by SyncView)
    }
  }, [user, canAccessOnlineFeatures, showToast]);

  // Auth state change effect
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u); // Update user state here
      if (u) {
        setIsOfflineMode(false); // Assume online if logged in
        
        const userProfileRef = doc(db, 'users', u.uid);
        const docSnap = await getDoc(userProfileRef);
        let currentProfile: UserProfile;

        if (docSnap.exists()) {
          currentProfile = docSnap.data() as UserProfile;

          // Admin role handling
          if (ADMIN_EMAILS.includes(u.email || '') && (currentProfile.role !== 'admin' || !currentProfile.approved)) {
            await updateDoc(userProfileRef, { role: 'admin', approved: true, isTrialActive: false, trialEndsDate: null, hasPaid: true });
            currentProfile = { ...currentProfile, role: 'admin', approved: true, isTrialActive: false, trialEndsDate: undefined, hasPaid: true };
          }
          
          // General user role handling
          if (currentProfile.role === 'user') {
            let needsUpdate = false;
            // Generate referral code if missing
            if (!currentProfile.referralCode) {
              currentProfile.referralCode = u.uid.slice(0, 8).toUpperCase();
              needsUpdate = true;
            }

            // Only update trial/paid status if not yet approved or paid
            if (!currentProfile.approved && !currentProfile.hasPaid) {
              const now = new Date();
              // Original trial logic (if user doesn't pay the fee)
              if (!currentProfile.trialEndsDate || isNaN(new Date(currentProfile.trialEndsDate).getTime())) {
                currentProfile.trialEndsDate = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
                currentProfile.isTrialActive = true;
                needsUpdate = true;
              } else {
                const trialEndDate = new Date(currentProfile.trialEndsDate);
                currentProfile.isTrialActive = trialEndDate > now;
                needsUpdate = true;
              }
            } else if (currentProfile.approved && currentProfile.hasPaid) {
              // If already approved and paid, ensure trial is off
              if (currentProfile.isTrialActive === true || currentProfile.trialEndsDate) {
                currentProfile.isTrialActive = false;
                currentProfile.trialEndsDate = undefined;
                needsUpdate = true;
              }
            }

            if (needsUpdate) {
              await updateDoc(userProfileRef, { 
                trialEndsDate: currentProfile.trialEndsDate,
                isTrialActive: currentProfile.isTrialActive,
                referralCode: currentProfile.referralCode,
                // Only update hasPaid if it needs to be explicitly set
                ...(currentProfile.hasPaid !== undefined && { hasPaid: currentProfile.hasPaid }),
              });
            }
          }
        } else {
          // New user profile creation
          const isAdmin = u.email ? ADMIN_EMAILS.includes(u.email) : false;
          const now = new Date();
          const newProfile: UserProfile = {
            uid: u.uid,
            name: u.displayName || u.email || u.phoneNumber || 'নতুন ব্যবহারকারী',
            phone: u.phoneNumber || undefined,
            email: u.email || undefined,
            createdAt: now.toISOString(),
            approved: isAdmin, // Admins are auto-approved
            role: isAdmin ? 'admin' : 'user',
            referralCode: u.uid.slice(0, 8).toUpperCase(),
            referralEarnings: 0, // Initialize referral earnings
            // For new users, they are initially not paid/approved (unless admin)
            hasPaid: isAdmin, // Admins are considered paid/approved from start
            paymentAmount: isAdmin ? config.onetimeSignupFee : undefined,
            paymentDate: isAdmin ? now.toISOString() : undefined,
            paymentMethod: isAdmin ? 'bKash' : undefined, // Default for admin
            transactionId: isAdmin ? 'ADMIN_INIT' : undefined,
            // If new user is referred, mark them as referredBy (referrer UID)
            referredBy: initialReferrerMobile ? 'pending_lookup' : undefined, // Mark for lookup by mobile
            referrerMobile: initialReferrerMobile || undefined,
          };
          
          if (!isAdmin) {
             // Non-admin users start with trial and needing payment
             newProfile.isTrialActive = true;
             newProfile.trialEndsDate = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
             newProfile.hasPaid = false; // Must pay to be approved
          } else {
            newProfile.isTrialActive = false;
            newProfile.trialEndsDate = undefined;
          }

          await setDoc(userProfileRef, newProfile);
          currentProfile = newProfile;

          // If a new user signed up with a referrer mobile from the URL, process it now
          if (initialReferrerMobile && currentProfile.role === 'user') {
            await processReferrerLookup(u.uid, initialReferrerMobile);
            // Clear the referrer mobile from the URL to prevent re-application
            window.history.replaceState({}, document.title, window.location.pathname);
            setInitialReferrerMobile(undefined); // Clear state
          }
        }
        setUserProfile(currentProfile);

        // Set message for unapproved users
        if (currentProfile.role === 'user' && !currentProfile.approved) {
          if (!currentProfile.hasPaid) {
            setTrialMessage(`আপনার অ্যাকাউন্ট অনুমোদনের অপেক্ষায়। অনলাইন ফিচার্স পেতে এককালীন ৳${config.onetimeSignupFee} প্রদান করুন।`);
          } else {
            setTrialMessage(`আপনার পেমেন্ট যাচাই করা হচ্ছে। অনুগ্রহ করে এডমিনের অনুমোদনের জন্য অপেক্ষা করুন।`);
          }
        } else {
          setTrialMessage(null); // Clear message if admin or permanently approved/paid
        }
        
        // After user is set and potentially approved, attempt to sync offline data
        // Sync only if user has general online access (approved or active trial / paid)
        if (canAccessOnlineFeatures) { 
          setTimeout(async () => {
            await syncAllOfflineDataToFirebase();
          }, 1000); 
        }
      } else {
        setIsOfflineMode(true); // Fallback to offline if not logged in
        setUserProfile(null);
        setTrialMessage(null);
        // Load offline data when no user is logged in
        setOfflineOrders(getOfflineOrders());
        setOfflineExpenses(getOfflineExpenses());
        setOfflineWorkers(getOfflineWorkers());
        setOfflineWorkerLogs(getOfflineWorkerLogs());
        setOfflineFabricSales(getOfflineFabricSales());
      }
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, [syncAllOfflineDataToFirebase, canAccessOnlineFeatures, initialReferrerMobile, config.onetimeSignupFee]); // Add relevant config as dependency

  // Effect to listen for pending approval users (only for admin)
  useEffect(() => {
    if (user && isCurrentUserAdmin) {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'user'),
        where('approved', '==', false)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setPendingApprovalUsersCount(snapshot.size);
      });
      return () => unsubscribe();
    } else {
      setPendingApprovalUsersCount(0); // Reset if not admin or not logged in
    }
  }, [user, isCurrentUserAdmin]);


  // Data fetching effect (online/offline)
  useEffect(() => {
    // Only fetch online data if user is logged in AND has online access
    if (user && !isOfflineMode && canAccessOnlineFeatures) { 
      const qOrders = query(collection(db, 'users', user.uid, 'orders'), orderBy('orderDate', 'desc'));
      const unsubscribeOrders = onSnapshot(qOrders, (s) => setOrders(s.docs.map(d => ({ ...d.data() as Order, id: d.id }))));
      
      const qExpenses = query(collection(db, 'users', user.uid, 'expenses'), orderBy('date', 'desc'));
      const unsubscribeExpenses = onSnapshot(qExpenses, (s) => setExpenses(s.docs.map(d => ({ ...d.data() as Expense, id: d.id }))));

      const qWorkers = query(collection(db, 'users', user.uid, 'workers'));
      const unsubscribeWorkers = onSnapshot(qWorkers, (s) => setWorkers(s.docs.map(d => ({ ...d.data() as Worker, id: d.id }))));

      const qLogs = query(collection(db, 'users', user.uid, 'workerLogs'), orderBy('date', 'desc'));
      const unsubscribeLogs = onSnapshot(qLogs, (s) => setWorkerLogs(s.docs.map(d => ({ ...d.data() as WorkerLog, id: d.id }))));

      const qFabricSales = query(collection(db, 'users', user.uid, 'fabricSales'), orderBy('date', 'desc'));
      const unsubscribeFabricSales = onSnapshot(qFabricSales, (s) => setFabricSales(s.docs.map(d => ({ ...d.data() as FabricSale, id: d.id }))));

      return () => {
        unsubscribeOrders();
        unsubscribeExpenses();
        unsubscribeWorkers();
        unsubscribeLogs();
        unsubscribeFabricSales();
      };
    } else {
      // If offline or no online access, populate from local storage.
      setOrders(getOfflineOrders());
      setExpenses(getOfflineExpenses());
      setWorkers(getOfflineWorkers());
      setWorkerLogs(getOfflineWorkerLogs());
      setFabricSales(getOfflineFabricSales());
    }
  }, [user, isOfflineMode, canAccessOnlineFeatures]); // Added canAccessOnlineFeatures as dependency

  // Persist all offline data to localStorage whenever their respective states change
  useEffect(() => { localStorage.setItem('asraful_tailor_offline_orders', JSON.stringify(offlineOrders)); }, [offlineOrders]);
  useEffect(() => { localStorage.setItem('asraful_tailor_offline_expenses', JSON.stringify(offlineExpenses)); }, [offlineExpenses]);
  useEffect(() => { localStorage.setItem('asraful_tailor_offline_workers', JSON.stringify(offlineWorkers)); }, [offlineWorkers]);
  useEffect(() => { localStorage.setItem('asraful_tailor_offline_worker_logs', JSON.stringify(offlineWorkerLogs)); }, [offlineWorkerLogs]);
  useEffect(() => { localStorage.setItem('asraful_tailor_offline_fabric_sales', JSON.stringify(offlineFabricSales)); }, [offlineFabricSales]);


  const handleUpdateOrderStatus = async (id: string, newStatus: OrderStatus) => {
    // Only allow if has online access OR if it's an offline order being modified in offline mode
    if (!canAccessOnlineFeatures && (!isOfflineMode || !orders.find(o => o.id === id)?.isOffline)) {
      showToast('অনলাইন অ্যাক্সেস না থাকলে এই কাজটি করা যাবে না।');
      return;
    }

    const orderToUpdate = orders.find(o => o.id === id); // Find in current state (which could be online or offline)

    if (!orderToUpdate) {
        showToast('অর্ডার খুঁজে পাওয়া যায়নি।');
        return;
    }
    
    const modifiedOrder: Order = { ...orderToUpdate, status: newStatus };

    await handleSaveOrder(modifiedOrder, (success, message) => { // Removed `savedOrder` from callback for status update
        if (success) {
            showToast(message || 'অর্ডার স্ট্যাটাস আপডেট হয়েছে');
        } else {
            showToast(message || 'স্ট্যাটাস আপডেট করা সম্ভব হয়নি');
        }
    });
  };

  const handleSaveOrder = async (order: Order, onComplete: (success: boolean, message: string, savedOrder?: Order) => void) => { // NEW: added savedOrder to onComplete callback
    // If not logged in or no online access, save to offline storage.
    if (!user || !canAccessOnlineFeatures) {
      const offlineOrder: Order = { ...order, isOffline: true };
      saveOfflineOrder(offlineOrder); // Save to local storage
      setOfflineOrders(getOfflineOrders()); // Update state
      setOrders(getOfflineOrders()); // Update displayed orders
      onComplete(true, 'অর্ডার অফলাইনে সেভ হয়েছে। অনলাইনে এলে সিঙ্ক হবে।', offlineOrder); // NEW: return offlineOrder
      // if (view === 'new-order') setView('home'); // This will now be handled by NewOrderView
      // else if (view === 'edit-order') setView('orders');
      return;
    }

    // If online and has access, save to Firebase.
    try {
      const orderRef = doc(db, 'users', user.uid, 'orders', order.id);
      const docSnap = await getDoc(orderRef);

      const orderToSave = { ...order };
      delete orderToSave.isOffline; // Ensure isOffline flag is not saved to Firebase

      if (docSnap.exists()) {
        await updateDoc(orderRef, orderToSave);
      } else {
        await setDoc(orderRef, orderToSave);
      }

      // If this was an offline order that just got synced
      if (order.isOffline) {
        removeOfflineOrder(order.id);
        setOfflineOrders(getOfflineOrders()); // Refresh offline orders state
        showToast('অফলাইন অর্ডার অনলাইনে সিঙ্ক ও সেভ হয়েছে!');
      } else {
        showToast('অর্ডার সেভ/আপডেট হয়েছে');
      }

      onComplete(true, 'অর্ডার সেভ/আপডেট হয়েছে', orderToSave); // NEW: return orderToSave
      // if (view === 'new-order') setView('home'); // This will now be handled by NewOrderView
      // else if (view === 'edit-order') setView('orders');
    } catch (e) {
      console.error("Error saving/updating order:", e);
      onComplete(false, 'সেভ/আপডেট করা সম্ভব হয়নি');
      showToast('সেভ/আপডেট করা সম্ভব হয়নি');
    }
  };

  const handleSaveExpense = async (ex: Expense) => {
    // If not logged in or no online access, save to offline storage.
    if (!user || !canAccessOnlineFeatures) {
      saveOfflineExpense(ex); // Save to local storage
      setOfflineExpenses(getOfflineExpenses()); // Update state
      setExpenses(getOfflineExpenses()); // Update displayed expenses
      showToast('খরচ অফলাইনে সেভ হয়েছে। অনলাইনে এলে সিঙ্ক হবে।');
      return;
    }
    // If online and has access, save to Firebase.
    try {
      const expenseRef = doc(db, 'users', user.uid, 'expenses', ex.id); // Use setDoc for consistency, generating ID if new
      const docSnap = await getDoc(expenseRef);
      if (docSnap.exists()) {
        await updateDoc(expenseRef, ex); // Update existing if ID found
      } else {
        await setDoc(expenseRef, ex); // Create new doc with provided ID
      }
      if (getOfflineExpenses().find(e => e.id === ex.id)) {
        removeOfflineExpense(ex.id);
        setOfflineExpenses(getOfflineExpenses());
        showToast('অফলাইন খরচ অনলাইনে সিঙ্ক ও সেভ হয়েছে!');
      } else {
        showToast('খরচ সেভ হয়েছে');
      }
    } catch (e) {
      showToast('সেভ করা সম্ভব হয়নি');
      console.error("Error saving expense:", e);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    // For now, only allow deletion if has online access (or if it's purely an offline item and user is offline)
    if (!user || !canAccessOnlineFeatures) {
      const offlineEx = getOfflineExpenses().find(e => e.id === id);
      if (offlineEx) {
        if (window.confirm('আপনি কি নিশ্চিত যে এই অফলাইন খরচটি মুছে ফেলতে চান?')) {
          removeOfflineExpense(id);
          setOfflineExpenses(getOfflineExpenses());
          setExpenses(getOfflineExpenses()); // Update displayed list
          showToast('অফলাইন খরচ মুছে ফেলা হয়েছে।');
        }
      } else {
        showToast('অনলাইন অ্যাক্সেস না থাকলে মুছে ফেলা যাবে না।');
      }
      return;
    }

    if (window.confirm('আপনি কি নিশ্চিত যে এই খরচটি মুছে ফেলতে চান?')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'expenses', id));
        removeOfflineExpense(id); // Also remove from offline in case it was pending sync or for cleaner state
        setOfflineExpenses(getOfflineExpenses()); // Refresh offline state
        showToast('খরচ মুছে ফেলা হয়েছে');
      } catch (e) {
        showToast('মুছে ফেলা সম্ভব হয়নি');
        console.error("Error deleting expense:", e);
      }
    }
  };

  const handleSaveWorker = async (w: Worker) => {
    // If not logged in or no online access, save to offline storage.
    if (!user || !canAccessOnlineFeatures) {
      saveOfflineWorker(w); // Save to local storage
      setOfflineWorkers(getOfflineWorkers()); // Update state
      setWorkers(getOfflineWorkers()); // Update displayed workers
      showToast('কারিগর অফলাইনে সেভ হয়েছে। অনলাইনে এলে সিঙ্ক হবে।');
      return;
    }
    // If online and has access, save to Firebase.
    try {
      const workerRef = doc(db, 'users', user.uid, 'workers', w.id);
      const docSnap = await getDoc(workerRef);
      if (docSnap.exists()) {
        await updateDoc(workerRef, w);
      } else {
        await setDoc(workerRef, w);
      }
      if (getOfflineWorkers().find(worker => worker.id === w.id)) {
        removeOfflineWorker(w.id);
        setOfflineWorkers(getOfflineWorkers());
        showToast('অফলাইন কারিগর অনলাইনে সিঙ্ক ও সেভ হয়েছে!');
      } else {
        showToast('কারিগর যোগ হয়েছে');
      }
    } catch (e) {
      showToast('সেভ করা সম্ভব হয়নি');
      console.error("Error saving worker:", e);
    }
  };

  const handleSaveLog = async (l: WorkerLog) => {
    // If not logged in or no online access, save to offline storage.
    if (!user || !canAccessOnlineFeatures) {
      saveOfflineWorkerLog(l); // Save to local storage
      setOfflineWorkerLogs(getOfflineWorkerLogs()); // Update state
      setWorkerLogs(getOfflineWorkerLogs()); // Update displayed worker logs
      showToast('হিসাব অফলাইনে সেভ হয়েছে। অনলাইনে এলে সিঙ্ক হবে।');
      return;
    }
    // If online and has access, save to Firebase.
    try {
      const logRef = doc(db, 'users', user.uid, 'workerLogs', l.id);
      const docSnap = await getDoc(logRef);
      if (docSnap.exists()) {
        await updateDoc(logRef, l);
      } else {
        await setDoc(logRef, l);
      }
      if (getOfflineWorkerLogs().find(log => log.id === l.id)) {
        removeOfflineWorkerLog(l.id);
        setOfflineWorkerLogs(getOfflineWorkerLogs());
        showToast('অফলাইন হিসাব অনলাইনে সিঙ্ক ও সেভ হয়েছে!');
      } else {
        showToast('হিসাব আপডেট হয়েছে');
      }
    } catch (e) {
      showToast('সেভ করা সম্ভব হয়নি');
      console.error("Error saving worker log:", e);
    }
  };

  const handleSaveFabricSale = async (fs: FabricSale, onComplete: (success: boolean, errorMessage?: string) => void) => {
    // If not logged in or no online access, save to offline storage.
    if (!user || !canAccessOnlineFeatures) { 
      // Add the isOffline flag before saving to local storage
      const offlineFabricSale: FabricSale = { ...fs, isOffline: true };
      saveOfflineFabricSale(offlineFabricSale); // Save to local storage
      setOfflineFabricSales(getOfflineFabricSales()); // Update state
      setFabricSales(getOfflineFabricSales()); // Update displayed fabric sales
      onComplete(true, 'কাপড় বিক্রি অফলাইনে সেভ হয়েছে। অনলাইনে এলে সিঙ্ক হবে।');
      return;
    }
    // If online and has access, save to Firebase.
    try {
      const saleRef = doc(db, 'users', user.uid, 'fabricSales', fs.id);
      const docSnap = await getDoc(saleRef);
      
      // Remove the isOffline flag before saving to Firebase, as it's an offline-only indicator
      const fabricSaleToSave = { ...fs };
      delete fabricSaleToSave.isOffline;

      if (docSnap.exists()) {
        await updateDoc(saleRef, fabricSaleToSave);
      } else {
        await setDoc(saleRef, fabricSaleToSave);
      }
      if (getOfflineFabricSales().find(sale => sale.id === fs.id)) {
        removeOfflineFabricSale(fs.id);
        setOfflineFabricSales(getOfflineFabricSales());
        onComplete(true, 'অফলাইন কাপড় বিক্রি অনলাইনে সিঙ্ক ও সেভ হয়েছে!');
      } else {
        onComplete(true, 'কাপড় বিক্রি সেভ হয়েছে!');
      }
    } catch (e) {
      console.error("Error saving fabric sale:", e);
      onComplete(false, 'সেভ করা সম্ভব হয়নি');
    }
  };

  const handleSaveConfig = async (newConfig: AppConfig, updatedUserName?: string) => { // Modified signature
    setConfig(newConfig);
    localStorage.setItem('asraful_tailor_config', JSON.stringify(newConfig));
    // The App.tsx `showToast` is now for general config updates, not individual profile name updates.
    // showToast('সেটিংস আপডেট হয়েছে'); // Removed this generic toast

    // Update current user's display name if provided and changed
    if (user && updatedUserName !== undefined && userProfile?.name !== updatedUserName) {
      try {
        await updateProfile(user, { displayName: updatedUserName });
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { name: updatedUserName });
        setUserProfile(prevProfile => prevProfile ? { ...prevProfile, name: updatedUserName } : null);
        showToast('প্রোফাইল নাম আপডেট হয়েছে!'); // Specific toast for profile name
      } catch (error) {
        console.error("Error updating user profile name:", error);
        showToast('প্রোফাইল নাম আপডেট করা যায়নি।');
      }
    } else {
      // Only show this toast if general config (not just name) was actually updated
      // And if the user has access to edit these settings (handled in SettingsView)
      showToast('সেটিংস আপডেট হয়েছে!');
    }
    setView('home'); // Go back to home or settings after saving
  };

  // Function to handle login requests from other views, setting the initial auth type and origin
  const handleAuthInitiate = useCallback((type: 'signup' | 'login', origin: 'home' | 'settings') => { // Renamed prop
    setInitialAuthType(type);
    setAuthOrigin(origin);
    setView('auth');
  }, []);

  // Function called after successful authentication
  const handleAuthSuccess = useCallback(async (isAdminUser: boolean, newUserId: string, referrerMobileUsed?: string, paymentDetails?: { transactionId: string, paymentMethod: 'bKash' | 'Rocket', paymentAmount: number }) => {
    // If auth was initiated from settings, go back to settings. Otherwise, go to home.
    if (authOrigin === 'settings') {
      setView('settings');
    } else {
      setView('home');
    }
    setIsOfflineMode(false); // Ensure online mode is activated on successful login

    // If a new user signed up with payment, their profile will be unapproved
    // This function will be called AFTER the userProfile is created/updated in Firestore by AuthView
    // The actual referral payment to the referrer happens when the ADMIN approves the user.
  }, [authOrigin]);

  // New function to process referrer lookup and set referredBy field
  const processReferrerLookup = useCallback(async (newUserId: string, referrerMobile: string) => {
    try {
      // 1. Find the referrer by mobile number
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('phone', '==', referrerMobile)); // Query by phone number
      
      let referrerUid: string | null = null;
      const querySnapshot = await getDocs(q); 
      if (!querySnapshot.empty) {
        referrerUid = querySnapshot.docs[0].id;
      }

      const newUserRef = doc(db, 'users', newUserId);
      if (referrerUid && referrerUid !== newUserId) { // Ensure not self-referral
        await updateDoc(newUserRef, { 
          referredBy: referrerUid, 
          referrerMobile: referrerMobile,
        });
        showToast(`রেফারকারীকে যুক্ত করা হয়েছে।`);
      } else {
        // If referrer mobile is invalid or self-referral, clear pending lookup
        await updateDoc(newUserRef, { referredBy: null, referrerMobile: null });
        showToast('ভুল রেফারেল মোবাইল।');
      }
    } catch (error) {
      console.error("Error processing referrer lookup:", error);
      showToast('রেফারেল প্রক্রিয়াকরণে সমস্যা হয়েছে।');
    }
  }, [showToast, user]);


  const handleCollectDuePayment = async (orderId: string, collectedAmount: number) => {
    // Only allow if has online access OR if it's an offline order being modified in offline mode
    if (!canAccessOnlineFeatures && (!isOfflineMode || !orders.find(o => o.id === orderId)?.isOffline)) {
      showToast('অনলাইন অ্যাক্সেস না থাকলে এই কাজটি করা যাবে না।');
      return;
    }

    // Find the order in the current state (which could be online or offline data)
    const orderToUpdate = orders.find(o => o.id === orderId);

    if (!orderToUpdate) {
        showToast('অর্ডার খুঁজে পাওয়া যায়নি।');
        return;
    }

    let newAdvance = orderToUpdate.payment.advance + collectedAmount;
    let newDue = orderToUpdate.payment.due - collectedAmount;

    // Ensure due doesn't go below zero
    if (newDue < 0) {
      newDue = 0;
    }

    const updatedOrder: Order = {
      ...orderToUpdate,
      payment: {
        ...orderToUpdate.payment,
        advance: newAdvance,
        due: newDue,
      },
      // Optionally update status to DELIVERED if due becomes 0
      status: newDue === 0 ? OrderStatus.DELIVERED : orderToUpdate.status,
    };

    if (!user || !canAccessOnlineFeatures) { // If offline or no online access
      saveOfflineOrder({ ...updatedOrder, isOffline: true }); // Save to local storage, mark as offline
      setOfflineOrders(getOfflineOrders()); // Update offline orders state
      setOrders(getOfflineOrders()); // Update displayed orders
      showToast('বাকি বিল অফলাইনে আদায় হয়েছে। অনলাইনে এলে সিঙ্ক হবে।');
      return;
    }

    // If online and has access, proceed with Firebase update
    try {
      const orderRef = doc(db, 'users', user.uid, 'orders', orderId);
      await updateDoc(orderRef, {
        'payment.advance': updatedOrder.payment.advance,
        // FIX: Corrected typo 'updatedUpdatedOrder' to 'updatedOrder'
        'payment.due': updatedOrder.payment.due, 
        status: updatedOrder.status,
      });
      // The Firestore listener will update the `orders` state.
      // If this was an offline order that just got synced:
      if (getOfflineOrders().find(o => o.id === orderId)) {
        // Corrected variable name: `o` is not defined here, use `orderId`
        removeOfflineOrder(orderId);
        setOfflineOrders(getOfflineOrders());
        showToast('অফলাইন বাকি বিল অনলাইনে সিঙ্ক ও আদায় হয়েছে!');
      } else {
        showToast('বাকি বিল সফলভাবে আদায় করা হয়েছে!');
      }
    } catch (e) {
      console.error("Error collecting due payment:", e);
      throw e; // Re-throw to be caught by OrderListView
    }
  };

  // NEW: Function to handle printing an order
  const handlePrintOrder = useCallback((order: Order) => {
    setOrderToPrint(order);
    setView('memo-print');
  }, []);

  if (authLoading) return <div className="min-h-screen bg-[#009688] flex items-center justify-center text-white font-black">অপেক্ষা করুন...</div>;

  // NEW: Include 'memo-print' in hide logic
  const hideBottomNav = view === 'new-order' || view === 'edit-order' || view === 'expenses' || view === 'settings' || view === 'auth' || view === 'sync' || view === 'fabric-sales' || view === 'rewards' || view === 'guide' || view === 'memo-print'; 
  const hideMainHeader = view === 'new-order' || view === 'edit-order' || view === 'auth' || view === 'sync' || view === 'fabric-sales' || view === 'rewards' || view === 'guide' || view === 'memo-print'; // Hide header for auth, sync, and print view too

  const handleBack = () => {
    if (view === 'auth') {
      // If coming from settings, always go back to settings
      setView('settings');
    }
    else if (view === 'edit-order') setView('orders');
    else if (view === 'sync') setView('home'); 
    else if (view === 'fabric-sales') setView('reports');
    else if (view === 'rewards') setView('reports');
    else if (view === 'guide') setView('home');
    else if (view === 'memo-print') { // NEW: Handle back from memo-print
      // Depending on where print was initiated (new-order or edit-order), go back accordingly
      if (orderToEdit) { // If it was an edit, go back to order list
        setView('orders');
        setOrderToEdit(null); // Clear orderToEdit
      } else { // If it was a new order, go back to home
        setView('home');
      }
      setOrderToPrint(null); // Clear orderToPrint
    }
    else setView('home');
  };

  const hasPendingOfflineData = offlineOrders.length > 0 || offlineExpenses.length > 0 || offlineWorkers.length > 0 || offlineWorkerLogs.length > 0 || offlineFabricSales.length > 0;

  return (
    <div className="max-w-md mx-auto min-h-screen relative bg-gray-50 font-['Hind_Siliguri']">
        <React.Fragment> {/* Replaced <> with <React.Fragment> */}
          {!hideMainHeader && (
            <header className="px-5 py-5 text-white shadow-xl bg-app-green sticky top-0 z-50 rounded-b-[2.5rem]" style={{ backgroundColor: config.primaryColor }}>
              <div className="flex justify-between items-center">
                <div onClick={() => setView('home')} className="flex flex-col cursor-pointer group">
                  <h1 className="text-3xl font-black tracking-tighter transition-all group-active:scale-95 leading-none" style={{ color: 'white' }}>{config.appName}</h1>
                  <p className="text-[11px] font-bold opacity-80 mt-1.5 leading-none" style={{ color: 'white' }}>{config.tagline}</p>
                </div>
                <div className="flex items-center gap-2">
                  <PrayerTimer prayerTimes={config.prayerTimes} />
                  <button onClick={() => setView('settings')} className="bg-white/20 p-2.5 rounded-2xl active:scale-95 transition-all border border-white/10">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    </svg>
                  </button>
                </div>
              </div>
              <PrayerTicker />
            </header>
          )}

          <main className={hideBottomNav ? "pb-0 p-0" : "pb-32"}>
            {view === 'home' && <HomeView 
              onNavigate={(targetView: ViewState) => { setView(targetView); }} 
              orders={orders}
              expenses={expenses} 
              fabricSales={fabricSales}
              appConfig={config} user={user} userProfile={userProfile} 
              offlineOrders={offlineOrders}
              hasPendingOfflineData={hasPendingOfflineData}
              onSyncAllOfflineData={() => setView('sync')}
              isOfflineMode={isOfflineMode}
              canAccessOnlineFeatures={canAccessOnlineFeatures} // Pass new prop
              trialMessage={trialMessage} // Pass new prop
              pendingApprovalUsersCount={pendingApprovalUsersCount} // Pass new prop
            />}
            {/* NEW: Pass handlePrintOrder to NewOrderView */}
            {view === 'new-order' && <NewOrderView orders={orders} onSave={handleSaveOrder} onCancel={() => setView('home')} appConfig={config} showToast={showToast} canAccessOnlineFeatures={canAccessOnlineFeatures} onPrint={handlePrintOrder} />}
            {view === 'orders' && <OrderListView orders={orders} onUpdateStatus={handleUpdateOrderStatus} onEditOrder={(id) => { const o = orders.find(ord => ord.id === id); if(o) {setOrderToEdit(o); setView('edit-order'); } }} appConfig={config} showToast={showToast} onCollectDuePayment={handleCollectDuePayment} isOfflineMode={isOfflineMode} canAccessOnlineFeatures={canAccessOnlineFeatures} />}
            {view === 'reports' && <ReportView orders={orders} expenses={expenses} fabricSales={fabricSales} appConfig={config} onNavigate={setView} />}
            {view === 'expenses' && <ExpenseView expenses={expenses} onSave={handleSaveExpense} onDelete={handleDeleteExpense} />} {/* Removed canAccessOnlineFeatures here as per problem statement, only for editing/deleting */}
            {view === 'workers' && <WorkerView workers={workers} logs={workerLogs} onSaveWorker={handleSaveWorker} onSaveLog={handleSaveLog} />} {/* Removed canAccessOnlineFeatures here as per problem statement, only for editing/deleting */}
            {/* NEW: Pass handlePrintOrder to EditOrderView */}
            {view === 'edit-order' && orderToEdit && <EditOrderView orderToEdit={orderToEdit} onUpdate={handleSaveOrder} onCancel={() => setView('orders')} appConfig={config} showToast={showToast} canAccessOnlineFeatures={canAccessOnlineFeatures} onPrint={handlePrintOrder} />}
            {view === 'settings' && <SettingsView currentConfig={config} onSaveConfig={handleSaveConfig} onBack={() => setView('home')} onAuthInitiate={(type, origin) => handleAuthInitiate(type, origin)} isCurrentUserAdmin={isCurrentUserAdmin} isUserApproved={userProfile?.approved === true} showToast={showToast} userProfile={userProfile} canAccessOnlineFeatures={canAccessOnlineFeatures} user={user} />}
            {view === 'auth' && <AuthView userProfile={userProfile} setUserProfile={setUserProfile} showToast={showToast} initialAuthType={initialAuthType} onAuthSuccess={handleAuthSuccess} initialReferrerMobile={initialReferrerMobile} appConfig={config} />}
            {view === 'sync' && <SyncView offlineOrders={offlineOrders} offlineExpenses={offlineExpenses} offlineWorkers={offlineWorkers} offlineWorkerLogs={offlineWorkerLogs} offlineFabricSales={offlineFabricSales} onSync={syncAllOfflineDataToFirebase} onBack={handleBack} isOnline={!!user && canAccessOnlineFeatures} canAccessOnlineFeatures={canAccessOnlineFeatures} />}
            {view === 'fabric-sales' && <FabricSaleView onSave={handleSaveFabricSale} onCancel={() => setView('reports')} appConfig={config} showToast={showToast} canAccessOnlineFeatures={canAccessOnlineFeatures} />}
            {view === 'rewards' && <RewardsView orders={orders} onBack={() => setView('reports')} isOfflineMode={isOfflineMode} />}
            {view === 'guide' && <GuideView />}
            {view === 'memo-print' && orderToPrint && <MemoPrintView order={orderToPrint} appConfig={config} onBack={handleBack} />} {/* NEW: MemoPrintView */}
          </main>

          {!hideBottomNav ? (
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-100 h-22 flex justify-around items-center px-4 z-50 max-w-md mx-auto rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
              <NavBtn label="হোম" active={view === 'home'} onClick={() => setView('home')} icon="home" />
              <NavBtn label="কারিগর" active={view === 'workers'} onClick={() => setView('workers')} icon="worker" />
              <button onClick={() => setView('new-order')} className="text-white w-16 h-16 rounded-[2rem] shadow-[0_8px_20px_rgba(0,150,136,0.3)] -translate-y-6 border-4 border-white flex items-center justify-center bg-gradient-to-br from-app-green to-emerald-700 active:scale-90 transition-all z-10" style={{ backgroundColor: config.primaryColor }}>
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="4" strokeLinecap="round" /></svg>
              </button>
              <NavBtn label="অর্ডার লিস্ট" active={view === 'orders'} onClick={() => setView('orders')} icon="list" />
              <NavBtn label="হিসাব" active={view === 'reports'} onClick={() => setView('reports')} icon="report" />
            </nav>
          ) : (
            (view !== 'new-order' && view !== 'edit-order' && view !== 'memo-print') && ( // NEW: hide back button for memo-print too, as it has its own
              <div className="fixed bottom-8 right-6 z-[100] animate-in slide-in-from-bottom-4 duration-500">
                <button 
                  onClick={handleBack} 
                  className="bg-app-green text-white w-16 h-16 rounded-3xl shadow-2xl flex flex-col items-center justify-center border-4 border-white active:scale-90 transition-all hover:brightness-110" style={{ backgroundColor: config.primaryColor }}
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span className="text-[10px] font-black uppercase leading-none mt-1">ফিরে যান</span>
                </button>
              </div>
            )
          )}
          
          {toast && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full z-[100] text-sm font-bold shadow-2xl animate-in slide-in-from-bottom-2">{toast}</div>}
        </React.Fragment> {/* Replaced </> with </React.Fragment> */}
    </div>
  );
};

const NavBtn = ({ label, active, onClick, icon }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 flex-1 transition-all active:scale-90 relative ${active ? 'text-app-green' : 'text-gray-400'}`}>
    {active && <div className="absolute -top-3 w-1.5 h-1.5 bg-app-green rounded-full shadow-[0_0_8px_rgba(0,150,136,0.6)]"></div>}
    <div className={`w-7 h-7 transition-transform duration-300 ${active ? 'scale-110' : ''}`}>
      {icon === 'home' && <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m0 0v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      {icon === 'worker' && <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      {icon === 'list' && <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      {icon === 'report' && <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 022 2h2a2 2 0 002-2z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </div>
    <span className={`text-[11px] font-black uppercase transition-all ${active ? 'tracking-wider' : 'tracking-normal'}`}>{label}</span>
  </button>);

export default App;
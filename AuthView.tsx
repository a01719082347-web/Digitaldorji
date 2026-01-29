
import React, { useState, useEffect, useCallback } from 'react';
import { auth, db } from './firebase';
import { 
  updateProfile,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User, // Only User related import from here
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'; // Firestore related imports from here
import { UserProfile, AppConfig } from '../types'; // Import AppConfig

interface AuthViewProps {
  // REMOVED: onBack: () => void;
  userProfile: UserProfile | null;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  showToast: (message: string) => void;
  initialAuthType?: 'signup' | 'login'; // New prop
  onAuthSuccess: (isAdminUser: boolean, newUserId: string, referrerMobileUsed?: string, paymentDetails?: { transactionId: string, paymentMethod: 'bKash' | 'Rocket', paymentAmount: number }) => void; // Updated prop for post-auth navigation
  initialReferrerMobile?: string; // Prop for referrer mobile from URL
  appConfig: AppConfig; // New prop
}

// Updated ADMIN_EMAIL to an array of specific admin emails
const ADMIN_EMAILS = ["a01719082347@gmail.com", "namemdasraful@gmail.com", "as2013bd@gmail.com", "mdasrafulislamrony@gmail.com"];
const TRIAL_DAYS = 3; // Define trial days

export const AuthView: React.FC<AuthViewProps> = ({ userProfile, setUserProfile, showToast, initialAuthType, onAuthSuccess, initialReferrerMobile, appConfig }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(auth.currentUser);

  const [name, setName] = useState(firebaseUser?.displayName || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referrerMobileInput, setReferrerMobileInput] = useState(initialReferrerMobile || ''); // State for referrer mobile input
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Rocket' | ''>(''); // State for payment method
  const [transactionId, setTransactionId] = useState(''); // State for transaction ID
  
  // Initialize isSignUp based on initialAuthType, default to true if not specified
  const [isSignUp, setIsSignUp] = useState(initialAuthType === 'signup' || initialAuthType === undefined);

  // Admin's payment numbers for display
  const adminPaymentNumbers = appConfig.adminPaymentNumbers || { bKash: "01719082347", Rocket: "01719082347" };


  // Set referrer mobile from URL if provided
  useEffect(() => {
    if (initialReferrerMobile) {
      setReferrerMobileInput(initialReferrerMobile);
    }
  }, [initialReferrerMobile]);

  // Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currUser) => {
      setFirebaseUser(currUser);
      if (currUser && !userProfile) { // If user logs in but profile not yet loaded/created
        setName(currUser.displayName || '');
        // App.tsx's onAuthStateChanged should handle initial profile fetching/creation
        // We'll rely on it to update userProfile state here
      }
    });
    return () => unsubscribe();
  }, [userProfile]); // Depend on userProfile so it re-runs when profile is updated by App.tsx

  useEffect(() => {
    setError('');
    // Clear referral related input when switching between login/signup
    setReferrerMobileInput('');
    setPaymentMethod('');
    setTransactionId('');
  }, [isSignUp]); 

  // New: Wrapped syncUserToFirestore with useCallback
  const syncUserToFirestore = useCallback(async (user: User, userName: string, userEmail?: string, referrerMobileUsed?: string, paymentDetails?: { transactionId: string, paymentMethod: 'bKash' | 'Rocket', paymentAmount: number }): Promise<UserProfile | null> => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const isAdmin = user.email ? ADMIN_EMAILS.includes(user.email) : false;

      // Helper to convert empty string to null, or keep value, or undefined if param not passed
      const getValidatedValue = (inputParam: string | undefined, existingValue: string | undefined) => {
        if (inputParam !== undefined) {
          return inputParam.trim() === '' ? null : inputParam;
        }
        return existingValue === undefined ? null : existingValue; // Ensure existing undefined is also handled
      };

      if (userSnap.exists()) {
        const existingProfile = userSnap.data() as UserProfile;
        
        const updatedFields: Record<string, any> = {
          name: userName,
          role: isAdmin ? 'admin' : existingProfile.role,
          approved: isAdmin ? true : existingProfile.approved, // Admin is auto-approved, others need manual approval
        };
        
        // If user is not admin, ensure trial state is maintained or updated based on paid status
        if (existingProfile.role === 'user' && !isAdmin) {
          const now = new Date();
          let currentTrialEndsDate = existingProfile.trialEndsDate;
          let currentIsTrialActive = existingProfile.isTrialActive;

          // If user has paid and is approved, ensure trial is off
          if (paymentDetails || (existingProfile.hasPaid && existingProfile.approved)) {
            currentIsTrialActive = false;
            currentTrialEndsDate = undefined;
            updatedFields.hasPaid = true;
            updatedFields.approved = true; // Approval happens after payment verification
          } else {
             // For non-paid users, maintain trial
            if (!currentTrialEndsDate || isNaN(new Date(currentTrialEndsDate).getTime())) {
              currentTrialEndsDate = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
              currentIsTrialActive = true;
            } else {
              const trialEndDate = new Date(currentTrialEndsDate);
              currentIsTrialActive = trialEndDate > now;
            }
            updatedFields.hasPaid = existingProfile.hasPaid || false; // Still pending payment
            updatedFields.approved = false; // Still pending approval
          }
          updatedFields.trialEndsDate = currentTrialEndsDate;
          updatedFields.isTrialActive = currentIsTrialActive;

        } else if (isAdmin) { // If becoming admin, clear trial fields, set as paid
          updatedFields.isTrialActive = false;
          updatedFields.trialEndsDate = null;
          updatedFields.hasPaid = true;
        }

        // Generate referralCode if missing for existing users
        if (!existingProfile.referralCode) {
          updatedFields.referralCode = user.uid.slice(0, 8).toUpperCase();
        }
        if (!existingProfile.referralEarnings) {
          updatedFields.referralEarnings = 0; // Initialize referrer earnings
        }

        updatedFields.phone = existingProfile.phone || null; // Phone is no longer part of auth flow
        if (userEmail !== undefined || existingProfile.email === undefined) {
          updatedFields.email = getValidatedValue(userEmail, existingProfile.email);
        }
        
        // Set referredBy and referrerMobile if provided during signup, otherwise keep existing
        if (referrerMobileUsed) {
          // Temporarily set referredBy to 'pending_lookup'. App.tsx will look up UID by mobile and update.
          updatedFields.referredBy = 'pending_lookup'; 
          updatedFields.referrerMobile = referrerMobileUsed;
        } else {
          updatedFields.referredBy = existingProfile.referredBy || null;
          updatedFields.referrerMobile = existingProfile.referrerMobile || null;
        }

        // Add/update payment details if provided
        if (paymentDetails) {
          updatedFields.hasPaid = true;
          updatedFields.paymentMethod = paymentDetails.paymentMethod;
          updatedFields.transactionId = paymentDetails.transactionId;
          updatedFields.paymentAmount = paymentDetails.paymentAmount;
          updatedFields.paymentDate = new Date().toISOString();
        } else if (existingProfile.hasPaid !== undefined) {
          updatedFields.hasPaid = existingProfile.hasPaid;
          updatedFields.paymentMethod = existingProfile.paymentMethod;
          updatedFields.transactionId = existingProfile.transactionId;
          updatedFields.paymentAmount = existingProfile.paymentAmount;
          updatedFields.paymentDate = existingProfile.paymentDate;
        }

        await updateDoc(userRef, updatedFields);
        
        const finalProfileForState: UserProfile = {
          ...existingProfile,
          ...updatedFields,
          phone: updatedFields.phone === null ? undefined : updatedFields.phone,
          email: updatedFields.email === null ? undefined : updatedFields.email,
          trialEndsDate: updatedFields.trialEndsDate === null ? undefined : updatedFields.trialEndsDate,
          referredBy: updatedFields.referredBy === null ? undefined : updatedFields.referredBy,
          referrerMobile: updatedFields.referrerMobile === null ? undefined : updatedFields.referrerMobile,
          paymentMethod: updatedFields.paymentMethod === null ? undefined : updatedFields.paymentMethod,
          transactionId: updatedFields.transactionId === null ? undefined : updatedFields.transactionId,
          paymentAmount: updatedFields.paymentAmount === null ? undefined : updatedFields.paymentAmount,
          paymentDate: updatedFields.paymentDate === null ? undefined : updatedFields.paymentDate,
        };
        setUserProfile(finalProfileForState);
        return finalProfileForState;

      } else {
        // New user profile creation
        const isAdmin = user.email ? ADMIN_EMAILS.includes(user.email) : false;
        const now = new Date();
        const newProfileData: Record<string, any> = {
          uid: user.uid,
          name: userName,
          createdAt: now.toISOString(),
          approved: isAdmin, // Admins are auto-approved, others need manual approval
          role: isAdmin ? 'admin' : 'user',
          referralCode: user.uid.slice(0, 8).toUpperCase(), // Generate referral code for new users
          referralEarnings: 0, // Initialize referrer earnings
        };

        if (!isAdmin) {
          newProfileData.isTrialActive = true; // Trial active initially for non-paid users
          newProfileData.trialEndsDate = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
          newProfileData.hasPaid = false; // Must pay to be approved
        } else {
          newProfileData.isTrialActive = false;
          newProfileData.trialEndsDate = undefined;
          newProfileData.hasPaid = true; // Admins are considered paid
        }
        
        newProfileData.phone = null;
        newProfileData.email = getValidatedValue(userEmail, undefined);
        
        // Set referredBy and referrerMobile if provided during signup
        if (referrerMobileUsed) {
          newProfileData.referredBy = 'pending_lookup'; // Mark for lookup by mobile
          newProfileData.referrerMobile = referrerMobileUsed;
        } else {
          newProfileData.referredBy = null;
          newProfileData.referrerMobile = null;
        }

        // Add payment details for new user
        if (paymentDetails) {
          newProfileData.hasPaid = true; // User has submitted payment details
          newProfileData.paymentMethod = paymentDetails.paymentMethod;
          newProfileData.transactionId = paymentDetails.transactionId;
          newProfileData.paymentAmount = paymentDetails.paymentAmount;
          newProfileData.paymentDate = now.toISOString();
        } else if (!isAdmin) { // If not admin and no payment details, set defaults for pending payment
          newProfileData.hasPaid = false;
          newProfileData.paymentMethod = null;
          newProfileData.transactionId = null;
          newProfileData.paymentAmount = null;
          newProfileData.paymentDate = null;
        }


        await setDoc(userRef, newProfileData);
        
        const finalNewProfileForState: UserProfile = {
          ...newProfileData as UserProfile,
          phone: newProfileData.phone === null ? undefined : newProfileData.phone,
          email: newProfileData.email === null ? undefined : newProfileData.email,
          trialEndsDate: newProfileData.trialEndsDate === null ? undefined : newProfileData.trialEndsDate,
          referredBy: newProfileData.referredBy === null ? undefined : newProfileData.referredBy,
          referrerMobile: newProfileData.referrerMobile === null ? undefined : newProfileData.referrerMobile,
          paymentMethod: newProfileData.paymentMethod === null ? undefined : newProfileData.paymentMethod,
          transactionId: newProfileData.transactionId === null ? undefined : newProfileData.transactionId,
          paymentAmount: newProfileData.paymentAmount === null ? undefined : newProfileData.paymentAmount,
          paymentDate: newProfileData.paymentDate === null ? undefined : newProfileData.paymentDate,
        };
        setUserProfile(finalNewProfileForState);
        return finalNewProfileForState;
      }
    } catch (e) { 
      console.error("Error syncing user to Firestore:", e); 
      setError('ইউজার প্রোফাইল সেভ করা যায়নি।');
      return null;
    }
  }, [setUserProfile, showToast, ADMIN_EMAILS, appConfig.onetimeSignupFee]); // Added onetimeSignupFee as dependency


  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp && !name.trim()) return setError('আপনার নাম লিখুন।');
    if (!email.includes('@')) return setError('সঠিক ইমেইল এড্রেস দিন।');
    if (password.length < 6) return setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');

    // For signup, require payment details
    if (isSignUp && userProfile?.role !== 'admin' && !ADMIN_EMAILS.includes(email)) { // Only require for non-admin signups
      if (!paymentMethod || !transactionId) {
        return setError('পেমেন্ট মাধ্যম এবং ট্রানজেকশন আইডি দিন।');
      }
    }
    
    setLoading(true);
    setError('');

    let validReferrerMobile: string | undefined = undefined;
    if (referrerMobileInput.trim()) {
      // Basic validation for referrer mobile (could add more robust regex)
      if (referrerMobileInput.trim().length < 10) {
        setError('রেফারেল মোবাইল নাম্বারটি সঠিক নয়।');
        setLoading(false);
        return;
      }
      validReferrerMobile = referrerMobileInput.trim();
    }

    try {
      // Prepare payment details for signup
      const paymentDetailsForSignup = (isSignUp && userProfile?.role !== 'admin' && !ADMIN_EMAILS.includes(email) && paymentMethod && transactionId) ? {
        transactionId: transactionId.trim(),
        paymentMethod: paymentMethod as 'bKash' | 'Rocket',
        paymentAmount: appConfig.onetimeSignupFee || 0, // Use configurable fee
      } : undefined;

      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name.trim() });
        const profile = await syncUserToFirestore(userCredential.user, name.trim(), email, validReferrerMobile, paymentDetailsForSignup);
        showToast('অ্যাকাউন্ট তৈরি ও পেমেন্টের তথ্য জমা দেওয়া সফল হয়েছে!');
        const isAdmin = profile?.email ? ADMIN_EMAILS.includes(profile.email) : false;
        onAuthSuccess(isAdmin, userCredential.user.uid, validReferrerMobile, paymentDetailsForSignup); // Pass new user ID, referrer mobile, and payment details
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const profile = await syncUserToFirestore(userCredential.user, userCredential.user.displayName || '', email, validReferrerMobile);
        showToast('লগইন সফল হয়েছে!');
        const isAdmin = profile?.email ? ADMIN_EMAILS.includes(profile.email) : false;
        onAuthSuccess(isAdmin, userCredential.user.uid, validReferrerMobile); // Pass new user ID and referrer mobile
      }
    } catch (err: any) {
      console.error("Firebase Auth Error (email auth):", err);
      if (err.code === 'auth/email-already-in-use') setError('এই ইমেইলটি আগেই ব্যবহার করা হয়েছে।');
      else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-login-credentials') setError('ইমেইল বা পাসওয়ার্ড ভুল।'); // Added invalid-login-credentials
      else if (err.code === 'auth/user-not-found') setError('এই ইমেইলে কোনো অ্যাকাউন্ট নেই।');
      else setError('লগইন করা যায়নি। তথ্য পুনরায় চেক করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('আপনি কি নিশ্চিত যে লগআউট করতে চান?')) {
      await signOut(auth);
      setUserProfile(null); // Clear user profile on logout
      // App.tsx's onAuthStateChanged listener will handle the global user state.
      setError('');
      showToast('সফলভাবে লগআউট করা হয়েছে।');
      // REMOVED: onBack(); // Go back to settings/home
      onAuthSuccess(false, ''); // Navigate as if a non-admin user logged out
    }
  };

  // Display message if user is logged in but not approved for online features
  const showPendingApprovalMessage = firebaseUser && userProfile && !userProfile.approved;

  const currentSignupFee = appConfig.onetimeSignupFee || 3000;


  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col items-center font-['Hind_Siliguri']">
      {/* Recaptcha container is no longer needed but kept empty div for potential future use or to avoid layout shifts */}
      <div id="recaptcha-container"></div> 

      <div className="w-full max-w-md bg-white min-h-screen flex flex-col shadow-xl">
        {/* Header Section */}
        <div className="bg-app-green p-10 text-white rounded-b-[3rem] shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
          
          <button 
            onClick={() => onAuthSuccess(false, '')} // Simplified back button logic
            className="mb-6 w-10 h-10 flex items-center justify-center bg-white/20 rounded-xl active:scale-90 transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
          </button>

          <h1 className="text-3xl font-black mb-1">
            অ্যাকাউন্ট ভেরিফিকেশন
          </h1>
          <p className="text-white/80 font-bold text-sm uppercase tracking-widest">
            {firebaseUser ? 'আপনার প্রোফাইল তথ্য' : 'আপনার তথ্য ব্যাকআপ রাখুন'}
          </p>
        </div>

        {/* Content Section */}
        <div className="flex-1 p-8 -mt-6 bg-white rounded-t-[3rem]">
          
          {firebaseUser ? (
            /* Logged In State */
            <div className="space-y-8 animate-in fade-in zoom-in duration-500">
              <div className="bg-gray-50 p-8 rounded-[2.5rem] border-2 border-dashed border-gray-200 text-center">
                <div className="w-20 h-20 bg-app-green text-white rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-black shadow-lg">
                  {firebaseUser.displayName?.charAt(0) || 'U'}
                </div>
                <h3 className="text-2xl font-black text-gray-800">{firebaseUser.displayName}</h3>
                <p className="text-gray-500 font-bold">{firebaseUser.email || firebaseUser.phoneNumber}</p>
                {userProfile && (
                  <div className="mt-4 inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-tighter">
                    <span className={`w-2 h-2 rounded-full animate-pulse ${userProfile.approved ? 'bg-emerald-500' : 'bg-orange-500'}`}></span>
                    {userProfile.approved ? 'অ্যাকাউন্ট সক্রিয়' : (userProfile.hasPaid ? 'পেমেন্ট যাচাই হচ্ছে' : 'অনুমোদনের অপেক্ষায়')}
                  </div>
                )}
              </div>

              {showPendingApprovalMessage && (
                 <div className="bg-orange-50 text-orange-600 p-4 rounded-2xl mb-6 text-sm font-bold flex items-center gap-3 border border-orange-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <span>⚠️ আপনার অ্যাকাউন্ট এখনও এডমিন দ্বারা অনুমোদিত হয়নি। অনুমোদনের জন্য অপেক্ষা করুন বা অফলাইনে ব্যবহার করুন।</span>
                 </div>
              )}

              <div className="space-y-4">
                <button 
                  onClick={() => onAuthSuccess(false, '')}
                  className="w-full bg-app-green text-white py-5 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all"
                >
                  অ্যাপে ফিরে যান
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-full bg-red-50 text-red-600 py-5 rounded-2xl font-black text-lg border-2 border-red-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                  লগআউট করুন
                </button>
              </div>
            </div>
          ) : (
            /* Email Log In/Sign Up Form */
            <React.Fragment> {/* Replaced <> with <React.Fragment> */}
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 text-sm font-bold flex items-center gap-3 border border-red-100 animate-bounce">
                  <span>⚠️ {error}</span>
                </div>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-6">
                {isSignUp && ( // Only show referrer and payment inputs on signup
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-400 uppercase ml-1">আপনার নাম</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="নাম লিখুন" className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-lg font-black outline-none" />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-400 uppercase ml-1">ইমেইল এড্রেস</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@mail.com" className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-lg font-black outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-400 uppercase ml-1">পাসওয়ার্ড</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="******" className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-lg font-black outline-none" />
                </div>

                {isSignUp && ( // Another conditional for signup-specific fields
                  <div className="space-y-6 pt-4 border-t-2 border-gray-100">
                    <h4 className="text-xl font-black text-gray-800 text-center">রেজিস্ট্রেশন পেমেন্ট: ৳{currentSignupFee}</h4>
                    <p className="text-sm text-gray-600 text-center">
                      অনলাইন ফিচার্স ব্যবহার করতে আপনাকে এককালীন ৳{currentSignupFee} পেমেন্ট করতে হবে।
                      আপনার পেমেন্ট এডমিন দ্বারা যাচাই হওয়ার পর আপনার অ্যাকাউন্ট সক্রিয় হবে।
                    </p>
                    <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-100 text-center font-black text-sm">
                      টাকা পাঠান এই নম্বরে: {adminPaymentNumbers.bKash} (বিকাশ ও রকেট)
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-black text-gray-400 uppercase ml-1">রেফারকারীর মোবাইল (ঐচ্ছিক)</label>
                      <input 
                        type="tel" 
                        value={referrerMobileInput} 
                        onChange={(e) => setReferrerMobileInput(e.target.value)} 
                        placeholder="রেফারকারীর মোবাইল নাম্বার" 
                        className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-lg font-black outline-none" 
                        inputMode="tel"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-black text-gray-400 uppercase ml-1">পেমেন্ট মাধ্যম *</label>
                      <select 
                        value={paymentMethod} 
                        onChange={(e) => setPaymentMethod(e.target.value as 'bKash' | 'Rocket' | '')}
                        className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-lg font-black outline-none"
                      >
                        <option value="">নির্বাচন করুন</option>
                        <option value="bKash">বিকাশ</option>
                        <option value="Rocket">রকেট</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-black text-gray-400 uppercase ml-1">ট্রানজেকশন আইডি *</label>
                      <input 
                        type="text" 
                        value={transactionId} 
                        onChange={(e) => setTransactionId(e.target.value)} 
                        placeholder="আপনার ট্রানজেকশন আইডি" 
                        className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-lg font-black outline-none" 
                      />
                    </div>
                  </div>
                )}
                <button disabled={loading} className="w-full bg-app-green text-white py-6 rounded-3xl font-black text-xl shadow-xl active:scale-95 transition-all">
                  {loading ? 'প্রসেস হচ্ছে...' : (isSignUp ? 'পেমেন্ট ও সাইনআপ করুন' : 'লগইন করুন')}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsSignUp(!isSignUp)} 
                  className="w-full text-app-green font-black text-sm mt-4 text-center active:opacity-60 underline underline-offset-4"
                >
                  {isSignUp ? 'আগে থেকেই অ্যাকাউন্ট আছে? লগইন' : 'নতুন অ্যাকাউন্ট খুলতে চান? এখানে চাপুন'}
                </button>
              </form>
            </React.Fragment> {/* Replaced </> with </React.Fragment> */}
          )}
        </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect, useMemo, memo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  doc, updateDoc, deleteDoc, serverTimestamp, enableIndexedDbPersistence 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  Plus, Trash2, Check, Globe, ShoppingBasket, 
  Share2, LogOut, Loader2, History, Pencil, Save, X, Layers, List as ListIcon, 
  WifiOff, ChevronDown, AlertTriangle, Moon, Sun, Eye, EyeOff, Minus 
} from 'lucide-react';

// --- YOUR FIREBASE CONFIGURATION ---
// Note: For local development, it is best practice to use a .env file.
// For this preview to work reliably, we are using the direct values here.
const firebaseConfig = {
  apiKey: "AIzaSyC8O6g9bcLXeHCfIHLT6KiMYwVSCEPzN_E",
  authDomain: "grocery-app-702d5.firebaseapp.com",
  projectId: "grocery-app-702d5",
  storageBucket: "grocery-app-702d5.firebasestorage.app",
  messagingSenderId: "843213691832",
  appId: "1:843213691832:web:ec2df97824c23e3b508d4d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- PERFORMANCE: Enable Offline Persistence ---
try {
  enableIndexedDbPersistence(db).catch((err) => {
    // Persistence might fail in multiple tabs or unsupported browsers, just log it.
    console.log("Persistence disabled:", err.code);
  });
} catch (e) {
  // Ignore dev errors
}

// --- Translations & Data ---
const CATEGORIES_CONFIG = {
  produce:   { emoji: "🍎", en: "Produce", he: "ירקות" },
  dairy:     { emoji: "🧀", en: "Dairy", he: "חלב" },
  meat:      { emoji: "🥩", en: "Meat", he: "בשר" },
  bakery:    { emoji: "🥖", en: "Bakery", he: "מאפים" },
  pantry:    { emoji: "🥫", en: "Pantry", he: "מזווה" },
  frozen:    { emoji: "🧊", en: "Frozen", he: "קפואים" },
  household: { emoji: "🧻", en: "Home", he: "לבית" },
  other:     { emoji: "🛒", en: "Other", he: "שונות" },
};

const CATEGORY_KEYS = Object.keys(CATEGORIES_CONFIG);

const TRANSLATIONS = {
  en: {
    title: "Grocery List",
    enterListId: "Enter Shared List Name",
    enterListIdPlaceholder: "e.g., our-home-123",
    join: "Join List",
    addItem: "Add",
    connecting: "Connecting...",
    placeholder: "I need...",
    empty: "Your list is empty.",
    loading: "Loading...",
    signout: "Exit",
    share: "Share List Name",
    recent: "Recent",
    errorAdd: "Connection issue. Retrying...",
    view: { flat: "Flat List", category: "By Category" },
    actions: { edit: "Edit", save: "Save", cancel: "Cancel" },
    deleteModal: { title: "Remove Item?", warning: "This cannot be undone.", confirm: "Remove" },
    shoppingModeOn: "Shopping Mode",
    shoppingModeOff: "Edit Mode",
    quantity: "Qty"
  },
  he: {
    title: "רשימת קניות",
    enterListId: "שם רשימה משותפת",
    enterListIdPlaceholder: "לדוגמה: הבית-שלנו",
    join: "כניסה",
    addItem: "הוסף",
    connecting: "מתחבר...",
    placeholder: "מה צריך לקנות?",
    empty: "הרשימה ריקה.",
    loading: "טוען...",
    signout: "יציאה",
    share: "שתף רשימה",
    recent: "אחרונים",
    errorAdd: "בעיית חיבור. מנסה שוב...",
    view: { flat: "רשימה רגילה", category: "לפי קטגוריות" },
    actions: { edit: "ערוך", save: "שמור", cancel: "ביטול" },
    deleteModal: { title: "למחוק פריט?", warning: "לא ניתן לשחזר מחיקה.", confirm: "מחק" },
    shoppingModeOn: "מצב קנייה",
    shoppingModeOff: "מצב עריכה",
    quantity: "כמות"
  }
};

const ITEM_COLORS = [
  'border-pink-400', 'border-purple-400', 'border-indigo-400', 
  'border-blue-400', 'border-cyan-400', 'border-teal-400', 
  'border-green-400', 'border-lime-400', 'border-yellow-400', 'border-orange-400',
];

// --- Sub-Components ---

const Header = memo(({ lang, setLang, shoppingMode, setShoppingMode, darkMode, setDarkMode }) => {
  return (
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm sticky top-0 z-20 border-b border-purple-100 dark:border-slate-800 transition-colors duration-300">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo Area */}
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-pink-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-purple-500/20 text-white">
            <ShoppingBasket size={20} strokeWidth={2.5} />
          </div>
          <h1 className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-300 hidden sm:block">
            {TRANSLATIONS[lang].title}
          </h1>
        </div>
        
        {/* Actions Area */}
        <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-full p-1 border border-gray-200 dark:border-slate-700">
          <button 
            onClick={() => setShoppingMode(!shoppingMode)}
            className={`p-2 rounded-full transition-all duration-300 ${shoppingMode ? 'bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300'}`}
          >
            {shoppingMode ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>

          <div className="w-px h-4 bg-gray-300 dark:bg-slate-700 mx-1"></div>

          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full text-gray-400 hover:text-yellow-500 dark:text-slate-500 dark:hover:text-yellow-400 transition-colors"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <div className="w-px h-4 bg-gray-300 dark:bg-slate-700 mx-1"></div>

          <button 
            onClick={() => setLang(lang === 'en' ? 'he' : 'en')}
            className="px-2 py-1 rounded-full text-xs font-bold text-gray-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors"
          >
            {lang === 'en' ? 'HE' : 'EN'}
          </button>
        </div>
      </div>
      
      {/* Shopping Mode Banner */}
      <div className={`overflow-hidden transition-all duration-300 ${shoppingMode ? 'max-h-8' : 'max-h-0'}`}>
        <div className="bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-300 text-xs font-bold text-center py-1.5 border-b border-green-500/20">
          {TRANSLATIONS[lang].shoppingModeOn}
        </div>
      </div>
    </div>
  );
});

const AddItemForm = memo(({ onAdd, lang, isRTL, isSubmitting, user }) => {
  const [text, setText] = useState('');
  const [qty, setQty] = useState(1);
  const [cat, setCat] = useState('other'); 
  
  const t = TRANSLATIONS[lang];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text, qty, cat);
    setText('');
    setQty(1);
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-[2rem] shadow-xl shadow-purple-500/5 dark:shadow-black/20 border border-purple-100 dark:border-slate-700 flex flex-col gap-4 transition-all duration-300">
      
      <form onSubmit={handleSubmit} className="flex gap-3">
        {/* Input Wrapper */}
        <div className="flex-grow relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-purple-600/20 rounded-2xl blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.placeholder}
            className="relative w-full h-14 bg-gray-50 dark:bg-slate-900/50 border-2 border-transparent focus:border-purple-500/30 dark:focus:border-purple-500/50 rounded-2xl px-5 text-lg font-medium outline-none transition-all placeholder:text-gray-400 dark:text-white dark:placeholder:text-slate-600"
            dir="auto"
          />
        </div>

        {/* Quantity Wrapper */}
        <div className="h-14 flex items-center bg-gray-50 dark:bg-slate-900/50 rounded-2xl p-1 shrink-0 border-2 border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition-all" dir="ltr">
           <button 
             type="button" 
             onClick={(e) => { e.preventDefault(); setQty(q => Math.max(1, q - 1)); }}
             className="w-8 h-full flex items-center justify-center text-gray-400 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all active:scale-90"
             disabled={qty <= 1}
           >
             <Minus size={16} strokeWidth={3} />
           </button>
           <div className="w-8 text-center font-bold text-gray-700 dark:text-slate-200 text-lg">
             {qty}
           </div>
           <button 
             type="button" 
             onClick={(e) => { e.preventDefault(); setQty(q => Math.min(99, q + 1)); }}
             className="w-8 h-full flex items-center justify-center text-gray-400 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all active:scale-90"
           >
             <Plus size={16} strokeWidth={3} />
           </button>
        </div>
      </form>

      {/* Bottom Row: Categories Dropdown + Add Button */}
      <div className="flex items-center gap-3">
        {/* Dropdown Menu */}
        <div className="relative flex-grow h-12">
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className={`w-full h-full appearance-none bg-gray-50 dark:bg-slate-900/50 border-2 border-transparent focus:border-purple-200 dark:focus:border-purple-800 hover:border-gray-200 dark:hover:border-slate-700 text-gray-700 dark:text-slate-200 px-4 rounded-2xl leading-tight outline-none font-bold transition-all cursor-pointer ${isRTL ? 'pl-10 text-right' : 'pr-10 text-left'}`}
          >
            {CATEGORY_KEYS.map((key) => (
              <option key={key} value={key} className="dark:bg-slate-800">
                {CATEGORIES_CONFIG[key].emoji}  {CATEGORIES_CONFIG[key][lang]}
              </option>
            ))}
          </select>
          <div className={`pointer-events-none absolute inset-y-0 ${isRTL ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center text-gray-400 dark:text-slate-500`}>
            <ChevronDown size={20} />
          </div>
        </div>

        {/* Big Add Button */}
        <button 
          onClick={handleSubmit}
          disabled={!text.trim() || !user || isSubmitting}
          className="h-12 w-16 bg-gradient-to-br from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white rounded-2xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 transition-all flex items-center justify-center shrink-0"
        >
          {isSubmitting || !user ? <Loader2 size={20} className="animate-spin" /> : <Plus size={26} strokeWidth={3} />}
        </button>
      </div>
    </div>
  );
});

const ItemRow = memo(({ item, index, onToggle, onDelete, onEdit, shoppingMode, lang }) => {
  return (
    <div 
      className={`group relative flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700/50 transition-all duration-300 hover:shadow-md
      ${item.completed ? 'opacity-60 grayscale-[0.5]' : ''}`}
    >
      {/* Colorful Accent Bar */}
      <div className={`absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full ${ITEM_COLORS[index % ITEM_COLORS.length].replace('border-', 'bg-')}`}></div>

      <button
        onClick={() => onToggle(item.id, item.completed)}
        className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ml-3 ${item.completed ? 'bg-green-500 border-green-500 text-white scale-110' : 'border-gray-300 dark:border-slate-600 text-transparent hover:border-purple-400'}`}
      >
        <Check size={14} strokeWidth={4} />
      </button>
      
      <div className="flex-grow min-w-0">
        <div className={`text-lg font-medium truncate transition-colors ${item.completed ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-800 dark:text-slate-200'}`}>
          {item.text}
        </div>
        <div className="text-xs font-medium text-gray-400 dark:text-slate-500 mt-0.5 flex items-center gap-2">
           <span>{CATEGORIES_CONFIG[item.category]?.emoji || '🛒'} {CATEGORIES_CONFIG[item.category]?.[lang] || 'Item'}</span>
           {item.quantity > 1 && (
             <span className="text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-1.5 rounded text-[10px] font-bold">
               x{item.quantity}
             </span>
           )}
        </div>
      </div>

      {!shoppingMode && (
        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(item)} className="p-2.5 text-gray-400 dark:text-slate-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-xl transition-colors"><Pencil size={18} /></button>
            <button onClick={() => onDelete(item.id)} className="p-2.5 text-gray-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-700 rounded-xl transition-colors"><Trash2 size={18} /></button>
        </div>
      )}
    </div>
  );
});

export default function App() {
  const [user, setUser] = useState(null);
  const [listId, setListId] = useState(() => localStorage.getItem('grocery_list_id') || '');
  const [isJoined, setIsJoined] = useState(() => !!localStorage.getItem('grocery_list_id'));
  
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('grocery_view_mode') || 'flat');
  const [lang, setLang] = useState(() => localStorage.getItem('grocery_lang') || 'he');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('grocery_dark_mode') === 'true');
  const [shoppingMode, setShoppingMode] = useState(false);
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const [recentLists, setRecentLists] = useState(() => {
    try { return JSON.parse(localStorage.getItem('grocery_list_history') || '[]'); } 
    catch { return []; }
  });

  const t = TRANSLATIONS[lang];
  const isRTL = lang === 'he';

  useEffect(() => { localStorage.setItem('grocery_view_mode', viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem('grocery_lang', lang); }, [lang]);
  
  useEffect(() => { 
    localStorage.setItem('grocery_dark_mode', darkMode);
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      if (shoppingMode && 'wakeLock' in navigator) {
        try { wakeLock = await navigator.wakeLock.request('screen'); } 
        catch (err) { console.error(err); }
      }
    };
    if (shoppingMode) requestWakeLock();
    return () => { if (wakeLock) wakeLock.release(); };
  }, [shoppingMode]);

  useEffect(() => {
    const initAuth = async () => {
      try { await signInAnonymously(auth); } 
      catch (err) { setError("Network error"); }
    };
    initAuth();
    onAuthStateChanged(auth, (u) => { setUser(u); if (u) setError(''); });
  }, []);

  useEffect(() => {
    if (!user || !isJoined || !listId) return;
    setLoading(true);
    const safeListId = listId.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
    const q = collection(db, 'lists', safeListId, 'items');

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setItems(fetchedItems);
        setLoading(false);
        setError('');
      }, (err) => {
        setLoading(false);
        if (err.code !== 'permission-denied') setError("Sync paused.");
        if (err.code === 'permission-denied') setError("Database Locked: Update Firebase Rules");
      }
    );
    return () => unsubscribe();
  }, [user, isJoined, listId]);

  const handleAddItem = async (text, qty, category) => {
    setIsSubmitting(true);
    if (!user) {
        try { await signInAnonymously(auth); } 
        catch(err) { setError(t.errorAdd); setIsSubmitting(false); return; }
    }
    const safeListId = listId.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
    try {
      await addDoc(collection(db, 'lists', safeListId, 'items'), {
        text, quantity: qty, category, completed: false, createdAt: serverTimestamp(), author: auth.currentUser?.uid
      });
      setError('');
    } catch (err) { setError(t.errorAdd); } 
    finally { setIsSubmitting(false); }
  };

  const toggleItem = async (itemId, currentStatus) => {
    const safeListId = listId.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
    const itemRef = doc(db, 'lists', safeListId, 'items', itemId);
    await updateDoc(itemRef, { completed: !currentStatus });
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const safeListId = listId.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
    const itemRef = doc(db, 'lists', safeListId, 'items', deleteId);
    await deleteDoc(itemRef);
    setDeleteId(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    const safeListId = listId.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
    const itemRef = doc(db, 'lists', safeListId, 'items', editingId);
    await updateDoc(itemRef, { text: editText });
    setEditingId(null);
    setEditText('');
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (listId.trim().length < 3) return;
    localStorage.setItem('grocery_list_id', listId);
    const currentHistory = JSON.parse(localStorage.getItem('grocery_list_history') || '[]');
    const newHistory = [listId, ...currentHistory.filter(item => item !== listId)].slice(0, 5);
    localStorage.setItem('grocery_list_history', JSON.stringify(newHistory));
    setRecentLists(newHistory);
    setIsJoined(true);
  };

  const groupedItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
        if (a.completed === b.completed) return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        return a.completed ? 1 : -1;
    });
    if (viewMode === 'flat') return { 'All Items': sorted };
    const groups = {};
    CATEGORY_KEYS.forEach(cat => groups[cat] = []);
    sorted.forEach(item => {
        const cat = item.category || 'other';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(item);
    });
    return groups;
  }, [items, viewMode]);

  if (!user && !error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 transition-colors">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-2" />
        <p className="text-purple-400 font-bold animate-pulse">{t.connecting}</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-slate-100 font-sans transition-colors duration-500 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      
      <Header 
        lang={lang} setLang={setLang} 
        shoppingMode={shoppingMode} setShoppingMode={setShoppingMode} 
        darkMode={darkMode} setDarkMode={setDarkMode}
      />

      <div className="max-w-md mx-auto p-4 pb-32">
        {error && (
            <div className="bg-red-50 border-2 border-red-100 text-red-600 p-3 rounded-2xl mb-4 text-sm font-bold flex items-center gap-2 animate-pulse dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                <WifiOff size={18} />
                {error}
            </div>
        )}
        
        {!isJoined ? (
          <div className="mt-8 animate-in fade-in duration-500 slide-in-from-bottom-4">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-8 rounded-[2.5rem] shadow-xl border border-white/50 dark:border-slate-700 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/30 rotate-3">
                <Share2 size={36} strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{t.enterListId}</h2>
              <p className="text-gray-500 dark:text-slate-400 text-sm mb-8 font-medium">Sync with your partner instantly</p>
              
              <form onSubmit={handleJoin} className="space-y-4">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition-opacity"></div>
                  <input
                    type="text"
                    value={listId}
                    onChange={(e) => setListId(e.target.value)}
                    placeholder={t.enterListIdPlaceholder}
                    className="relative w-full p-4 bg-white dark:bg-slate-900 border-2 border-transparent focus:border-purple-500/20 rounded-2xl outline-none text-center text-xl font-bold placeholder:text-gray-300 text-gray-900 dark:text-white transition-all shadow-sm"
                  />
                </div>
                <button type="submit" disabled={listId.length < 3 || !user} className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-4 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all text-lg">{!user ? t.connecting : t.join}</button>
              </form>
            </div>
            
            {recentLists.length > 0 && (
              <div className="mt-10 text-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                <div className="flex items-center gap-2 text-gray-400 dark:text-slate-600 text-xs mb-4 justify-center uppercase tracking-widest font-bold">
                  <span>{t.recent}</span>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {recentLists.map((id) => (
                    <button key={id} onClick={() => { setListId(id); localStorage.setItem('grocery_list_id', id); setIsJoined(true); }} className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-2xl hover:border-purple-200 dark:hover:border-purple-800 hover:text-purple-600 dark:hover:text-purple-400 text-sm font-bold shadow-sm transition-all hover:-translate-y-0.5">
                      {id}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            {!shoppingMode && (
              <div className="flex justify-between items-center text-sm font-medium text-gray-500 dark:text-slate-400 px-1">
                <div className="flex items-center gap-2">
                  <span className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-4 py-2 rounded-full text-xs font-black tracking-wide uppercase border border-gray-100 dark:border-slate-700 shadow-sm">
                    {listId}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setViewMode(viewMode === 'flat' ? 'category' : 'flat')} className="p-2.5 bg-white dark:bg-slate-800 rounded-xl hover:bg-purple-50 dark:hover:bg-slate-700 border border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-300 shadow-sm transition-all" title={t.view[viewMode]}>
                    {viewMode === 'flat' ? <Layers size={18} /> : <ListIcon size={18} />}
                  </button>
                  <button onClick={() => { localStorage.removeItem('grocery_list_id'); setIsJoined(false); setItems([]); setListId(''); }} className="flex items-center gap-2 bg-red-50 dark:bg-red-900/10 text-red-500 px-4 py-2.5 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/20 font-bold text-xs transition-colors">
                    <LogOut size={14} />{t.signout}
                  </button>
                </div>
              </div>
            )}

            {!shoppingMode && (
              <AddItemForm onAdd={handleAddItem} lang={lang} isRTL={isRTL} isSubmitting={isSubmitting} user={user} />
            )}

            <div className={`space-y-4 ${shoppingMode ? 'pt-2' : ''}`}>
              {Object.entries(groupedItems).map(([groupName, groupItems]) => (
                groupItems.length > 0 && (
                  <div key={groupName} className="space-y-2">
                     {viewMode === 'category' && (
                       <h3 className="text-xs font-black text-gray-400 dark:text-slate-500 px-4 uppercase tracking-widest flex items-center gap-3 mt-6 mb-3">
                         <span className="text-lg grayscale">{CATEGORIES_CONFIG[groupName]?.emoji}</span>
                         <span>{CATEGORIES_CONFIG[groupName]?.[lang] || groupName}</span>
                         <div className="h-px bg-gray-100 dark:bg-slate-800 flex-grow"></div>
                       </h3>
                     )}
                     
                     {groupItems.map((item, index) => (
                       <div key={item.id}>
                         {editingId === item.id ? (
                           <div className="flex gap-2 p-2 bg-white dark:bg-slate-800 rounded-3xl shadow-lg ring-4 ring-purple-50 dark:ring-purple-900/20 z-10 relative">
                             <input value={editText} onChange={(e) => setEditText(e.target.value)} className="flex-grow bg-gray-50 dark:bg-slate-900 rounded-2xl px-4 text-lg font-bold outline-none dark:text-white" autoFocus />
                             <button onClick={saveEdit} className="p-3 bg-green-500 text-white rounded-xl shadow-md shadow-green-200 dark:shadow-none"><Save size={20} /></button>
                             <button onClick={() => setEditingId(null)} className="p-3 bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-xl"><X size={20} /></button>
                           </div>
                         ) : (
                           <ItemRow 
                             item={item} index={index} 
                             onToggle={toggleItem} 
                             onDelete={(id) => setDeleteId(id)} 
                             onEdit={(item) => { setEditingId(item.id); setEditText(item.text); }}
                             shoppingMode={shoppingMode}
                             lang={lang}
                           />
                         )}
                       </div>
                     ))}
                  </div>
                )
              ))}
              
              {items.length === 0 && !loading && (
                 <div className="text-center py-20 opacity-40">
                    <div className="bg-gray-100 dark:bg-slate-800 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400 dark:text-slate-500">
                      <ShoppingBasket size={40} />
                    </div>
                    <p className="text-gray-400 dark:text-slate-500 font-medium">{t.empty}</p>
                 </div>
              )}
            </div>
          </div>
        )}
      </div>

      {deleteId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center gap-6">
                    <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-full text-red-500 shadow-sm">
                        <Trash2 size={40} strokeWidth={2} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-gray-900 dark:text-white">{t.deleteModal.title}</h3>
                      <p className="text-gray-500 dark:text-slate-400 font-medium">{t.deleteModal.warning}</p>
                    </div>
                    <div className="flex gap-3 w-full">
                        <button onClick={() => setDeleteId(null)} className="flex-1 py-4 bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">{t.actions.cancel}</button>
                        <button onClick={confirmDelete} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 shadow-lg shadow-red-500/30 transition-colors">{t.deleteModal.confirm}</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
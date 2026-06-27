export const en = {
  // Nav
  home: 'Home',
  deliveries: 'Deliveries',
  stock: 'Stock',
  customers: 'Customers',
  orders: 'Orders',
  settings: 'Settings',
  reports: 'Reports',
  back: 'Back',

  // Dashboard
  hi: 'Hi',
  new_delivery: 'New Delivery',
  today_deliveries: "Today's Deliveries",
  today_collected: "Today's Collected",
  total_pending: 'Total Pending',
  active_deliveries: 'Active Deliveries',
  cylinder_stock: 'Cylinder Stock',
  view_details: 'View Details',
  record_purchase: 'Record new purchase from supplier',
  no_deliveries_today: 'No deliveries yet today',
  all_payments: 'All Payments',

  // Attribution
  delivered_by: 'Delivered by',
  booked_by: 'Booked by',
  collected_by: 'Collected by',
  added_by: 'Added by',
  recorded_by: 'Recorded by',

  // Customer
  current_balance: 'Current Balance',
  balance_clear: 'Clear',
  balance_pending: 'Pending',

  // Stock
  full: 'Full',
  empty: 'Empty',

  // Settings
  theme: 'Theme',
  theme_dark_hint: 'Dark — tap to switch to Light',
  theme_light_hint: 'Light — tap to switch to Dark',
  language: 'Language',
  language_hint: 'English — tap to switch to Malayalam',
  install_app: 'Install App',
  install_hint: 'Add SuperGas to your home screen',
  app_installed: 'App installed',
  products_pricing: 'Products & Pricing',
  users: 'Users',
  my_account: 'My Account',
  danger_zone: 'Danger Zone',

  // Actions
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
  search_customer: 'Search customer...',
}

export const ml: typeof en = {
  // Nav
  home: 'ഹോം',
  deliveries: 'ഡെലിവറി',
  stock: 'സ്റ്റോക്ക്',
  customers: 'ഉപഭോക്താക്കൾ',
  orders: 'ഓർഡർ',
  settings: 'ക്രമീകരണം',
  reports: 'റിപ്പോർട്ട്',
  back: 'തിരിച്ച്',

  // Dashboard
  hi: 'ഹായ്',
  new_delivery: 'പുതിയ ഡെലിവറി',
  today_deliveries: 'ഇന്നത്തെ ഡെലിവറി',
  today_collected: 'ഇന്ന് ശേഖരിച്ചത്',
  total_pending: 'ആകെ കുടിശ്ശിക',
  active_deliveries: 'ഇന്നത്തെ ഡെലിവറികൾ',
  cylinder_stock: 'സിലിണ്ടർ സ്റ്റോക്ക്',
  view_details: 'കൂടുതൽ കാണുക',
  record_purchase: 'പുതിയ ഗ്യാസ് വരവ് ചേർക്കുക',
  no_deliveries_today: 'ഇന്ന് ഡെലിവറികൾ ഒന്നുമില്ല',
  all_payments: 'എല്ലാ പേയ്‌മെന്റുകളും',

  // Attribution
  delivered_by: 'ഡെലിവർ ചെയ്തത്',
  booked_by: 'ബുക്ക് ചെയ്തത്',
  collected_by: 'ശേഖരിച്ചത്',
  added_by: 'ചേർത്തത്',
  recorded_by: 'രേഖപ്പെടുത്തിയത്',

  // Customer
  current_balance: 'ബാലൻസ്',
  balance_clear: 'ക്ലിയർ',
  balance_pending: 'കുടിശ്ശിക',

  // Stock
  full: 'നിറഞ്ഞ',
  empty: 'കാലി',

  // Settings
  theme: 'തീം',
  theme_dark_hint: 'ഡാർക്ക് — ലൈറ്റ് ആക്കാൻ തൊടുക',
  theme_light_hint: 'ലൈറ്റ് — ഡാർക്ക് ആക്കാൻ തൊടുക',
  language: 'ഭാഷ',
  language_hint: 'മലയാളം — English ആക്കാൻ തൊടുക',
  install_app: 'ആപ്പ് ഇൻസ്റ്റോൾ ചെയ്യുക',
  install_hint: 'SuperGas ഹോം സ്ക്രീനിൽ ചേർക്കുക',
  app_installed: 'ആപ്പ് ഇൻസ്റ്റോൾ ആയി',
  products_pricing: 'ഉൽപ്പന്നങ്ങളും വിലയും',
  users: 'ഉപയോക്താക്കൾ',
  my_account: 'എന്റെ അക്കൗണ്ട്',
  danger_zone: 'അപകട മേഖല',

  // Actions
  save: 'സേവ് ചെയ്യുക',
  cancel: 'റദ്ദാക്കുക',
  delete: 'ഇല്ലാതാക്കുക',
  edit: 'തിരുത്തുക',
  search_customer: 'ഉപഭോക്താവിനെ തിരയുക...',
}

export type TranslationKey = keyof typeof en

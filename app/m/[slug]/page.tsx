"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  ShoppingBag,
  Sparkles,
  Clock,
  MapPin,
  Plus,
  Minus,
  X,
  ExternalLink,
  Gift,
  ArrowRight,
  Check,
  AlertCircle,
  Phone,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  isVeg: boolean;
  isAvailable: boolean;
  tags: string[];
}

interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

interface RestaurantData {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  cover: string | null;
  phone: string | null;
  timings: string | null;
  address: string | null;
  city: string | null;
}

interface ReviewSettings {
  popupEnabled: boolean;
  popupDelaySeconds: number;
  googleReviewLink: string | null;
  minBill: number;
}

interface CartItem {
  item: MenuItem;
  quantity: number;
}

function CustomerMenuContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const slug = (params.slug as string)?.toLowerCase();
  const tableParam = searchParams.get("table");
  const initialTable = tableParam ? parseInt(tableParam) : 1;

  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [reviewSettings, setReviewSettings] = useState<ReviewSettings | null>(null);
  const [tablesList, setTablesList] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [vegOnly, setVegOnly] = useState<boolean>(false);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [orderTable, setOrderTable] = useState<number>(initialTable);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [orderNotes, setOrderNotes] = useState<string>("");
  const [submittingOrder, setSubmittingOrder] = useState<boolean>(false);

  // Review Reward Popup
  const [showReviewPopup, setShowReviewPopup] = useState(false);

  // Fetch Menu Data
  useEffect(() => {
    async function fetchMenu() {
      try {
        const url = `/api/public/menu/${slug}${tableParam ? `?table=${tableParam}` : ""}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load menu");
        }
        setRestaurant(data.restaurant);
        setCategories(data.categories);
        setFeatures(data.features || []);
        setReviewSettings(data.reviewSettings || null);
        setTablesList(data.tables || [1, 2, 3, 4]);
      } catch (err: unknown) {
        setError((err as Error).message || "Could not load menu");
      } finally {
        setLoading(false);
      }
    }
    if (slug) fetchMenu();
  }, [slug, tableParam]);

  // Review Reward popup timer
  useEffect(() => {
    if (!reviewSettings || !reviewSettings.popupEnabled || !features.includes("reviewReward")) {
      return;
    }

    const storageKey = `menumitra_review_popup_${slug}`;
    const lastDismissed = localStorage.getItem(storageKey);
    const now = Date.now();

    // 24 hours cooldown
    if (lastDismissed && now - parseInt(lastDismissed) < 24 * 60 * 60 * 1000) {
      return;
    }

    const delay = (reviewSettings.popupDelaySeconds || 6) * 1000;
    const timer = setTimeout(() => {
      setShowReviewPopup(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [reviewSettings, features, slug]);

  const dismissReviewPopup = () => {
    setShowReviewPopup(false);
    localStorage.setItem(`menumitra_review_popup_${slug}`, Date.now().toString());
  };

  const handleReviewClick = () => {
    dismissReviewPopup();
    if (reviewSettings?.googleReviewLink) {
      window.open(reviewSettings.googleReviewLink, "_blank");
    }
    router.push(`/reward/${slug}`);
  };

  // Cart operations
  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((i) => {
          if (i.item.id === itemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Submit Order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setSubmittingOrder(true);
    try {
      const payload = {
        restaurantSlug: slug,
        tableNumber: orderTable,
        customerName: customerName.trim() || "Dine-in Guest",
        phone: customerPhone.trim() || undefined,
        notes: orderNotes.trim() || undefined,
        paymentMode: "PAY_AT_COUNTER",
        items: cart.map((i) => ({
          menuItemId: i.item.id,
          quantity: i.quantity,
        })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to place order");
      }

      // Clear cart and redirect to live tracking page
      setCart([]);
      setCartDrawerOpen(false);
      router.push(`/order/${data.orderId}`);
    } catch (err: unknown) {
      alert((err as Error).message || "Order placement failed");
    } finally {
      setSubmittingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center animate-bounce shadow-soft">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-stone-700">Loading delicious dishes...</p>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-bold text-stone-900">Restaurant Menu Unavailable</h2>
        <p className="text-xs text-stone-500 max-w-sm">{error || "Please check the URL or table QR."}</p>
        <Link href="/">
          <Button size="sm" variant="outline">
            Go to MenuMitra Home
          </Button>
        </Link>
      </div>
    );
  }

  // Filter categories and items
  const filteredCategories = categories
    .map((cat) => {
      const items = cat.items.filter((it) => {
        if (vegOnly && !it.isVeg) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = it.name.toLowerCase().includes(q);
          const matchDesc = it.description?.toLowerCase().includes(q);
          if (!matchName && !matchDesc) return false;
        }
        return true;
      });
      return { ...cat, items };
    })
    .filter((cat) => {
      if (activeCategory !== "ALL" && cat.id !== activeCategory) return false;
      return cat.items.length > 0;
    });

  const allowsOrdering = features.includes("orders");

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 pb-28">
      {/* Cover Banner */}
      <div className="relative h-44 sm:h-56 w-full bg-stone-900 overflow-hidden">
        {restaurant.cover ? (
          <img
            src={restaurant.cover}
            alt={restaurant.name}
            className="w-full h-full object-cover opacity-85"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-stone-900 via-brand-950 to-stone-900 flex items-center justify-center text-stone-600 font-bold" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Floating Table Badge */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-stone-900 text-xs font-black shadow-md flex items-center gap-1.5 border border-white">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Table {orderTable}</span>
          </div>
        </div>
      </div>

      {/* Restaurant Info Header */}
      <div className="max-w-2xl mx-auto px-4 -mt-12 relative z-10">
        <div className="bg-white rounded-3xl p-5 shadow-soft-lg border border-stone-200/80">
          <div className="flex items-start gap-4">
            {restaurant.logo ? (
              <img
                src={restaurant.logo}
                alt={restaurant.name}
                className="w-16 h-16 rounded-2xl object-cover shrink-0 border-2 border-white shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-brand-500 text-white flex items-center justify-center font-black text-xl shrink-0 shadow-md">
                {restaurant.name.charAt(0)}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 leading-tight">
                {restaurant.name}
              </h1>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-stone-500 mt-1.5">
                {restaurant.timings && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <span>{restaurant.timings}</span>
                  </div>
                )}
                {restaurant.city && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    <span>{restaurant.city}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table Change Switcher (Collapsible/Inline) */}
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-500">Sitting at another table?</span>
            <select
              value={orderTable}
              onChange={(e) => setOrderTable(parseInt(e.target.value))}
              className="bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 font-bold text-stone-800 text-xs focus:ring-1 focus:ring-brand-500"
            >
              {tablesList.map((num) => (
                <option key={num} value={num}>
                  Change to Table {num}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sticky Navigation / Category Pills & Filters */}
      <div className="sticky top-0 z-30 bg-[#faf8f5]/95 backdrop-blur-md pt-4 pb-2 border-b border-stone-200/60 shadow-2xs">
        <div className="max-w-2xl mx-auto px-4 space-y-2.5">
          {/* Search bar & Pure Veg Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes (e.g. Paneer, Biryani, Naan)..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-stone-300 text-xs bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => setVegOnly(!vegOnly)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all shrink-0 ${
                vegOnly
                  ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs"
                  : "bg-white border-stone-300 text-stone-600"
              }`}
            >
              <span className="veg-badge" />
              <span>Veg Only</span>
            </button>
          </div>

          {/* Sticky Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setActiveCategory("ALL")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === "ALL"
                  ? "bg-stone-900 text-white shadow-sm"
                  : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-100"
              }`}
            >
              All Dishes
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? "bg-brand-500 text-white shadow-sm shadow-brand-500/25"
                    : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-100"
                }`}
              >
                {cat.name} ({cat.items.length})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dishes Sections */}
      <div className="max-w-2xl mx-auto px-4 mt-6 space-y-8">
        {filteredCategories.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-stone-200 space-y-2">
            <p className="text-sm font-bold text-stone-700">No dishes found</p>
            <p className="text-xs text-stone-400">Try adjusting your veg filter or search keywords</p>
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <div key={cat.id} className="space-y-3.5">
              <div className="flex items-baseline justify-between border-b border-stone-200/80 pb-2">
                <h2 className="text-lg font-black text-stone-900">{cat.name}</h2>
                <span className="text-xs text-stone-400 font-medium">
                  {cat.items.length} {cat.items.length === 1 ? "dish" : "dishes"}
                </span>
              </div>

              <div className="space-y-3">
                {cat.items.map((dish) => {
                  const cartEntry = cart.find((i) => i.item.id === dish.id);
                  const qty = cartEntry ? cartEntry.quantity : 0;

                  return (
                    <div
                      key={dish.id}
                      className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs hover:shadow-soft transition-all flex items-start gap-3.5"
                    >
                      {/* Left: Info */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2">
                          {dish.isVeg ? (
                            <span className="veg-badge" title="Vegetarian" />
                          ) : (
                            <span className="non-veg-badge" title="Non-Vegetarian" />
                          )}
                          {dish.tags && dish.tags.length > 0 && (
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-full">
                              {dish.tags[0]}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-extrabold text-stone-900 leading-snug">
                          {dish.name}
                        </h3>

                        <div className="font-black text-stone-900 text-sm">
                          {formatINR(dish.price)}
                        </div>

                        {dish.description && (
                          <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                            {dish.description}
                          </p>
                        )}
                      </div>

                      {/* Right: Dish Image & Add/Qty Button */}
                      <div className="relative shrink-0 flex flex-col items-center">
                        {dish.image ? (
                          <img
                            src={dish.image}
                            alt={dish.name}
                            className="w-24 h-24 rounded-2xl object-cover border border-stone-200 shadow-2xs"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-300 font-bold text-lg">
                            {dish.name.charAt(0)}
                          </div>
                        )}

                        {/* Add / Quantity Button */}
                        {allowsOrdering && (
                          <div className="mt-[-14px] z-10">
                            {qty === 0 ? (
                              <button
                                onClick={() => addToCart(dish)}
                                className="px-5 py-1.5 rounded-xl bg-white text-brand-600 border border-brand-300 shadow-sm font-black text-xs uppercase tracking-wider hover:bg-brand-50 active:scale-95 transition-all"
                              >
                                Add +
                              </button>
                            ) : (
                              <div className="flex items-center bg-brand-500 text-white rounded-xl shadow-sm px-1 py-1 font-black text-xs gap-2">
                                <button
                                  onClick={() => updateCartQuantity(dish.id, -1)}
                                  className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-brand-600"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="px-1 text-xs">{qty}</span>
                                <button
                                  onClick={() => updateCartQuantity(dish.id, 1)}
                                  className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-brand-600"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Cart Sticky Footer Bar */}
      {allowsOrdering && cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-40 animate-in slide-in-from-bottom duration-200">
          <div className="bg-stone-900 text-white rounded-2xl p-3.5 shadow-soft-lg flex items-center justify-between border border-stone-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center font-black text-sm text-white">
                {cartItemCount}
              </div>
              <div>
                <p className="text-xs text-stone-400 font-medium">Table {orderTable} Cart</p>
                <p className="text-base font-black text-white">{formatINR(cartTotal)}</p>
              </div>
            </div>

            <Button
              onClick={() => setCartDrawerOpen(true)}
              size="sm"
              className="bg-brand-500 hover:bg-brand-600 text-white font-extrabold px-5 shadow-sm"
            >
              View Order
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* CART DRAWER MODAL */}
      {cartDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setCartDrawerOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-soft-lg border border-stone-200 overflow-hidden z-10 max-h-[90vh] flex flex-col">
            {/* Drawer Header */}
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-stone-900">Your Table Order</h3>
                <p className="text-xs text-stone-500">Sitting at Table {orderTable}</p>
              </div>
              <button
                onClick={() => setCartDrawerOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1 divide-y divide-stone-100">
              {cart.map((entry) => (
                <div key={entry.item.id} className="pt-2 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {entry.item.isVeg ? (
                        <span className="veg-badge" />
                      ) : (
                        <span className="non-veg-badge" />
                      )}
                      <p className="text-xs font-bold text-stone-900 truncate">
                        {entry.item.name}
                      </p>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5 font-semibold">
                      {formatINR(entry.item.price * entry.quantity)}
                    </p>
                  </div>

                  <div className="flex items-center bg-stone-100 rounded-xl px-2 py-1 font-bold text-xs gap-2">
                    <button
                      onClick={() => updateCartQuantity(entry.item.id, -1)}
                      className="w-5 h-5 flex items-center justify-center text-stone-700 hover:text-red-600"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-4 text-center">{entry.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(entry.item.id, 1)}
                      className="w-5 h-5 flex items-center justify-center text-stone-700 hover:text-brand-600"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Guest Form & Submit */}
            <form onSubmit={handlePlaceOrder} className="p-4 bg-stone-50 border-t border-stone-200 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Guest name"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91..."
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-300 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                  Special Cooking Notes
                </label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Less spicy, extra onions, no coriander"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-300 bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-between text-sm font-extrabold text-stone-900">
                <span>Grand Total:</span>
                <span className="text-base text-brand-600 font-black">{formatINR(cartTotal)}</span>
              </div>

              <Button
                type="submit"
                isLoading={submittingOrder}
                className="w-full py-3 text-sm font-black shadow-lg shadow-brand-500/25"
              >
                Send Order to Kitchen &rarr;
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* GOOGLE REVIEW REWARD POPUP (After configured delay e.g. 6s) */}
      {showReviewPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-soft-lg text-center space-y-4 border border-brand-200">
            {/* Celebration Icon */}
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand-500 to-amber-400 text-white flex items-center justify-center mx-auto shadow-md">
              <Gift className="w-8 h-8 animate-pulse" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full mb-2">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Win a Scratch Card Reward!
              </div>
              <h3 className="text-xl font-black text-stone-900 leading-snug">
                Enjoyed Your Meal at {restaurant.name}?
              </h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Share your 5-star review on Google, upload a screenshot, and win a surprise scratch card discount for your next visit! 🎁
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                onClick={handleReviewClick}
                className="w-full py-3 text-xs font-black shadow-md shadow-brand-500/25 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                Review on Google & Scratch Card
              </Button>

              <button
                onClick={dismissReviewPopup}
                className="text-xs text-stone-400 hover:text-stone-600 font-semibold py-1.5 block mx-auto"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerMenuPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#faf8f5] flex items-center justify-center text-stone-400">Loading menu...</div>}>
      <CustomerMenuContent />
    </Suspense>
  );
}

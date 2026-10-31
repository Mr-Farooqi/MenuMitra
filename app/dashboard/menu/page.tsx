"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Upload,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Tag,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatINR } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  order: number;
  active: boolean;
  _count?: { items: number };
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  isVeg: boolean;
  isAvailable: boolean;
  tagsList: string[];
  categoryId: string;
  category?: { id: string; name: string };
}

const AVAILABLE_TAGS = [
  "Bestseller",
  "Chef Special",
  "Spicy",
  "Popular",
  "Must Try",
  "Kids Favorite",
  "New",
];

export default function MenuManagerPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [vegOnly, setVegOnly] = useState(false);

  // Selected items for bulk actions
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Modals state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState("");

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: "",
    categoryId: "",
    price: "",
    description: "",
    image: "",
    isVeg: true,
    isAvailable: true,
    tags: [] as string[],
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch data
  const loadData = async () => {
    setLoading(true);
    try {
      const [catsRes, itemsRes] = await Promise.all([
        fetch("/api/menu/categories"),
        fetch("/api/menu/items"),
      ]);
      const catsData = await catsRes.json();
      const itemsData = await itemsRes.json();

      if (catsData.categories) setCategories(catsData.categories);
      if (itemsData.items) setItems(itemsData.items);
    } catch (err) {
      console.error("Failed to load menu", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Category Actions
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingCategory) {
        // Update
        const res = await fetch("/api/menu/categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingCategory.id, name: categoryNameInput }),
        });
        if (!res.ok) throw new Error("Failed to update category");
      } else {
        // Create
        const res = await fetch("/api/menu/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: categoryNameInput }),
        });
        if (!res.ok) throw new Error("Failed to create category");
      }
      setCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryNameInput("");
      loadData();
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure? All items in this category will also be deleted.")) return;
    try {
      const res = await fetch(`/api/menu/categories?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete category");
      loadData();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleMoveCategory = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const newCats = [...categories];
    const temp = newCats[index];
    newCats[index] = newCats[targetIndex];
    newCats[targetIndex] = temp;

    const itemsPayload = newCats.map((cat, idx) => ({ id: cat.id, order: idx }));
    setCategories(newCats);

    try {
      await fetch("/api/menu/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "category", items: itemsPayload }),
      });
    } catch (err) {
      console.error("Failed to reorder", err);
      loadData();
    }
  };

  // Item Actions
  const openAddItemModal = () => {
    setEditingItem(null);
    setItemForm({
      name: "",
      categoryId: categories[0]?.id || "",
      price: "",
      description: "",
      image: "",
      isVeg: true,
      isAvailable: true,
      tags: [],
    });
    setItemModalOpen(true);
  };

  const openEditItemModal = (item: MenuItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      categoryId: item.categoryId,
      price: item.price.toString(),
      description: item.description || "",
      image: item.image || "",
      isVeg: item.isVeg,
      isAvailable: item.isAvailable,
      tags: item.tagsList || [],
    });
    setItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        name: itemForm.name,
        categoryId: itemForm.categoryId,
        price: parseFloat(itemForm.price),
        description: itemForm.description,
        image: itemForm.image || null,
        isVeg: itemForm.isVeg,
        isAvailable: itemForm.isAvailable,
        tags: itemForm.tags,
      };

      if (editingItem) {
        const res = await fetch("/api/menu/items", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingItem.id, ...payload }),
        });
        if (!res.ok) throw new Error("Failed to update item");
      } else {
        const res = await fetch("/api/menu/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create item");
      }
      setItemModalOpen(false);
      loadData();
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this menu item?")) return;
    try {
      const res = await fetch(`/api/menu/items?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete item");
      loadData();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await fetch("/api/menu/items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, isAvailable: !item.isAvailable }),
      });
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, isAvailable: !it.isAvailable } : it))
      );
    } catch (err) {
      console.error("Toggle error", err);
    }
  };

  const handleBulkToggle = async (isAvailable: boolean) => {
    if (selectedItemIds.length === 0) return;
    try {
      await fetch("/api/menu/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: selectedItemIds, isAvailable }),
      });
      setItems((prev) =>
        prev.map((it) =>
          selectedItemIds.includes(it.id) ? { ...it, isAvailable } : it
        )
      );
      setSelectedItemIds([]);
    } catch (err) {
      console.error("Bulk toggle error", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("folder", "items");

      const res = await fetch("/api/upload", { method: "POST", body: data });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      setItemForm((prev) => ({ ...prev, image: result.url }));
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Filtered items
  const filteredItems = items.filter((item) => {
    if (selectedCategory !== "ALL" && item.categoryId !== selectedCategory) return false;
    if (vegOnly && !item.isVeg) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(query);
      const matchDesc = item.description?.toLowerCase().includes(query);
      if (!matchName && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Menu Manager
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Organize categories, dishes, prices, tags, and stock availability
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingCategory(null);
              setCategoryNameInput("");
              setCategoryModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Category
          </Button>

          <Button size="sm" onClick={openAddItemModal} className="shadow-md shadow-brand-500/25">
            <Plus className="w-4 h-4 mr-1.5" />
            Add New Dish
          </Button>
        </div>
      </div>

      {/* Category Management Bar */}
      <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Categories ({categories.length})
          </span>
          <span className="text-[11px] text-stone-400">Use arrows to change menu order</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedCategory === "ALL"
                ? "bg-stone-900 text-white shadow-sm"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            All Dishes ({items.length})
          </button>

          {categories.map((cat, index) => {
            const isSelected = selectedCategory === cat.id;
            const itemCount = items.filter((it) => it.categoryId === cat.id).length;
            return (
              <div
                key={cat.id}
                className={`inline-flex items-center gap-1 rounded-xl p-1 transition-all ${
                  isSelected ? "bg-brand-50 border border-brand-300" : "bg-stone-100"
                }`}
              >
                <button
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                    isSelected ? "text-brand-900" : "text-stone-700"
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className="text-[10px] text-stone-500 bg-white/70 px-1.5 py-0.2 rounded-full">
                    {itemCount}
                  </span>
                </button>

                {/* Edit & Reorder buttons */}
                <div className="flex items-center gap-0.5 border-l border-stone-200/80 pl-1">
                  <button
                    onClick={() => handleMoveCategory(index, "up")}
                    disabled={index === 0}
                    title="Move Up"
                    className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-30"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleMoveCategory(index, "down")}
                    disabled={index === categories.length - 1}
                    title="Move Down"
                    className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-30"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingCategory(cat);
                      setCategoryNameInput(cat.name);
                      setCategoryModalOpen(true);
                    }}
                    title="Edit Name"
                    className="p-1 text-stone-400 hover:text-stone-700"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    title="Delete Category"
                    className="p-1 text-stone-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Bulk Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes by name or description..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Veg Only Toggle */}
          <button
            onClick={() => setVegOnly(!vegOnly)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all shrink-0 ${
              vegOnly
                ? "bg-emerald-50 border-emerald-400 text-emerald-800"
                : "bg-white border-stone-300 text-stone-600 hover:bg-stone-50"
            }`}
          >
            <span className="veg-badge" />
            <span>Pure Veg</span>
          </button>
        </div>

        {/* Bulk Availability Actions */}
        {selectedItemIds.length > 0 && (
          <div className="flex items-center gap-2 p-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs animate-in fade-in">
            <span className="font-bold text-amber-900 px-2">{selectedItemIds.length} selected</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkToggle(true)}
              className="bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-[11px] h-7 px-2.5"
            >
              <Eye className="w-3 h-3 mr-1" /> Mark Available
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkToggle(false)}
              className="bg-white text-stone-700 border-stone-300 hover:bg-stone-50 text-[11px] h-7 px-2.5"
            >
              <EyeOff className="w-3 h-3 mr-1" /> Mark Sold Out
            </Button>
            <button
              onClick={() => setSelectedItemIds([])}
              className="text-stone-400 hover:text-stone-700 text-xs px-1.5"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Items Table / Grid */}
      {loading ? (
        <div className="py-20 text-center text-stone-400 text-sm">Loading menu items...</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-3">
          <p className="text-stone-600 text-sm font-semibold">No dishes found matching your criteria</p>
          <Button size="sm" onClick={openAddItemModal}>
            <Plus className="w-4 h-4 mr-1" /> Add Your First Dish
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/70 text-stone-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={
                        filteredItems.length > 0 &&
                        selectedItemIds.length === filteredItems.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItemIds(filteredItems.map((i) => i.id));
                        } else {
                          setSelectedItemIds([]);
                        }
                      }}
                      className="rounded border-stone-300 text-brand-500 focus:ring-brand-500"
                    />
                  </th>
                  <th className="py-3 px-3">Dish Details</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Price</th>
                  <th className="py-3 px-3">Tags</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredItems.map((item) => {
                  const isChecked = selectedItemIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-stone-50/60 transition-colors ${
                        !item.isAvailable ? "opacity-60 bg-stone-50/30" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItemIds([...selectedItemIds, item.id]);
                            } else {
                              setSelectedItemIds(selectedItemIds.filter((id) => id !== item.id));
                            }
                          }}
                          className="rounded border-stone-300 text-brand-500 focus:ring-brand-500"
                        />
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-12 h-12 rounded-xl object-cover shrink-0 border border-stone-200"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 shrink-0 text-xs font-bold">
                              {item.name.charAt(0)}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {item.isVeg ? (
                                <span className="veg-badge" title="Vegetarian" />
                              ) : (
                                <span className="non-veg-badge" title="Non-Vegetarian" />
                              )}
                              <p className="font-extrabold text-stone-900 text-sm truncate">
                                {item.name}
                              </p>
                            </div>
                            {item.description && (
                              <p className="text-[11px] text-stone-500 truncate max-w-sm mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 font-semibold text-stone-600">
                        {item.category?.name || "Uncategorized"}
                      </td>

                      <td className="py-3.5 px-3 font-black text-stone-900 text-sm">
                        {formatINR(item.price)}
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {item.tagsList && item.tagsList.length > 0 ? (
                            item.tagsList.map((tag, tIdx) => (
                              <span
                                key={tIdx}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100/70 text-amber-800 border border-amber-200"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-stone-400">-</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => handleToggleAvailability(item)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                            item.isAvailable
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-stone-200 text-stone-600 border-stone-300 hover:bg-stone-300"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.isAvailable ? "bg-emerald-500" : "bg-stone-400"
                            }`}
                          />
                          <span>{item.isAvailable ? "In Stock" : "Sold Out"}</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditItemModal(item)}
                            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                            title="Edit Dish"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete Dish"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CATEGORY MODAL */}
      <Modal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title={editingCategory ? "Edit Category" : "Add Menu Category"}
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Category Name
            </label>
            <input
              type="text"
              required
              value={categoryNameInput}
              onChange={(e) => setCategoryNameInput(e.target.value)}
              placeholder="e.g. Tandoor & Kebabs, Shahi Curries..."
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCategoryModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingCategory ? "Update Category" : "Create Category"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ITEM MODAL */}
      <Modal
        isOpen={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        title={editingItem ? "Edit Dish" : "Add New Dish"}
        maxWidth="xl"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Dish Name
              </label>
              <input
                type="text"
                required
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                placeholder="e.g. Paneer Butter Masala"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Category
              </label>
              <select
                required
                value={itemForm.categoryId}
                onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Price in INR (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={itemForm.price}
                onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                placeholder="290"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Dietary Preference
              </label>
              <div className="flex items-center gap-3 h-10">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-800">
                  <input
                    type="radio"
                    name="dietType"
                    checked={itemForm.isVeg}
                    onChange={() => setItemForm({ ...itemForm, isVeg: true })}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="veg-badge" />
                  <span>Vegetarian</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-800">
                  <input
                    type="radio"
                    name="dietType"
                    checked={!itemForm.isVeg}
                    onChange={() => setItemForm({ ...itemForm, isVeg: false })}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span className="non-veg-badge" />
                  <span>Non-Veg</span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Description / Ingredients
            </label>
            <textarea
              rows={2}
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
              placeholder="Fresh cottage cheese simmered in buttery tomato-cashew gravy with fenugreek..."
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Dish Image Upload */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Dish Image
            </label>
            <div className="flex items-center gap-4">
              {itemForm.image ? (
                <img
                  src={itemForm.image}
                  alt="Dish preview"
                  className="w-16 h-16 rounded-xl object-cover border border-stone-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 text-xs">
                  No Photo
                </div>
              )}
              <label className="cursor-pointer">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  isLoading={uploadingImage}
                  className="pointer-events-none"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Upload Photo
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              {itemForm.image && (
                <button
                  type="button"
                  onClick={() => setItemForm({ ...itemForm, image: "" })}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Tags Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Highlighted Badges / Tags
            </label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_TAGS.map((tag) => {
                const isSelected = itemForm.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setItemForm({
                          ...itemForm,
                          tags: itemForm.tags.filter((t) => t !== tag),
                        });
                      } else {
                        setItemForm({
                          ...itemForm,
                          tags: [...itemForm.tags, tag],
                        });
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-brand-500 text-white font-bold"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-stone-100">
            <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={itemForm.isAvailable}
                onChange={(e) => setItemForm({ ...itemForm, isAvailable: e.target.checked })}
                className="rounded border-stone-300 text-brand-500 focus:ring-brand-500"
              />
              <span>In Stock & Ready to Order</span>
            </label>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setItemModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingItem ? "Save Changes" : "Create Dish"}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

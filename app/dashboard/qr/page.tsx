"use client";

import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  QrCode,
  Download,
  Printer,
  Sparkles,
  Palette,
  Layers,
  Plus,
  Trash2,
  ExternalLink,
  UtensilsCrossed,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TableItem {
  id: string;
  number: number;
}

export default function QRCodeStudioPage() {
  const [activeTab, setActiveTab] = useState<"menu" | "table">("menu");
  const [tables, setTables] = useState<TableItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<number>(1);
  const [newTableNumber, setNewTableNumber] = useState<string>("");
  const [batchCount, setBatchCount] = useState<string>("8");
  const [restaurantSlug, setRestaurantSlug] = useState<string>("tandoori-nights");
  const [restaurantName, setRestaurantName] = useState<string>("Tandoori Nights");
  const [restaurantLogo, setRestaurantLogo] = useState<string | null>(null);

  // Color customization
  const [fgColor, setFgColor] = useState<string>("#ea580c"); // Brand orange
  const [bgColor, setBgColor] = useState<string>("#ffffff"); // White

  // QR Data URL
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load restaurant & tables
  const loadData = async () => {
    try {
      const [meRes, tablesRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/qr/tables"),
      ]);
      const meData = await meRes.json();
      const tablesData = await tablesRes.json();

      if (meData.user?.restaurant) {
        setRestaurantSlug(meData.user.restaurant.slug);
        setRestaurantName(meData.user.restaurant.name);
        setRestaurantLogo(meData.user.restaurant.logo);
      }

      if (tablesData.tables) {
        setTables(tablesData.tables);
        if (tablesData.tables.length > 0) {
          setSelectedTable(tablesData.tables[0].number);
        }
      }
    } catch (err) {
      console.error("Failed to load QR data", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute QR URL
  const currentUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/m/${restaurantSlug}${
          activeTab === "table" ? `?table=${selectedTable}` : ""
        }`
      : `http://localhost:3000/m/${restaurantSlug}${
          activeTab === "table" ? `?table=${selectedTable}` : ""
        }`;

  // Generate QR Canvas
  useEffect(() => {
    async function renderQR() {
      try {
        const url = await QRCode.toDataURL(currentUrl, {
          width: 600,
          margin: 2,
          color: {
            dark: fgColor,
            light: bgColor,
          },
        });
        setQrDataUrl(url);

        if (canvasRef.current) {
          QRCode.toCanvas(canvasRef.current, currentUrl, {
            width: 260,
            margin: 2,
            color: {
              dark: fgColor,
              light: bgColor,
            },
          });
        }
      } catch (err) {
        console.error("Failed to render QR", err);
      }
    }
    renderQR();
  }, [currentUrl, fgColor, bgColor]);

  // Add Table
  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(newTableNumber);
    if (!num || num <= 0) return;

    try {
      const res = await fetch("/api/qr/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: num }),
      });
      if (res.ok) {
        setNewTableNumber("");
        loadData();
      }
    } catch (err) {
      console.error("Add table error", err);
    }
  };

  // Batch generate tables
  const handleBatchGenerate = async () => {
    const count = parseInt(batchCount);
    if (!count || count <= 0) return;

    try {
      const res = await fetch("/api/qr/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generateCount: count }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error("Batch error", err);
    }
  };

  // Delete Table
  const handleDeleteTable = async (id: string) => {
    try {
      await fetch(`/api/qr/tables?id=${id}`, { method: "DELETE" });
      loadData();
    } catch (err) {
      console.error("Delete table error", err);
    }
  };

  // Download PNG
  const handleDownloadPNG = () => {
    const link = document.createElement("a");
    link.download = `${restaurantSlug}-qr-${activeTab === "table" ? `table-${selectedTable}` : "general"}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  // Print Table Tent
  const handlePrint = () => {
    window.print();
  };

  const presetColors = [
    { name: "Spice Orange", hex: "#ea580c" },
    { name: "Classic Charcoal", hex: "#1c1917" },
    { name: "Mughlai Maroon", hex: "#991b1b" },
    { name: "Deep Emerald", hex: "#065f46" },
    { name: "Royal Indigo", hex: "#312e81" },
  ];

  return (
    <div className="space-y-8">
      {/* Printable Table Tent Container (Hidden on Screen, Visible on Print) */}
      <div className="hidden print:block font-sans p-8 max-w-xl mx-auto border-4 border-dashed border-stone-300 rounded-3xl text-center page-break-after">
        <div className="p-8 bg-white rounded-2xl border-2 border-stone-800 space-y-6">
          <div className="flex items-center justify-center gap-2">
            {restaurantLogo ? (
              <img src={restaurantLogo} alt="Logo" className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
            )}
            <h1 className="text-2xl font-black text-stone-900">{restaurantName}</h1>
          </div>

          <div className="py-2">
            {activeTab === "table" ? (
              <div className="inline-block px-6 py-2 rounded-full bg-stone-900 text-white font-black text-xl tracking-wider">
                TABLE {selectedTable}
              </div>
            ) : (
              <div className="inline-block px-6 py-2 rounded-full bg-stone-900 text-white font-black text-sm tracking-wider uppercase">
                DIGITAL CONTACTLESS MENU
              </div>
            )}
          </div>

          <div className="flex justify-center py-2">
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="Printable QR"
                className="w-56 h-56 border-2 border-stone-900 rounded-xl p-2"
              />
            )}
          </div>

          <div className="space-y-1 text-stone-700">
            <p className="font-extrabold text-base">Scan with your phone camera</p>
            <p className="text-xs text-stone-500">
              Browse full menu, filter vegetarian dishes & place live orders
            </p>
          </div>

          <div className="pt-4 border-t border-stone-200 text-[10px] text-stone-400 font-bold uppercase tracking-widest">
            Powered by MenuMitra Smart Dining
          </div>
        </div>
      </div>

      {/* Screen Interface (Hidden when Printing) */}
      <div className="print:hidden space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              QR Code Studio
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Customize colors, generate table-specific codes, and download high-res PNG or printable table tents
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="bg-white border-stone-300 font-bold"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Print Table Tent
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPNG}
              className="font-bold shadow-md shadow-brand-500/25"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Download PNG
            </Button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
          <button
            onClick={() => setActiveTab("menu")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "menu"
                ? "bg-brand-500 text-white shadow-sm"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <QrCode className="w-4 h-4" />
            General Menu QR
          </button>
          <button
            onClick={() => setActiveTab("table")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "table"
                ? "bg-brand-500 text-white shadow-sm"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <Layers className="w-4 h-4" />
            Table-Wise QR Codes ({tables.length})
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Customizer Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* Table Selector (If on Table Tab) */}
            {activeTab === "table" && (
              <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-stone-900">Select Table to Generate</h3>
                  <span className="text-xs text-stone-500">Each table gets its own tagged QR</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {tables.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTable(t.number)}
                      className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                        selectedTable === t.number
                          ? "bg-stone-900 text-white border-stone-900 shadow-sm"
                          : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                      }`}
                    >
                      <span>Table {t.number}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTable(t.id);
                        }}
                        className="text-stone-400 hover:text-red-400 ml-1"
                        title="Delete Table"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Table Controls */}
                <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center gap-3">
                  <form onSubmit={handleAddTable} className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="number"
                      min="1"
                      value={newTableNumber}
                      onChange={(e) => setNewTableNumber(e.target.value)}
                      placeholder="Add Table #"
                      className="w-28 px-3 py-1.5 text-xs rounded-xl border border-stone-300"
                    />
                    <Button type="submit" size="sm" variant="outline">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                  </form>

                  <div className="hidden sm:block text-stone-300">|</div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs text-stone-500">Auto-create up to:</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={batchCount}
                      onChange={(e) => setBatchCount(e.target.value)}
                      className="w-16 px-2 py-1.5 text-xs rounded-xl border border-stone-300"
                    />
                    <Button size="sm" variant="ghost" onClick={handleBatchGenerate}>
                      Generate Tables
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Color Customizer */}
            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-soft space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-brand-600" />
                <h3 className="text-sm font-extrabold text-stone-900">Custom QR Palette</h3>
              </div>

              {/* Preset Foreground Colors */}
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-2">
                  Pattern / Foreground Color
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {presetColors.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => setFgColor(c.hex)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                        fgColor === c.hex
                          ? "border-stone-900 bg-stone-100 font-bold"
                          : "border-stone-200 bg-white hover:bg-stone-50"
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-stone-300"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span>{c.name}</span>
                    </button>
                  ))}
                  <div className="flex items-center gap-1 pl-2">
                    <input
                      type="color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                    />
                    <span className="text-[11px] font-mono text-stone-500">{fgColor}</span>
                  </div>
                </div>
              </div>

              {/* Background Color */}
              <div className="pt-3 border-t border-stone-100 flex items-center gap-4">
                <label className="text-xs font-bold text-stone-600">Background:</label>
                <button
                  onClick={() => setBgColor("#ffffff")}
                  className={`px-3 py-1 rounded-lg text-xs border font-medium ${
                    bgColor === "#ffffff" ? "bg-stone-900 text-white" : "bg-white text-stone-700"
                  }`}
                >
                  Pure White
                </button>
                <button
                  onClick={() => setBgColor("#fffbeb")}
                  className={`px-3 py-1 rounded-lg text-xs border font-medium ${
                    bgColor === "#fffbeb" ? "bg-stone-900 text-white" : "bg-[#fffbeb] text-stone-700"
                  }`}
                >
                  Warm Cream
                </button>
              </div>
            </div>

            {/* Target URL Info */}
            <div className="p-4 rounded-2xl bg-stone-100/80 border border-stone-200 flex items-center justify-between">
              <div className="min-w-0 pr-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                  Encoded Scan URL
                </span>
                <p className="text-xs font-mono text-brand-700 truncate font-semibold mt-0.5">
                  {currentUrl}
                </p>
              </div>
              <a
                href={currentUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-xs font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1"
              >
                Test Link <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Right Live Preview Column */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-stone-200 shadow-soft text-center space-y-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
                Live Table-Tent Preview
              </span>
              <h3 className="text-xl font-black text-stone-900 mt-1">
                {activeTab === "table" ? `Table ${selectedTable} Tent Card` : "General Menu Card"}
              </h3>
            </div>

            {/* Table Tent Mock Visual */}
            <div
              className="p-6 rounded-2xl border-2 shadow-sm max-w-xs mx-auto space-y-4"
              style={{ backgroundColor: bgColor }}
            >
              <div className="flex items-center justify-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: fgColor }}
                >
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <span className="font-black text-base text-stone-900">{restaurantName}</span>
              </div>

              {activeTab === "table" && (
                <div
                  className="inline-block px-4 py-1 rounded-full text-white text-xs font-black tracking-wider"
                  style={{ backgroundColor: fgColor }}
                >
                  TABLE {selectedTable}
                </div>
              )}

              <div className="flex justify-center p-2">
                <canvas ref={canvasRef} className="rounded-xl shadow-xs" />
              </div>

              <div className="space-y-0.5">
                <p className="font-extrabold text-xs text-stone-800">Scan to View Menu & Order</p>
                <p className="text-[10px] text-stone-500">Contactless dining on your phone</p>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Button onClick={handleDownloadPNG} className="w-full font-bold shadow-md shadow-brand-500/20">
                <Download className="w-4 h-4 mr-2" />
                Download High-Res QR (PNG)
              </Button>
              <Button variant="outline" onClick={handlePrint} className="w-full font-semibold">
                <Printer className="w-4 h-4 mr-2" />
                Print Foldable Table Tent
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

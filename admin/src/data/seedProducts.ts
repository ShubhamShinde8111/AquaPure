/**
 * AquaPure — 60 Authoritative Synchronized Catalog Products Dataset
 * Covers all 6 categories with authentic water purification specifications and dual customer/dealer pricing (INR).
 */

import type { Product, ProductCategory } from '../types';

export interface CategoryInfo {
  id: ProductCategory;
  name: string;
  description: string;
  icon: string;
  itemCount: number;
}

export const CATEGORY_DEFINITIONS: Record<string, { name: string; icon: string; description: string }> = {
  'water-purifiers': {
    name: 'Water Purifiers',
    icon: '💧',
    description: 'Advanced RO, UV, UF & Alkaline home & commercial systems',
  },
  'water-dispensers': {
    name: 'Water Dispensers',
    icon: '🚰',
    description: 'Hot, cold & ambient floor-standing and tabletop dispensers',
  },
  'water-pumps': {
    name: 'Water Pumps',
    icon: '⚙️',
    description: 'Booster pumps, feed pumps & pressure controllers',
  },
  'filters-cartridges': {
    name: 'Filters & Cartridges',
    icon: '🔬',
    description: 'Sediment, carbon, alkaline, mineral cartridges & membranes',
  },
  'spare-parts-accessories': {
    name: 'Spare Parts & Accessories',
    icon: '🔧',
    description: 'Taps, tanks, SMPS, fittings, UV lamps & leak protection kits',
  },
  'bottles-storage': {
    name: 'Bottles & Storage',
    icon: '🍶',
    description: 'Stainless steel bottles, water cans, storage tanks & jugs',
  },
};

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'water-purifiers',
    name: 'Water Purifiers',
    description: 'Advanced RO, UV, UF & Alkaline home & commercial systems',
    icon: '💧',
    itemCount: 12,
  },
  {
    id: 'water-dispensers',
    name: 'Water Dispensers',
    description: 'Hot, cold & ambient floor-standing and tabletop dispensers',
    icon: '🚰',
    itemCount: 10,
  },
  {
    id: 'water-pumps',
    name: 'Water Pumps',
    description: 'Booster pumps, feed pumps & pressure controllers',
    icon: '⚙️',
    itemCount: 8,
  },
  {
    id: 'filters-cartridges',
    name: 'Filters & Cartridges',
    description: 'Sediment, carbon, alkaline, mineral cartridges & membranes',
    icon: '🔬',
    itemCount: 12,
  },
  {
    id: 'spare-parts-accessories',
    name: 'Spare Parts & Accessories',
    description: 'Taps, tanks, SMPS, fittings, UV lamps & leak protection kits',
    icon: '🔧',
    itemCount: 10,
  },
  {
    id: 'bottles-storage',
    name: 'Bottles & Storage',
    description: 'Stainless steel bottles, water cans, storage tanks & jugs',
    icon: '🍶',
    itemCount: 8,
  }
];

/**
 * Dynamically generate category summary with exact active counts from any product array
 */
export function generateCategories(products: Product[]): CategoryInfo[] {
  const categoryMap = new Map<string, CategoryInfo>();

  // Initialize with all standard categories so order is preserved
  for (const [id, def] of Object.entries(CATEGORY_DEFINITIONS)) {
    categoryMap.set(id, {
      id: id as ProductCategory,
      name: def.name,
      description: def.description,
      icon: def.icon,
      itemCount: 0,
    });
  }

  for (const prod of products) {
    if (!prod.active) continue;
    const catId = prod.categoryId;
    if (categoryMap.has(catId)) {
      categoryMap.get(catId)!.itemCount += 1;
    } else {
      categoryMap.set(catId, {
        id: catId as ProductCategory,
        name: prod.category || catId,
        description: `${prod.category || catId} items`,
        icon: '💧',
        itemCount: 1,
      });
    }
  }

  return Array.from(categoryMap.values()).filter(c => c.itemCount > 0);
}

export const SEED_PRODUCTS: Product[] = [
  {
    "id": "AP-WP-001",
    "name": "AquaPure Grand RO+UV+UF+Alkaline",
    "slug": "aquapure-grand-ro-uv-uf-alkaline",
    "category": "Water Purifiers",
    "categoryId": "water-purifiers",
    "description": "Flagship 10-stage purification system with alkaline mineralizer and copper infusion for pure, electrolyte-balanced water.",
    "price": 14999,
    "customerPrice": 14999,
    "dealerPrice": 11500,
    "imageUrl": "https://m.media-amazon.com/images/I/71Q2y9G0mnL._SX522_.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/71Q2y9G0mnL._SX522_.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Purification Technology",
        "value": "RO + UV + UF + Alkaline + Copper"
      },
      {
        "label": "Storage Capacity",
        "value": "10 Litres"
      },
      {
        "label": "Filtration Rate",
        "value": "15 L/hr"
      },
      {
        "label": "Max TDS Supported",
        "value": "2500 ppm"
      },
      {
        "label": "Material",
        "value": "Food Grade ABS Plastic"
      },
      {
        "label": "Warranty",
        "value": "1 Year Comprehensive"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Grand RO+UV+UF+Alkaline product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-WP-002",
    "name": "AquaPure Slim Copper RO+UV",
    "slug": "aquapure-slim-copper-ro-uv",
    "category": "Water Purifiers",
    "categoryId": "water-purifiers",
    "description": "Space-saving slim wall-mounted purifier with active copper enrichment and UV sterilization.",
    "price": 12499,
    "customerPrice": 12499,
    "dealerPrice": 9100,
    "imageUrl": "https://rukminim2.flixcart.com/image/1536/1536/xif0q/water-purifier/6/n/k/slim-glass-aquaguard-original-imah7sk3uzhx82tx.jpeg?q=90",
    "gallery": [
      "https://rukminim2.flixcart.com/image/1536/1536/xif0q/water-purifier/6/n/k/slim-glass-aquaguard-original-imah7sk3uzhx82tx.jpeg?q=90"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Purification Technology",
        "value": "RO + UV + Copper Cartridge"
      },
      {
        "label": "Storage Capacity",
        "value": "7 Litres"
      },
      {
        "label": "Filtration Rate",
        "value": "12 L/hr"
      },
      {
        "label": "Max TDS Supported",
        "value": "2000 ppm"
      },
      {
        "label": "Mounting Type",
        "value": "Wall Mount / Countertop"
      },
      {
        "label": "Warranty",
        "value": "1 Year Warranty"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Slim Copper RO+UV product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-WP-003",
    "name": "AquaPure Crystal RO+UV",
    "slug": "aquapure-crystal-ro-uv",
    "category": "Water Purifiers",
    "categoryId": "water-purifiers",
    "description": "Reliable dual RO and UV system equipped with multi-stage pre-filters for sediment and chlorine removal.",
    "price": 10999,
    "customerPrice": 10999,
    "dealerPrice": 8500,
    "imageUrl": "https://m.media-amazon.com/images/I/61UCH0T-2sL._SX522_.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/61UCH0T-2sL._SX522_.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Purification Technology",
        "value": "RO + UV"
      },
      {
        "label": "Storage Capacity",
        "value": "8 Litres"
      },
      {
        "label": "Filtration Rate",
        "value": "12 L/hr"
      },
      {
        "label": "Max TDS Supported",
        "value": "1800 ppm"
      },
      {
        "label": "Tank Material",
        "value": "BPA-free Food Grade Plastic"
      },
      {
        "label": "Warranty",
        "value": "1 Year Warranty"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Crystal RO+UV product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-WP-004",
    "name": "AquaPure Alkaline Pro",
    "slug": "aquapure-alkaline-pro",
    "category": "Water Purifiers",
    "categoryId": "water-purifiers",
    "description": "Advanced alkaline pH booster and antioxidant water purifier for optimal hydration and wellness.",
    "price": 13999,
    "customerPrice": 13999,
    "dealerPrice": 10500,
    "imageUrl": "https://m.media-amazon.com/images/I/71eWWL+X7IL._SX522_.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/71eWWL+X7IL._SX522_.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Purification Technology",
        "value": "RO + Alkaline + Biocare"
      },
      {
        "label": "Storage Capacity",
        "value": "9 Litres"
      },
      {
        "label": "pH Range",
        "value": "7.5 – 8.5 pH"
      },
      {
        "label": "Max TDS Supported",
        "value": "2000 ppm"
      },
      {
        "label": "Warranty",
        "value": "1 Year Warranty"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Alkaline Pro product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-WP-005",
    "name": "AquaPure Mineral Max",
    "slug": "aquapure-mineral-max",
    "category": "Water Purifiers",
    "categoryId": "water-purifiers",
    "description": "Equipped with active mineral addition cartridge ensuring essential calcium and magnesium in drinking water.",
    "price": 11999,
    "customerPrice": 11999,
    "dealerPrice": 9000,
    "imageUrl": "https://m.media-amazon.com/images/I/61F0rxLrivL._SX425_.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/61F0rxLrivL._SX425_.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Purification Technology",
        "value": "RO + UV + Mineral Cartridge"
      },
      {
        "label": "Storage Capacity",
        "value": "8.5 Litres"
      },
      {
        "label": "Filtration Rate",
        "value": "14 L/hr"
      },
      {
        "label": "TDS Controller",
        "value": "Included (Manual Adjust)"
      },
      {
        "label": "Warranty",
        "value": "1 Year Warranty"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Mineral Max product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-WP-006",
    "name": "AquaPure UV Shield",
    "slug": "aquapure-uv-shield",
    "category": "Water Purifiers",
    "categoryId": "water-purifiers",
    "description": "Energy-efficient ultraviolet system for municipal and low-TDS water sources, eliminating 99.99% bacteria & viruses.",
    "price": 8999,
    "customerPrice": 8999,
    "dealerPrice": 6800,
    "imageUrl": "https://rukminim2.flixcart.com/image/1536/1536/xif0q/water-purifier/2/f/u/shield-eureka-forbes-aquasure-from-aquaguard-resized-original-imag6zayhhshpjnf.jpeg?q=90",
    "gallery": [
      "https://rukminim2.flixcart.com/image/1536/1536/xif0q/water-purifier/2/f/u/shield-eureka-forbes-aquasure-from-aquaguard-resized-original-imag6zayhhshpjnf.jpeg?q=90"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Purification Technology",
        "value": "UV + Sediment + Activated Carbon"
      },
      {
        "label": "Flow Rate",
        "value": "2 L/min Direct Flow"
      },
      {
        "label": "Storage",
        "value": "Instant Direct Dispense"
      },
      {
        "label": "Recommended TDS",
        "value": "Below 250 ppm"
      },
      {
        "label": "Warranty",
        "value": "1 Year Comprehensive"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure UV Shield product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-WP-007",
    "name": "AquaPure Compact RO",
    "slug": "aquapure-compact-ro",
    "category": "Water Purifiers",
    "categoryId": "water-purifiers",
    "description": "Compact kitchen RO purifier designed specifically for studio apartments and modern compact countertops.",
    "price": 7999,
    "customerPrice": 7999,
    "dealerPrice": 6100,
    "imageUrl": "https://rukminim2.flixcart.com/image/1536/1536/xif0q/water-purifier/9/z/2/compact-ro-uf-water-purifier-patented-mineral-ro-technology-15-original-imahfyf5nhkyanrd.jpeg?q=90",
    "gallery": [
      "https://rukminim2.flixcart.com/image/1536/1536/xif0q/water-purifier/9/z/2/compact-ro-uf-water-purifier-patented-mineral-ro-technology-15-original-imahfyf5nhkyanrd.jpeg?q=90"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Purification Technology",
        "value": "RO + UF"
      },
      {
        "label": "Storage Capacity",
        "value": "6 Litres"
      },
      {
        "label": "Recovery Rate",
        "value": "Up to 40%"
      },
      {
        "label": "Dimensions",
        "value": "38 x 26 x 42 cm"
      },
      {
        "label": "Warranty",
        "value": "1 Year Warranty"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Compact RO product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-WP-008",
    "name": "AquaPure Smart Touch RO",
    "slug": "aquapure-smart-touch-ro",
    "category": "Water Purifiers",
    "categoryId": "water-purifiers",
    "description": "Smart touch-screen water purifier featuring filter life monitoring, digital TDS display, and one-touch dispense.",
    "price": 15999,
    "customerPrice": 15999,
    "dealerPrice": 12200,
    "imageUrl": "https://rukminim2.flixcart.com/image/1536/1536/khqllzk0-0/water-purifier/k/z/1/smart-touch-livpure-original-imafcny8wcv2ge2t.jpeg?q=90",
    "gallery": [
      "https://rukminim2.flixcart.com/image/1536/1536/khqllzk0-0/water-purifier/k/z/1/smart-touch-livpure-original-imafcny8wcv2ge2t.jpeg?q=90"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Purification Technology",
        "value": "RO + UV + Smart IoT Touch"
      },
      {
        "label": "Display",
        "value": "Digital Touch LED Panel"
      },
      {
        "label": "Storage Capacity",
        "value": "9 Litres"
      },
      {
        "label": "Filter Life Alert",
        "value": "Yes (Audio-visual)"
      },
      {
        "label": "Warranty",
        "value": "2 Years Extended"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Smart Touch RO product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-WP-009",
    "name": "AquaPure Stainless Steel RO",
    "slug": "aquapure-stainless-steel-ro",
    "category": "Water Purifiers",
    "categoryId": "water-purifiers",
    "description": "Premium 304 food-grade stainless steel storage tank and casing for plastic-free, toxin-free water storage.",
    "price": 16999,
    "customerPrice": 16999,
    "dealerPrice": 13000,
    "imageUrl": "https://rukminim2.flixcart.com/image/1536/1536/xif0q/water-purifier/l/a/w/black-pureza-kenstar-resized-original-imahjh46dhmmqt5h.jpeg?q=90",
    "gallery": [
      "https://rukminim2.flixcart.com/image/1536/1536/xif0q/water-purifier/l/a/w/black-pureza-kenstar-resized-original-imahjh46dhmmqt5h.jpeg?q=90"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Purification Technology",
        "value": "RO + UV + SS Tank"
      },
      {
        "label": "Tank Material",
        "value": "SS 304 Grade Stainless Steel"
      },
      {
        "label": "Storage Capacity",
        "value": "10 Litres"
      },
      {
        "label": "Max TDS Supported",
        "value": "2000 ppm"
      },
      {
        "label": "Warranty",
        "value": "1 Year Product + 5 Year Tank"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Stainless Steel RO product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-WP-010",
    "name": "AquaPure Under-Sink RO",
    "slug": "aquapure-under-sink-ro",
    "category": "Water Purifiers",
    "categoryId": "water-purifiers",
    "description": "Concealed under-sink reverse osmosis system with sleek chrome deck faucet and pressurized expansion tank.",
    "price": 14499,
    "customerPrice": 14499,
    "dealerPrice": 11000,
    "imageUrl": "https://rukminim2.flixcart.com/image/1536/1536/j5crukw0/water-purifier/g/b/a/pureness-pureness-under-sink-ro-water-purifier-in-food-grade-original-imaew27tybutjdze.jpeg?q=90",
    "gallery": [
      "https://rukminim2.flixcart.com/image/1536/1536/j5crukw0/water-purifier/g/b/a/pureness-pureness-under-sink-ro-water-purifier-in-food-grade-original-imaew27tybutjdze.jpeg?q=90"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Purification Technology",
        "value": "RO + Post Carbon Hydrostatic"
      },
      {
        "label": "Mounting",
        "value": "Under Kitchen Counter"
      },
      {
        "label": "Tank Capacity",
        "value": "12 Litres Pressurized Tank"
      },
      {
        "label": "Faucet Included",
        "value": "Gooseneck Chrome Faucet"
      },
      {
        "label": "Warranty",
        "value": "1 Year Comprehensive"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Under-Sink RO product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-WP-011",
    "name": "AquaPure Basic UF",
    "slug": "aquapure-basic-uf",
    "category": "Water Purifiers",
    "categoryId": "water-purifiers",
    "description": "Zero-electricity gravity-based ultra-filtration purifier for municipal supply water and rural use.",
    "price": 5999,
    "customerPrice": 5999,
    "dealerPrice": 4500,
    "imageUrl": "https://rukminim2.flixcart.com/image/1536/1536/xif0q/tap-mount-water-filter/v/z/s/5-stage-non-electric-gravity-base-water-purifier-uf-membrane-original-imahfkqhea28nzka.jpeg?q=90",
    "gallery": [
      "https://rukminim2.flixcart.com/image/1536/1536/xif0q/tap-mount-water-filter/v/z/s/5-stage-non-electric-gravity-base-water-purifier-uf-membrane-original-imahfkqhea28nzka.jpeg?q=90"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Purification Technology",
        "value": "UF Hollow Fiber (0.01 Micron)"
      },
      {
        "label": "Electricity Required",
        "value": "No (Gravity Powered)"
      },
      {
        "label": "Storage Capacity",
        "value": "16 Litres Total"
      },
      {
        "label": "Recommended TDS",
        "value": "Up to 300 ppm"
      },
      {
        "label": "Warranty",
        "value": "6 Months"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Basic UF product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-WP-012",
    "name": "AquaPure Commercial RO 25 LPH",
    "slug": "aquapure-commercial-ro-25-lph",
    "category": "Water Purifiers",
    "categoryId": "water-purifiers",
    "description": "Heavy-duty 25 LPH commercial water purifier designed for clinics, offices, cafes, and small factories.",
    "price": 28999,
    "customerPrice": 28999,
    "dealerPrice": 22500,
    "imageUrl": "https://m.media-amazon.com/images/I/81WyiQFinBL._SL1500_.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/81WyiQFinBL._SL1500_.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Purification Technology",
        "value": "Dual Commercial RO 300 GPD"
      },
      {
        "label": "Filtration Rate",
        "value": "25 L/hr"
      },
      {
        "label": "Operating Voltage",
        "value": "230V AC"
      },
      {
        "label": "Frame",
        "value": "Powder-coated Mild Steel Skid"
      },
      {
        "label": "Warranty",
        "value": "1 Year Commercial"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Commercial RO 25 LPH product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-WD-013",
    "name": "AquaPure Hot & Cold Floor Dispenser",
    "slug": "aquapure-hot-cold-floor-dispenser",
    "category": "Water Dispensers",
    "categoryId": "water-dispensers",
    "description": "Floor-standing water dispenser offering instantaneous cold, hot, and ambient water dispensing with child lock.",
    "price": 9999,
    "customerPrice": 9999,
    "dealerPrice": 7600,
    "imageUrl": "https://m.media-amazon.com/images/I/51nplb85ROL._SX679_.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/51nplb85ROL._SX679_.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Dispenser Type",
        "value": "Floor Standing Top Load"
      },
      {
        "label": "Cooling Capacity",
        "value": "3 L/hr at 10°C"
      },
      {
        "label": "Heating Capacity",
        "value": "5 L/hr at 90°C"
      },
      {
        "label": "Refrigerant",
        "value": "Eco-friendly R134a"
      },
      {
        "label": "Warranty",
        "value": "1 Year Comprehensive"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Hot & Cold Floor Dispenser product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-WD-014",
    "name": "AquaPure Bottom Loading Dispenser",
    "slug": "aquapure-bottom-loading-dispenser",
    "category": "Water Dispensers",
    "categoryId": "water-dispensers",
    "description": "Convenient bottom-loading dispenser eliminating heavy bottle lifting; sleek hidden bottle compartment.",
    "price": 12999,
    "customerPrice": 12999,
    "dealerPrice": 9900,
    "imageUrl": "https://rukminim2.flixcart.com/image/1536/1536/xif0q/water-dispenser/a/g/y/without-cabinet-6-6-0-15-portable-water-dispenser-with-usb-resized-original-imahzvyecyzhn8en.jpeg?q=90",
    "gallery": [
      "https://rukminim2.flixcart.com/image/1536/1536/xif0q/water-dispenser/a/g/y/without-cabinet-6-6-0-15-portable-water-dispenser-with-usb-resized-original-imahzvyecyzhn8en.jpeg?q=90"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Loading Type",
        "value": "Bottom Loading Hidden Bottle"
      },
      {
        "label": "Temperature Options",
        "value": "Hot, Cold & Ambient"
      },
      {
        "label": "Bottle Compatibility",
        "value": "Standard 20L / 10L cans"
      },
      {
        "label": "Child Safety Lock",
        "value": "Yes (Hot Water Tap)"
      },
      {
        "label": "Warranty",
        "value": "1 Year Warranty"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Bottom Loading Dispenser product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-WD-015",
    "name": "AquaPure Tabletop Water Dispenser",
    "slug": "aquapure-tabletop-water-dispenser",
    "category": "Water Dispensers",
    "categoryId": "water-dispensers",
    "description": "Compact tabletop dispenser ideal for study desks, kitchenettes, and small reception areas.",
    "price": 3499,
    "customerPrice": 3499,
    "dealerPrice": 2600,
    "imageUrl": "https://m.media-amazon.com/images/I/41NyxpomHTL._SX679_.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/41NyxpomHTL._SX679_.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Dispenser Type",
        "value": "Tabletop / Countertop"
      },
      {
        "label": "Temperature Options",
        "value": "Cold & Ambient"
      },
      {
        "label": "Material",
        "value": "Heavy Duty ABS Plastic"
      },
      {
        "label": "Cooling Power",
        "value": "65W Semi-conductor"
      },
      {
        "label": "Warranty",
        "value": "1 Year Warranty"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Tabletop Water Dispenser product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-WD-016",
    "name": "AquaPure Electric Can Pump Dispenser",
    "slug": "aquapure-electric-can-pump-dispenser",
    "category": "Water Dispensers",
    "categoryId": "water-dispensers",
    "description": "USB-rechargeable electric pump that attaches directly to 20-litre water cans with one-touch dispensing.",
    "price": 799,
    "customerPrice": 799,
    "dealerPrice": 550,
    "imageUrl": "https://rukminim2.flixcart.com/image/1536/1536/xif0q/water-dispenser/q/9/t/-original-imahfm8frq7m8czh.jpeg?q=90",
    "gallery": [
      "https://rukminim2.flixcart.com/image/1536/1536/xif0q/water-dispenser/q/9/t/-original-imahfm8frq7m8czh.jpeg?q=90"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Type",
        "value": "Automatic Can Dispenser Pump"
      },
      {
        "label": "Battery Capacity",
        "value": "1200 mAh USB Rechargeable"
      },
      {
        "label": "Dispensing Rate",
        "value": "1.5 L/min"
      },
      {
        "label": "Hose Material",
        "value": "Food-Grade Silicone"
      },
      {
        "label": "Warranty",
        "value": "6 Months Replacement"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Electric Can Pump Dispenser product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-WD-017",
    "name": "AquaPure Manual Press Can Pump Dispenser",
    "slug": "aquapure-manual-press-can-pump-dispenser",
    "category": "Water Dispensers",
    "categoryId": "water-dispensers",
    "description": "Manual mechanical suction pump with airtight vacuum seal for effortless 20L water can dispensing without electricity.",
    "price": 349,
    "customerPrice": 349,
    "dealerPrice": 230,
    "imageUrl": "https://m.media-amazon.com/images/I/51J1EZ+1TML._SX679_.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/51J1EZ+1TML._SX679_.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Type",
        "value": "Manual Hand-Press Can Pump"
      },
      {
        "label": "Electricity Needed",
        "value": "None"
      },
      {
        "label": "Material",
        "value": "Virgin Polypropylene"
      },
      {
        "label": "Neck Fit",
        "value": "Standard 55mm crown top"
      },
      {
        "label": "Warranty",
        "value": "6 Months Warranty"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Manual Press Can Pump Dispenser product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-WD-018",
    "name": "AquaPure Stainless Steel Water Dispenser",
    "slug": "aquapure-stainless-steel-water-dispenser",
    "category": "Water Dispensers",
    "categoryId": "water-dispensers",
    "description": "Corrosion-resistant stainless steel water dispenser with dual push-taps for schools, canteens, and workplaces.",
    "price": 5499,
    "customerPrice": 5499,
    "dealerPrice": 4200,
    "imageUrl": "https://m.media-amazon.com/images/I/71rgf8vBotL._SX679_.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/71rgf8vBotL._SX679_.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Body Material",
        "value": "SS 202/304 Stainless Steel"
      },
      {
        "label": "Taps",
        "value": "Brass Chrome Plated Push Taps"
      },
      {
        "label": "Cooling Tank",
        "value": "Food Grade Stainless Steel"
      },
      {
        "label": "Warranty",
        "value": "1 Year Warranty"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Stainless Steel Water Dispenser product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-WD-019",
    "name": "AquaPure Office Water Cooler",
    "slug": "aquapure-office-water-cooler",
    "category": "Water Dispensers",
    "categoryId": "water-dispensers",
    "description": "High-capacity commercial office water cooler with fast chill compressor for up to 50 persons.",
    "price": 18999,
    "customerPrice": 18999,
    "dealerPrice": 14500,
    "imageUrl": "https://m.media-amazon.com/images/I/51nplb85ROL._SX679_.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/51nplb85ROL._SX679_.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Cooling Capacity",
        "value": "20 L/hr"
      },
      {
        "label": "Storage Tank",
        "value": "20 Litres Stainless Steel"
      },
      {
        "label": "Compressor",
        "value": "Hermetically Sealed Tecumseh/Emerson"
      },
      {
        "label": "Warranty",
        "value": "1 Year Comprehensive"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Office Water Cooler product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-WD-020",
    "name": "AquaPure Compact Mini Dispenser",
    "slug": "aquapure-compact-mini-dispenser",
    "category": "Water Dispensers",
    "categoryId": "water-dispensers",
    "description": "Mini desktop dispenser with miniature 5L bottle, perfect for bedside hydration or executive workstations.",
    "price": 2499,
    "customerPrice": 2499,
    "dealerPrice": 1800,
    "imageUrl": "https://rukminim2.flixcart.com/image/1536/1536/l3hmwsw0/water-dispenser/y/o/t/9-350-mini-water-dispenser-komto-18-original-imagehgwtac5fgct.jpeg?q=90",
    "gallery": [
      "https://rukminim2.flixcart.com/image/1536/1536/l3hmwsw0/water-dispenser/y/o/t/9-350-mini-water-dispenser-komto-18-original-imagehgwtac5fgct.jpeg?q=90"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Type",
        "value": "Personal Mini Dispenser"
      },
      {
        "label": "Capacity",
        "value": "Up to 5 Litres"
      },
      {
        "label": "Dimensions",
        "value": "22 x 18 x 38 cm"
      },
      {
        "label": "Power",
        "value": "Manual gravity dispense"
      },
      {
        "label": "Warranty",
        "value": "6 Months"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Compact Mini Dispenser product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-WD-021",
    "name": "AquaPure Child-Safe Hot Water Dispenser",
    "slug": "aquapure-child-safe-hot-water-dispenser",
    "category": "Water Dispensers",
    "categoryId": "water-dispensers",
    "description": "Hot water dispenser with built-in child lock safety valve and dual thermostat boil-dry protection.",
    "price": 10999,
    "customerPrice": 10999,
    "dealerPrice": 8300,
    "imageUrl": "https://cdn1.zohoecommerce.com/product-images/ONE%2BTT-FRONT+LOOK+%281%29.png/1266016000045839436/600x600?storefront_domain=www.meshopindia.com",
    "gallery": [
      "https://cdn1.zohoecommerce.com/product-images/ONE%2BTT-FRONT+LOOK+%281%29.png/1266016000045839436/600x600?storefront_domain=www.meshopindia.com"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Hot Water Temp",
        "value": "85°C – 95°C"
      },
      {
        "label": "Heating Rate",
        "value": "5 Litres/Hour"
      },
      {
        "label": "Safety Feature",
        "value": "Dual Step Child Safety Lock"
      },
      {
        "label": "Tank Material",
        "value": "SS 304 Food Grade"
      },
      {
        "label": "Warranty",
        "value": "1 Year Warranty"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Child-Safe Hot Water Dispenser product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-WD-022",
    "name": "AquaPure Rechargeable Bottle Dispenser",
    "slug": "aquapure-rechargeable-bottle-dispenser",
    "category": "Water Dispensers",
    "categoryId": "water-dispensers",
    "description": "Portable rechargeable bottle dispenser with flexible silicone tube and Type-C fast charging port.",
    "price": 999,
    "customerPrice": 999,
    "dealerPrice": 650,
    "imageUrl": "https://rukminim2.flixcart.com/image/1536/1536/xif0q/water-dispenser/5/d/t/without-cabinet-13-5-300-premium-rechargeable-water-dispenser-original-imahhhg7wvnxc8zm.jpeg?q=90",
    "gallery": [
      "https://rukminim2.flixcart.com/image/1536/1536/xif0q/water-dispenser/5/d/t/without-cabinet-13-5-300-premium-rechargeable-water-dispenser-original-imahhhg7wvnxc8zm.jpeg?q=90"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Charging Port",
        "value": "USB Type-C"
      },
      {
        "label": "Battery Life",
        "value": "5–6 twenty-litre cans per charge"
      },
      {
        "label": "Spout Material",
        "value": "304 Stainless Steel"
      },
      {
        "label": "Warranty",
        "value": "6 Months Replacement"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Rechargeable Bottle Dispenser product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-PM-023",
    "name": "AquaPure Booster Pump 0.5 HP",
    "slug": "aquapure-booster-pump-0-5-hp",
    "category": "Water Pumps",
    "categoryId": "water-pumps",
    "description": "Domestic water pressure booster pump 0.5 HP for increasing tap flow rate to bathrooms and purifiers.",
    "price": 2499,
    "customerPrice": 2499,
    "dealerPrice": 1900,
    "imageUrl": "https://media-eshop.kirloskarpumps.com/media/catalog/product/w/e/web_banner_ord_10782_k-booster-06.jpg",
    "gallery": [
      "https://media-eshop.kirloskarpumps.com/media/catalog/product/w/e/web_banner_ord_10782_k-booster-06.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Motor Power",
        "value": "0.5 HP (370 Watts)"
      },
      {
        "label": "Max Head",
        "value": "25 Meters"
      },
      {
        "label": "Max Flow Rate",
        "value": "1800 L/hr"
      },
      {
        "label": "Winding",
        "value": "100% Pure Copper"
      },
      {
        "label": "Warranty",
        "value": "1 Year Manufacturer Warranty"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Booster Pump 0.5 HP product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-PM-024",
    "name": "AquaPure Booster Pump 1 HP",
    "slug": "aquapure-booster-pump-1-hp",
    "category": "Water Pumps",
    "categoryId": "water-pumps",
    "description": "Heavy duty 1 HP booster pump providing high water head pressure for multi-storey residential applications.",
    "price": 3999,
    "customerPrice": 3999,
    "dealerPrice": 3100,
    "imageUrl": "https://cultree.in/cdn/shop/files/21jlug9nPDL_a6a0be6c-5eb4-4288-acab-5ff8f77ddc84.jpg?v=1699311470",
    "gallery": [
      "https://cultree.in/cdn/shop/files/21jlug9nPDL_a6a0be6c-5eb4-4288-acab-5ff8f77ddc84.jpg?v=1699311470"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Motor Power",
        "value": "1.0 HP (750 Watts)"
      },
      {
        "label": "Max Head",
        "value": "38 Meters"
      },
      {
        "label": "Max Flow Rate",
        "value": "3200 L/hr"
      },
      {
        "label": "Impeller",
        "value": "Forged Brass"
      },
      {
        "label": "Warranty",
        "value": "1 Year Comprehensive"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Booster Pump 1 HP product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-PM-025",
    "name": "AquaPure RO Feed Pump 75 GPD",
    "slug": "aquapure-ro-feed-pump-75-gpd",
    "category": "Water Pumps",
    "categoryId": "water-pumps",
    "description": "Standard 75 GPD 24V DC booster diaphragm pump for domestic reverse osmosis water purification systems.",
    "price": 1299,
    "customerPrice": 1299,
    "dealerPrice": 950,
    "imageUrl": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQuiVPw0HqrgU6Wj7PknwW8syRg_n2CsH6VCZE855m-aPSzGPlTRtx_e_Q&s=10",
    "gallery": [
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQuiVPw0HqrgU6Wj7PknwW8syRg_n2CsH6VCZE855m-aPSzGPlTRtx_e_Q&s=10"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Operating Voltage",
        "value": "24V DC"
      },
      {
        "label": "Capacity",
        "value": "75 GPD"
      },
      {
        "label": "Inlet Pressure",
        "value": "30 psi"
      },
      {
        "label": "Working Pressure",
        "value": "80–120 psi"
      },
      {
        "label": "Warranty",
        "value": "1 Year Replacement"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure RO Feed Pump 75 GPD product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-PM-026",
    "name": "AquaPure RO Feed Pump 100 GPD",
    "slug": "aquapure-ro-feed-pump-100-gpd",
    "category": "Water Pumps",
    "categoryId": "water-pumps",
    "description": "High-output 100 GPD 24V/36V DC RO feed pump engineered for high-recovery domestic RO systems.",
    "price": 1599,
    "customerPrice": 1599,
    "dealerPrice": 1200,
    "imageUrl": "https://m.media-amazon.com/images/I/71OfjM-nYVL.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/71OfjM-nYVL.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Operating Voltage",
        "value": "24V – 36V DC"
      },
      {
        "label": "Capacity",
        "value": "100 GPD"
      },
      {
        "label": "Current Draw",
        "value": "1.2 Amps"
      },
      {
        "label": "Diaphragm Material",
        "value": "High Density EPDM"
      },
      {
        "label": "Warranty",
        "value": "1 Year Replacement"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure RO Feed Pump 100 GPD product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-PM-027",
    "name": "AquaPure Self-Priming Water Pump",
    "slug": "aquapure-self-priming-water-pump",
    "category": "Water Pumps",
    "categoryId": "water-pumps",
    "description": "Self-priming domestic centrifugal water pump capable of lifting water from shallow wells and underground sumps.",
    "price": 1899,
    "customerPrice": 1899,
    "dealerPrice": 1450,
    "imageUrl": "https://m.media-amazon.com/images/I/61BHqq51r+L._SL1254_.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/61BHqq51r+L._SL1254_.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Motor Power",
        "value": "0.5 HP"
      },
      {
        "label": "Suction Lift",
        "value": "Up to 8 Meters"
      },
      {
        "label": "Delivery Head",
        "value": "22 Meters"
      },
      {
        "label": "Shaft",
        "value": "Stainless Steel"
      },
      {
        "label": "Warranty",
        "value": "1 Year Warranty"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Self-Priming Water Pump product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-PM-028",
    "name": "AquaPure Mini Booster Pump",
    "slug": "aquapure-mini-booster-pump",
    "category": "Water Pumps",
    "categoryId": "water-pumps",
    "description": "Ultra-quiet 12V/24V mini inline booster pump for low water pressure taps, geysers, and compact purifiers.",
    "price": 999,
    "customerPrice": 999,
    "dealerPrice": 700,
    "imageUrl": "https://m.media-amazon.com/images/I/41zkLSz0wBL._SY445_SX342_QL70_FMwebp_.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/41zkLSz0wBL._SY445_SX342_QL70_FMwebp_.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Voltage",
        "value": "24V DC (Adapter Included)"
      },
      {
        "label": "Noise Level",
        "value": "< 30 dB Silent Operation"
      },
      {
        "label": "Max Head",
        "value": "12 Meters"
      },
      {
        "label": "Pipe Connector",
        "value": "1/2 inch BSP"
      },
      {
        "label": "Warranty",
        "value": "6 Months"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Mini Booster Pump product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-PM-029",
    "name": "AquaPure Pressure Pump Controller",
    "slug": "aquapure-pressure-pump-controller",
    "category": "Water Pumps",
    "categoryId": "water-pumps",
    "description": "Automatic digital pressure pump controller with dry-run protection and auto restart feature.",
    "price": 799,
    "customerPrice": 799,
    "dealerPrice": 550,
    "imageUrl": "https://m.media-amazon.com/images/I/610L552bjtL._AC_UL480_FMwebp_QL65_.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/610L552bjtL._AC_UL480_FMwebp_QL65_.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Input Voltage",
        "value": "220V–240V AC"
      },
      {
        "label": "Max Current",
        "value": "10 Amps"
      },
      {
        "label": "Starting Pressure",
        "value": "1.5 Bar adjustable"
      },
      {
        "label": "Protection Rating",
        "value": "IP65 Weatherproof"
      },
      {
        "label": "Warranty",
        "value": "1 Year Warranty"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Pressure Pump Controller product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-PM-030",
    "name": "AquaPure Commercial RO Pump",
    "slug": "aquapure-commercial-ro-pump",
    "category": "Water Pumps",
    "categoryId": "water-pumps",
    "description": "Industrial vertical high-pressure multistage pump for 250 to 1000 LPH commercial and industrial RO plants.",
    "price": 4999,
    "customerPrice": 4999,
    "dealerPrice": 3900,
    "imageUrl": "https://5.imimg.com/data5/OO/BS/XA/SELLER-8558800/1000-ltr-ro-plant-vertical-high-pressure-pump-500x500.jpg",
    "gallery": [
      "https://5.imimg.com/data5/OO/BS/XA/SELLER-8558800/1000-ltr-ro-plant-vertical-high-pressure-pump-500x500.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Motor Rating",
        "value": "1.5 kW / 2.0 HP"
      },
      {
        "label": "Max Operating Pressure",
        "value": "16 Bar"
      },
      {
        "label": "Flow Rate",
        "value": "2000 L/hr"
      },
      {
        "label": "Stage Material",
        "value": "AISI 304 Stainless Steel"
      },
      {
        "label": "Warranty",
        "value": "1 Year Commercial"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Commercial RO Pump product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-FC-031",
    "name": "AquaPure Sediment Filter 5 Micron",
    "slug": "aquapure-sediment-filter-5-micron",
    "category": "Filters & Cartridges",
    "categoryId": "filters-cartridges",
    "description": "High dirt-holding polypropylene melt-blown 5-micron sediment filter for pre-filtration stage.",
    "price": 299,
    "customerPrice": 299,
    "dealerPrice": 200,
    "imageUrl": "https://m.media-amazon.com/images/I/81mzqsNoleL._AC_UF894,1000_QL80_.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/81mzqsNoleL._AC_UF894,1000_QL80_.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Micron Rating",
        "value": "5 Micron"
      },
      {
        "label": "Length",
        "value": "10 Inch Universal"
      },
      {
        "label": "Filter Media",
        "value": "100% Spun Polypropylene"
      },
      {
        "label": "Replacement Cycle",
        "value": "3 to 6 Months"
      },
      {
        "label": "Compatibility",
        "value": "Universal 10\" Pre-Filter Bowls"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Sediment Filter 5 Micron product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-FC-032",
    "name": "AquaPure Sediment Filter 1 Micron",
    "slug": "aquapure-sediment-filter-1-micron",
    "category": "Filters & Cartridges",
    "categoryId": "filters-cartridges",
    "description": "Fine 1-micron spun sediment filter for trapping micro-particulates, rust flakes, and fine silt.",
    "price": 349,
    "customerPrice": 349,
    "dealerPrice": 240,
    "imageUrl": "https://m.media-amazon.com/images/I/71K4NO9-xaL.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/71K4NO9-xaL.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Micron Rating",
        "value": "1 Micron Ultra-Fine"
      },
      {
        "label": "Length",
        "value": "10 Inch Universal"
      },
      {
        "label": "Efficiency",
        "value": "98% Particle Retention"
      },
      {
        "label": "Replacement Cycle",
        "value": "3 to 6 Months"
      },
      {
        "label": "Compatibility",
        "value": "Standard 10\" Housings"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Sediment Filter 1 Micron product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-FC-033",
    "name": "AquaPure Activated Carbon Filter",
    "slug": "aquapure-activated-carbon-filter",
    "category": "Filters & Cartridges",
    "categoryId": "filters-cartridges",
    "description": "Premium coconut shell activated carbon filter cartridge for absorbing chlorine, volatile organic compounds, and odors.",
    "price": 399,
    "customerPrice": 399,
    "dealerPrice": 270,
    "imageUrl": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTb7ns36UbIP1rzpwj95bp6-Cgnn2c3eYgeKMM1zbxw_A&s=10",
    "gallery": [
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTb7ns36UbIP1rzpwj95bp6-Cgnn2c3eYgeKMM1zbxw_A&s=10"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Material",
        "value": "High Iodine Coconut Shell Carbon"
      },
      {
        "label": "Iodine Value",
        "value": "1100 mg/g"
      },
      {
        "label": "Length",
        "value": "10 Inch Universal"
      },
      {
        "label": "Service Life",
        "value": "6000 Litres"
      },
      {
        "label": "Compatibility",
        "value": "Universal RO Systems"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Activated Carbon Filter product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-FC-034",
    "name": "AquaPure Carbon Block CTO Filter",
    "slug": "aquapure-carbon-block-cto-filter",
    "category": "Filters & Cartridges",
    "categoryId": "filters-cartridges",
    "description": "Solid extruded carbon block CTO filter for deep chlorine adsorption and taste refinement.",
    "price": 449,
    "customerPrice": 449,
    "dealerPrice": 310,
    "imageUrl": "https://m.media-amazon.com/images/I/71Be4JNBexL._AC_UF894,1000_QL80_.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/71Be4JNBexL._AC_UF894,1000_QL80_.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Filter Type",
        "value": "Extruded Carbon Block CTO"
      },
      {
        "label": "Micron Rating",
        "value": "5 Micron"
      },
      {
        "label": "Chlorine Reduction",
        "value": "> 95%"
      },
      {
        "label": "Lifespan",
        "value": "Up to 6 Months"
      },
      {
        "label": "Compatibility",
        "value": "Universal 10\" Housing"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Carbon Block CTO Filter product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-FC-035",
    "name": "AquaPure GAC Filter Cartridge",
    "slug": "aquapure-gac-filter-cartridge",
    "category": "Filters & Cartridges",
    "categoryId": "filters-cartridges",
    "description": "Granular Activated Carbon (GAC) cartridge with internal expansion pad preventing channeling of water.",
    "price": 399,
    "customerPrice": 399,
    "dealerPrice": 270,
    "imageUrl": "https://m.media-amazon.com/images/I/712-OX53OrL._AC_UF894,1000_QL80_.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/712-OX53OrL._AC_UF894,1000_QL80_.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Filter Type",
        "value": "Granular Activated Carbon"
      },
      {
        "label": "Media",
        "value": "Acid-washed Coconut Carbon"
      },
      {
        "label": "Operating Temp",
        "value": "4°C – 45°C"
      },
      {
        "label": "Replacement Cycle",
        "value": "6 Months"
      },
      {
        "label": "Compatibility",
        "value": "All 10\" Purifiers"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure GAC Filter Cartridge product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-FC-036",
    "name": "AquaPure RO Membrane 75 GPD",
    "slug": "aquapure-ro-membrane-75-gpd",
    "category": "Filters & Cartridges",
    "categoryId": "filters-cartridges",
    "description": "High-rejection thin film composite (TFC) RO membrane element producing up to 75 gallons per day.",
    "price": 999,
    "customerPrice": 999,
    "dealerPrice": 720,
    "imageUrl": "https://rukmini1.flixcart.com/image/1500/1500/xif0q/water-filter-cartridge/e/c/s/3-75-gpd-ro-membrane-for-all-type-of-ro-water-purifiers-gold-original-imahgafmdjc3gxux.jpeg?q=70",
    "gallery": [
      "https://rukmini1.flixcart.com/image/1500/1500/xif0q/water-filter-cartridge/e/c/s/3-75-gpd-ro-membrane-for-all-type-of-ro-water-purifiers-gold-original-imahgafmdjc3gxux.jpeg?q=70"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Capacity",
        "value": "75 GPD (~12 L/hr)"
      },
      {
        "label": "Stabilized Rejection",
        "value": "97%"
      },
      {
        "label": "Max Input TDS",
        "value": "2000 ppm"
      },
      {
        "label": "Element Type",
        "value": "Polyamide Thin-Film Composite"
      },
      {
        "label": "Warranty",
        "value": "1 Year Performance"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure RO Membrane 75 GPD product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-FC-037",
    "name": "AquaPure RO Membrane 100 GPD",
    "slug": "aquapure-ro-membrane-100-gpd",
    "category": "Filters & Cartridges",
    "categoryId": "filters-cartridges",
    "description": "Heavy-duty 100 GPD thin film membrane for fast flow and high recovery across high TDS borewell supplies.",
    "price": 1299,
    "customerPrice": 1299,
    "dealerPrice": 950,
    "imageUrl": "https://rukmini1.flixcart.com/image/1500/1500/xif0q/water-filter-cartridge/j/4/m/5-100-gpd-ro-membrane-compatible-with-all-domestic-water-original-imahhqjffbkxnb46.jpeg?q=70",
    "gallery": [
      "https://rukmini1.flixcart.com/image/1500/1500/xif0q/water-filter-cartridge/j/4/m/5-100-gpd-ro-membrane-compatible-with-all-domestic-water-original-imahhqjffbkxnb46.jpeg?q=70"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Capacity",
        "value": "100 GPD (~16 L/hr)"
      },
      {
        "label": "Stabilized Rejection",
        "value": "98%"
      },
      {
        "label": "Max Input TDS",
        "value": "2500 ppm"
      },
      {
        "label": "Membrane Sheet",
        "value": "Imported Polyamide"
      },
      {
        "label": "Warranty",
        "value": "1 Year Performance"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure RO Membrane 100 GPD product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-FC-038",
    "name": "AquaPure Post Carbon Filter",
    "slug": "aquapure-post-carbon-filter",
    "category": "Filters & Cartridges",
    "categoryId": "filters-cartridges",
    "description": "Polishing post carbon inline filter cartridge delivering crisp, natural spring water taste.",
    "price": 349,
    "customerPrice": 349,
    "dealerPrice": 240,
    "imageUrl": "https://rukminim3.flixcart.com/image/480/640/xif0q/water-filter-cartridge/9/o/v/4-inline-filter-set-of-sediment-pre-post-carbon-cartridge-for-ro-original-imahj2cvrrxnca8p.jpeg?q=80",
    "gallery": [
      "https://rukminim3.flixcart.com/image/480/640/xif0q/water-filter-cartridge/9/o/v/4-inline-filter-set-of-sediment-pre-post-carbon-cartridge-for-ro-original-imahj2cvrrxnca8p.jpeg?q=80"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Type",
        "value": "Post Carbon Inline (T33)"
      },
      {
        "label": "Connection",
        "value": "1/4\" Quick Connect"
      },
      {
        "label": "Media",
        "value": "Bacteriostatic Silver-impregnated Carbon"
      },
      {
        "label": "Lifespan",
        "value": "12 Months"
      },
      {
        "label": "Compatibility",
        "value": "Universal Inline RO"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Post Carbon Filter product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-FC-039",
    "name": "AquaPure Mineral Cartridge",
    "slug": "aquapure-mineral-cartridge",
    "category": "Filters & Cartridges",
    "categoryId": "filters-cartridges",
    "description": "Post-RO mineralizer cartridge restoring balanced calcium, magnesium, sodium, and potassium trace minerals.",
    "price": 499,
    "customerPrice": 499,
    "dealerPrice": 350,
    "imageUrl": "https://m.media-amazon.com/images/I/71laApDXJJL._AC_UY327_FMwebp_QL65_.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/71laApDXJJL._AC_UY327_FMwebp_QL65_.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Active Minerals",
        "value": "Ca, Mg, K, Na Minerals"
      },
      {
        "label": "Connection",
        "value": "1/4\" Quick Push Fit"
      },
      {
        "label": "Lifespan",
        "value": "12 Months / 6000 Litres"
      },
      {
        "label": "Benefits",
        "value": "Replenishes Essential Trace Elements"
      },
      {
        "label": "Compatibility",
        "value": "All Domestic RO Systems"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Mineral Cartridge product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-FC-040",
    "name": "AquaPure Alkaline Cartridge",
    "slug": "aquapure-alkaline-cartridge",
    "category": "Filters & Cartridges",
    "categoryId": "filters-cartridges",
    "description": "Alkaline mineralizer filter balancing water pH to 8.0 - 8.5 with negative ORP antioxidant properties.",
    "price": 599,
    "customerPrice": 599,
    "dealerPrice": 420,
    "imageUrl": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTpfn7FbMV03vaS5xhQFzz2nsduvnFMDR5FNVN-nX19Mf9TPPQvA3Z6zn1U&s=10",
    "gallery": [
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTpfn7FbMV03vaS5xhQFzz2nsduvnFMDR5FNVN-nX19Mf9TPPQvA3Z6zn1U&s=10"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "pH Range",
        "value": "8.0 – 8.5 pH"
      },
      {
        "label": "ORP Reduction",
        "value": "-100 mV to -200 mV"
      },
      {
        "label": "Connection",
        "value": "1/4\" Inline Quick-Fit"
      },
      {
        "label": "Lifespan",
        "value": "12 Months"
      },
      {
        "label": "Compatibility",
        "value": "Universal RO Units"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Alkaline Cartridge product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-FC-041",
    "name": "AquaPure Copper Infusion Cartridge",
    "slug": "aquapure-copper-infusion-cartridge",
    "category": "Filters & Cartridges",
    "categoryId": "filters-cartridges",
    "description": "Pure copper mineral infusion cartridge releasing ionic copper trace minerals for Ayurvedic wellness benefits.",
    "price": 699,
    "customerPrice": 699,
    "dealerPrice": 490,
    "imageUrl": "https://m.media-amazon.com/images/I/61owCDSJ+tL._AC_UF894,1000_QL80_.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/61owCDSJ+tL._AC_UF894,1000_QL80_.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Active Media",
        "value": "99.9% Pure Active Copper Beads"
      },
      {
        "label": "Copper Enrichment",
        "value": "Conforms to IS 10500 standards"
      },
      {
        "label": "Connection",
        "value": "1/4\" Quick Connector"
      },
      {
        "label": "Lifespan",
        "value": "12 Months"
      },
      {
        "label": "Compatibility",
        "value": "All Domestic RO Purifiers"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Copper Infusion Cartridge product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-FC-042",
    "name": "AquaPure UF Membrane Cartridge",
    "slug": "aquapure-uf-membrane-cartridge",
    "category": "Filters & Cartridges",
    "categoryId": "filters-cartridges",
    "description": "Ultra-filtration hollow-fiber membrane cartridge with 0.01 micron pore size blocking 99.99% bacteria & cysts.",
    "price": 599,
    "customerPrice": 599,
    "dealerPrice": 420,
    "imageUrl": "https://m.media-amazon.com/images/I/71SpHcG5sjL._AC_UF894,1000_QL80_.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/71SpHcG5sjL._AC_UF894,1000_QL80_.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Pore Size",
        "value": "0.01 Micron"
      },
      {
        "label": "Membrane Type",
        "value": "Hydrophilic Hollow Fiber"
      },
      {
        "label": "Connection",
        "value": "1/4\" Quick Connect"
      },
      {
        "label": "Lifespan",
        "value": "12 Months"
      },
      {
        "label": "Compatibility",
        "value": "Universal RO & UF Purifiers"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure UF Membrane Cartridge product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-SP-043",
    "name": "AquaPure Chrome RO Faucet",
    "slug": "aquapure-chrome-ro-faucet",
    "category": "Spare Parts & Accessories",
    "categoryId": "spare-parts-accessories",
    "description": "Solid brass lead-free gooseneck RO faucet with lustrous triple-plated chrome finish and ceramic disc valve.",
    "price": 499,
    "customerPrice": 499,
    "dealerPrice": 350,
    "imageUrl": "https://m.media-amazon.com/images/I/51yzHeeEuyL.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/51yzHeeEuyL.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Material",
        "value": "Lead-Free Solid Brass"
      },
      {
        "label": "Finish",
        "value": "Chrome Plated Mirror"
      },
      {
        "label": "Valve Core",
        "value": "Ceramic Disc Cartridge (50,000 cycles)"
      },
      {
        "label": "Connection",
        "value": "1/4\" Tubing Push Fit"
      },
      {
        "label": "Warranty",
        "value": "1 Year Warranty"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Chrome RO Faucet product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-SP-044",
    "name": "AquaPure Filter Housing 10 Inch",
    "slug": "aquapure-filter-housing-10-inch",
    "category": "Spare Parts & Accessories",
    "categoryId": "spare-parts-accessories",
    "description": "Heavy-duty 10-inch pre-filter bowl housing with reinforced ribbed cap and leak-proof double O-ring seal.",
    "price": 399,
    "customerPrice": 399,
    "dealerPrice": 270,
    "imageUrl": "https://m.media-amazon.com/images/I/61GRSAFOiKL._AC_UF1000,1000_QL80_.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/61GRSAFOiKL._AC_UF1000,1000_QL80_.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Size",
        "value": "10 Inch Standard"
      },
      {
        "label": "Port Size",
        "value": "1/4\" or 3/8\" BSP Brass Inserts"
      },
      {
        "label": "Max Pressure",
        "value": "125 psi"
      },
      {
        "label": "Material",
        "value": "Food-grade Virgin Polypropylene"
      },
      {
        "label": "Accessories",
        "value": "Spanner Wrench Included"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Filter Housing 10 Inch product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-SP-045",
    "name": "AquaPure RO Storage Tank",
    "slug": "aquapure-ro-storage-tank",
    "category": "Spare Parts & Accessories",
    "categoryId": "spare-parts-accessories",
    "description": "Food-grade pressurized bladder storage tank for under-counter and cabinet reverse osmosis systems.",
    "price": 1499,
    "customerPrice": 1499,
    "dealerPrice": 1100,
    "imageUrl": "https://m.media-amazon.com/images/I/51mg1GXNHjL.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/51mg1GXNHjL.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Total Volume",
        "value": "3.2 Gallons (~12 Litres)"
      },
      {
        "label": "Usable Water",
        "value": "8–10 Litres"
      },
      {
        "label": "Internal Bladder",
        "value": "Food Grade Chlorobutyl Rubber"
      },
      {
        "label": "Pre-charge Pressure",
        "value": "7 psi"
      },
      {
        "label": "Warranty",
        "value": "1 Year Tank Warranty"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure RO Storage Tank product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-SP-046",
    "name": "AquaPure Food-Grade RO Tubing",
    "slug": "aquapure-food-grade-ro-tubing",
    "category": "Spare Parts & Accessories",
    "categoryId": "spare-parts-accessories",
    "description": "NSF-certified 1/4\" food-grade flexible LLDPE tubing roll for all domestic and commercial water purifiers.",
    "price": 199,
    "customerPrice": 199,
    "dealerPrice": 130,
    "imageUrl": "https://m.media-amazon.com/images/I/71rSC7YYKbL._AC_UF894,1000_QL80_.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/71rSC7YYKbL._AC_UF894,1000_QL80_.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Outer Diameter",
        "value": "1/4 Inch (6.35 mm)"
      },
      {
        "label": "Length",
        "value": "10 Meters Pack"
      },
      {
        "label": "Material",
        "value": "FDA Approved LLDPE"
      },
      {
        "label": "Burst Pressure",
        "value": "230 psi at 20°C"
      },
      {
        "label": "Color",
        "value": "Pure White"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Food-Grade RO Tubing product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-SP-047",
    "name": "AquaPure Quick Connect Fittings Kit",
    "slug": "aquapure-quick-connect-fittings-kit",
    "category": "Spare Parts & Accessories",
    "categoryId": "spare-parts-accessories",
    "description": "Comprehensive 20-piece kit containing elbows, tees, straight unions, check valves, and bulkhead fittings.",
    "price": 299,
    "customerPrice": 299,
    "dealerPrice": 200,
    "imageUrl": "https://m.media-amazon.com/images/I/71rhmRZA8uL.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/71rhmRZA8uL.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Kit Contents",
        "value": "20 Quick Connect Fittings"
      },
      {
        "label": "Sizes",
        "value": "1/4\" Push-Fit Universal"
      },
      {
        "label": "Material",
        "value": "Food-grade POM Polyoxymethylene"
      },
      {
        "label": "Locking System",
        "value": "Stainless Steel Collet Teeth"
      },
      {
        "label": "Leak Proofing",
        "value": "Dual EPDM O-Rings"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Quick Connect Fittings Kit product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-SP-048",
    "name": "AquaPure UV Lamp Replacement",
    "slug": "aquapure-uv-lamp-replacement",
    "category": "Spare Parts & Accessories",
    "categoryId": "spare-parts-accessories",
    "description": "High-output 11W 4-pin germicidal ultraviolet lamp replacement for in-tank and inline UV chambers.",
    "price": 799,
    "customerPrice": 799,
    "dealerPrice": 560,
    "imageUrl": "https://m.media-amazon.com/images/I/41A0rzcAH+L._SX342_SY445_QL70_FMwebp_.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/41A0rzcAH+L._SX342_SY445_QL70_FMwebp_.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Power",
        "value": "11 Watts"
      },
      {
        "label": "Wavelength",
        "value": "254 nm UV-C Peak Germicidal"
      },
      {
        "label": "Base",
        "value": "4-Pin Single Ended"
      },
      {
        "label": "Rated Life",
        "value": "9000 Operating Hours"
      },
      {
        "label": "Warranty",
        "value": "6 Months Replacement"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure UV Lamp Replacement product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-SP-049",
    "name": "AquaPure SMPS Power Adapter",
    "slug": "aquapure-smps-power-adapter",
    "category": "Spare Parts & Accessories",
    "categoryId": "spare-parts-accessories",
    "description": "Short-circuit and surge protected 24V 2.5A SMPS switch mode power supply adapter for RO booster pumps.",
    "price": 699,
    "customerPrice": 699,
    "dealerPrice": 480,
    "imageUrl": "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcTDMkOo0xBb4_owSSXJT2KCRC9BrUrpoYuPGZ3ywOI5yN5Q9Uom9NTY9lDdOa-7S_YAp_CkXnHkiPcks1hIoFmhWA6O77s5UiHTdtYoDaIOr8XOjz76X1kfh8g",
    "gallery": [
      "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcTDMkOo0xBb4_owSSXJT2KCRC9BrUrpoYuPGZ3ywOI5yN5Q9Uom9NTY9lDdOa-7S_YAp_CkXnHkiPcks1hIoFmhWA6O77s5UiHTdtYoDaIOr8XOjz76X1kfh8g"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Input Voltage",
        "value": "140V – 300V AC"
      },
      {
        "label": "Output Voltage",
        "value": "24V DC / 2.5 Amps"
      },
      {
        "label": "Protection",
        "value": "Surge, Overvoltage, Short Circuit"
      },
      {
        "label": "Casing",
        "value": "Flame Retardant ABS"
      },
      {
        "label": "Warranty",
        "value": "1 Year Replacement"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure SMPS Power Adapter product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-SP-050",
    "name": "AquaPure Digital TDS Meter",
    "slug": "aquapure-digital-tds-meter",
    "category": "Spare Parts & Accessories",
    "categoryId": "spare-parts-accessories",
    "description": "Pocket digital TDS meter with auto temperature compensation (ATC) and backlit LCD readout for testing purity.",
    "price": 399,
    "customerPrice": 399,
    "dealerPrice": 270,
    "imageUrl": "https://m.media-amazon.com/images/I/51e5Y35UW4L._AC_UF1000,1000_QL80_.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/51e5Y35UW4L._AC_UF1000,1000_QL80_.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Measurement Range",
        "value": "0 – 9990 ppm"
      },
      {
        "label": "Accuracy",
        "value": "± 2%"
      },
      {
        "label": "Display",
        "value": "Digital Backlit LCD with Hold Button"
      },
      {
        "label": "Battery",
        "value": "2 x 1.5V Button Cells (Included)"
      },
      {
        "label": "Warranty",
        "value": "1 Year Warranty"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Digital TDS Meter product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-SP-051",
    "name": "AquaPure Float Valve Assembly",
    "slug": "aquapure-float-valve-assembly",
    "category": "Spare Parts & Accessories",
    "categoryId": "spare-parts-accessories",
    "description": "Micro-switch float valve assembly for automatic pump shutoff when water storage tank reaches full capacity.",
    "price": 249,
    "customerPrice": 249,
    "dealerPrice": 170,
    "imageUrl": "https://aquascaping.in/cdn/shop/products/2_8720a444-62ce-4d60-b1d8-434957c40196_900x.png?v=1715330067",
    "gallery": [
      "https://aquascaping.in/cdn/shop/products/2_8720a444-62ce-4d60-b1d8-434957c40196_900x.png?v=1715330067"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Type",
        "value": "Electrical Micro-Switch Float Valve"
      },
      {
        "label": "Current Rating",
        "value": "5 Amps 250V AC"
      },
      {
        "label": "Wire Length",
        "value": "1 Meter"
      },
      {
        "label": "Material",
        "value": "Non-Toxic Food Grade PP"
      },
      {
        "label": "Warranty",
        "value": "6 Months"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Float Valve Assembly product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-SP-052",
    "name": "AquaPure Leak Protection Kit",
    "slug": "aquapure-leak-protection-kit",
    "category": "Spare Parts & Accessories",
    "categoryId": "spare-parts-accessories",
    "description": "Automated mechanical leak detector shutoff valve that interrupts feed water supply in event of moisture detection.",
    "price": 899,
    "customerPrice": 899,
    "dealerPrice": 650,
    "imageUrl": "https://m.media-amazon.com/images/I/61pG2t6JJEL._AC_UF1000,1000_QL80_.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/61pG2t6JJEL._AC_UF1000,1000_QL80_.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Type",
        "value": "Mechanical Moisture Expanding Valve"
      },
      {
        "label": "Inlet/Outlet",
        "value": "1/4\" Quick Connect"
      },
      {
        "label": "Response Time",
        "value": "< 60 Seconds upon contact with water"
      },
      {
        "label": "Pad Replacement",
        "value": "2 Expandable Sponges Included"
      },
      {
        "label": "Warranty",
        "value": "1 Year Warranty"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Leak Protection Kit product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-BS-053",
    "name": "AquaPure Stainless Steel Bottle 750 ml",
    "slug": "aquapure-stainless-steel-bottle-750-ml",
    "category": "Bottles & Storage",
    "categoryId": "bottles-storage",
    "description": "Ergonomic 750 ml single-wall 304 stainless steel bottle for everyday hydration, leakproof twist cap.",
    "price": 499,
    "customerPrice": 499,
    "dealerPrice": 350,
    "imageUrl": "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcTJMNiWe2IpZXrRhHxXwYi9tTlM-xEYKR1qKIGl255h6B_U126iox8Ip4wP1W8lhWXbcyd09T_mkUpHlYg2IY5mQyeJqjlJFpQLrJzA4l8BGkQ1rkucdNmmCb223GkL4uG26iAcoQ&usqp=CAc",
    "gallery": [
      "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcTJMNiWe2IpZXrRhHxXwYi9tTlM-xEYKR1qKIGl255h6B_U126iox8Ip4wP1W8lhWXbcyd09T_mkUpHlYg2IY5mQyeJqjlJFpQLrJzA4l8BGkQ1rkucdNmmCb223GkL4uG26iAcoQ&usqp=CAc"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Capacity",
        "value": "750 ml"
      },
      {
        "label": "Material",
        "value": "SS 304 Food Grade Stainless Steel"
      },
      {
        "label": "Cap Type",
        "value": "Airtight Leakproof Stainless Cap"
      },
      {
        "label": "BPA Free",
        "value": "100% BPA Free & Non-toxic"
      },
      {
        "label": "Warranty",
        "value": "1 Year Warranty"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Stainless Steel Bottle 750 ml product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-BS-054",
    "name": "AquaPure Insulated Bottle 1 Litre",
    "slug": "aquapure-insulated-bottle-1-litre",
    "category": "Bottles & Storage",
    "categoryId": "bottles-storage",
    "description": "Double-wall vacuum insulated 1000 ml thermo flask keeping beverages cold for 24 hours or hot for 12 hours.",
    "price": 799,
    "customerPrice": 799,
    "dealerPrice": 560,
    "imageUrl": "https://m.media-amazon.com/images/I/81KrnHiiIHL.jpg",
    "gallery": [
      "https://m.media-amazon.com/images/I/81KrnHiiIHL.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Capacity",
        "value": "1000 ml (1 Litre)"
      },
      {
        "label": "Insulation",
        "value": "Double-Wall Vacuum Insulation"
      },
      {
        "label": "Thermal Retention",
        "value": "Cold 24 hrs | Hot 12 hrs"
      },
      {
        "label": "Exterior",
        "value": "Sweat-free Powder Coat Finish"
      },
      {
        "label": "Warranty",
        "value": "1 Year Warranty"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Insulated Bottle 1 Litre product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-BS-055",
    "name": "AquaPure Reusable Sports Bottle",
    "slug": "aquapure-reusable-sports-bottle",
    "category": "Bottles & Storage",
    "categoryId": "bottles-storage",
    "description": "Shatter-proof reusable sports gym bottle with one-click flip top lid, motivational time markers, and straw.",
    "price": 299,
    "customerPrice": 299,
    "dealerPrice": 200,
    "imageUrl": "https://rukmini1.flixcart.com/image/1500/1500/xif0q/bottle/5/d/t/1000-reusable-sports-bottle-with-secure-lock-lid-and-straw-1-original-imahzfknvnuhdhzf.jpeg?q=70",
    "gallery": [
      "https://rukmini1.flixcart.com/image/1500/1500/xif0q/bottle/5/d/t/1000-reusable-sports-bottle-with-secure-lock-lid-and-straw-1-original-imahzfknvnuhdhzf.jpeg?q=70"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Capacity",
        "value": "1000 ml"
      },
      {
        "label": "Material",
        "value": "BPA-Free Eastman Tritan Plastic"
      },
      {
        "label": "Lid",
        "value": "One-Click Flip Top with Safety Lock"
      },
      {
        "label": "Carry Strap",
        "value": "Durable Nylon Lanyard Included"
      },
      {
        "label": "Warranty",
        "value": "6 Months"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Reusable Sports Bottle product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-BS-056",
    "name": "AquaPure Water Can 10 Litre",
    "slug": "aquapure-water-can-10-litre",
    "category": "Bottles & Storage",
    "categoryId": "bottles-storage",
    "description": "Portable 10-litre water storage container with ergonomic carry handle and built-in screw-on pour tap.",
    "price": 399,
    "customerPrice": 399,
    "dealerPrice": 280,
    "imageUrl": "https://rukmini1.flixcart.com/image/1500/1500/xif0q/storage-drum/v/o/h/1-10-l-camping-water-container-portable-camping-can-water-can-original-imahhqv6yjhgc8ua.jpeg?q=70",
    "gallery": [
      "https://rukmini1.flixcart.com/image/1500/1500/xif0q/storage-drum/v/o/h/1-10-l-camping-water-container-portable-camping-can-water-can-original-imahhqv6yjhgc8ua.jpeg?q=70"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Capacity",
        "value": "10 Litres"
      },
      {
        "label": "Material",
        "value": "High-Density Food Grade Polyethylene"
      },
      {
        "label": "Dispense Tap",
        "value": "Controlled Flow Spigot Included"
      },
      {
        "label": "Portability",
        "value": "Molded Sturdy Top Handle"
      },
      {
        "label": "Warranty",
        "value": "1 Year"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Water Can 10 Litre product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-BS-057",
    "name": "AquaPure Water Can 20 Litre",
    "slug": "aquapure-water-can-20-litre",
    "category": "Bottles & Storage",
    "categoryId": "bottles-storage",
    "description": "Heavy-duty 20-litre transparent blue polycarbonate water jar with crown neck, compatible with all dispensers.",
    "price": 599,
    "customerPrice": 599,
    "dealerPrice": 420,
    "imageUrl": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQn5gnVzhUWN-U-3PEywOWpT4CiVKGclpmK2G9cv-xcKQ&s",
    "gallery": [
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQn5gnVzhUWN-U-3PEywOWpT4CiVKGclpmK2G9cv-xcKQ&s"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Capacity",
        "value": "20 Litres"
      },
      {
        "label": "Material",
        "value": "Unbreakable Food Grade Polycarbonate"
      },
      {
        "label": "Neck Finish",
        "value": "Standard 55mm Crown Neck"
      },
      {
        "label": "Handle",
        "value": "Integrated Ergonomic Side Handle"
      },
      {
        "label": "Warranty",
        "value": "1 Year Warranty"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Water Can 20 Litre product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-BS-058",
    "name": "AquaPure Dispenser Bottle 20 Litre",
    "slug": "aquapure-dispenser-bottle-20-litre",
    "category": "Bottles & Storage",
    "categoryId": "bottles-storage",
    "description": "20-litre dispenser bottle equipped with pre-fitted fast-flow push tap for direct countertop dispensing.",
    "price": 699,
    "customerPrice": 699,
    "dealerPrice": 490,
    "imageUrl": "https://rukminim3.flixcart.com/image/480/640/xif0q/storage-drum/d/g/o/1-plastic-water-bottle-20-liters-water-container-with-tap-with-enriched-2-original-imaghmdfpnzny6n9.jpeg?q=90",
    "gallery": [
      "https://rukminim3.flixcart.com/image/480/640/xif0q/storage-drum/d/g/o/1-plastic-water-bottle-20-liters-water-container-with-tap-with-enriched-2-original-imaghmdfpnzny6n9.jpeg?q=90"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Capacity",
        "value": "20 Litres"
      },
      {
        "label": "Dispense Mechanism",
        "value": "Pre-installed Leakproof Push Tap"
      },
      {
        "label": "Material",
        "value": "BPA-Free Food Grade Plastic"
      },
      {
        "label": "Lid",
        "value": "Airtight Wide Mouth Refill Cap"
      },
      {
        "label": "Warranty",
        "value": "1 Year"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Dispenser Bottle 20 Litre product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-BS-059",
    "name": "AquaPure RO Storage Tank 8 Litre",
    "slug": "aquapure-ro-storage-tank-8-litre",
    "category": "Bottles & Storage",
    "categoryId": "bottles-storage",
    "description": "Compact 8-litre pressurized hydro-pneumatic storage tank for tight under-sink RO purifier installations.",
    "price": 1799,
    "customerPrice": 1799,
    "dealerPrice": 1350,
    "imageUrl": "https://5.imimg.com/data5/SELLER/Default/2022/9/TL/SX/YZ/4228817/ro-water-pressure-storage-tank-500x500.jpg",
    "gallery": [
      "https://5.imimg.com/data5/SELLER/Default/2022/9/TL/SX/YZ/4228817/ro-water-pressure-storage-tank-500x500.jpg"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Total Capacity",
        "value": "8 Litres"
      },
      {
        "label": "Usable Storage",
        "value": "5.5–6 Litres"
      },
      {
        "label": "Lining",
        "value": "Polypropylene Inner Liner"
      },
      {
        "label": "Air Valve",
        "value": "Standard Schrader Pre-charge Valve"
      },
      {
        "label": "Warranty",
        "value": "1 Year Warranty"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure RO Storage Tank 8 Litre product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  },
  {
    "id": "AP-BS-060",
    "name": "AquaPure Water Jug with Tap",
    "slug": "aquapure-water-jug-with-tap",
    "category": "Bottles & Storage",
    "categoryId": "bottles-storage",
    "description": "Tabletop insulated water jug with push-button tap, wide opening for ice cubes, and fold-down handle.",
    "price": 449,
    "customerPrice": 449,
    "dealerPrice": 310,
    "imageUrl": "https://deodap.in/cdn/shop/files/26319-01.jpg?v=1791782844",
    "gallery": [
      "https://deodap.in/cdn/shop/files/26319-01.jpg?v=1791782844"
    ],
    "stock": 25,
    "stockStatus": "in_stock",
    "specifications": [
      {
        "label": "Capacity",
        "value": "5 Litres"
      },
      {
        "label": "Insulation",
        "value": "PUF High Density Insulation"
      },
      {
        "label": "Tap",
        "value": "Smooth Push Dispenser Tap"
      },
      {
        "label": "Lid",
        "value": "Wide Mouth Screw Lid with Handle"
      },
      {
        "label": "Warranty",
        "value": "1 Year Warranty"
      }
    ],
    "active": true,
    "imageSearchQuery": "AquaPure Water Jug with Tap product photo white background",
    "imageNote": "Add a verified, matching product image URL before publishing. Prices are illustrative demo values; verify before use.",
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  }
];

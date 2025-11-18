/**
 * Virtual Background Preset Images
 * 76 curated backgrounds across 9 categories
 */

export interface VBGPreset {
  name: string;
  url: string;
  category: string;
  emoji: string;
}

export const PRESET_BACKGROUNDS: VBGPreset[] = [
  // === VĂN PHÒNG / OFFICE (7) ===
  { name: 'Modern Office Space', url: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=1920&q=80', category: 'Office', emoji: '🏢' },
  { name: 'Bright Office', url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1920&q=80', category: 'Office', emoji: '☀️' },
  { name: 'Designer Workspace', url: 'https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=1920&q=80', category: 'Office', emoji: '🎨' },
  { name: 'Creative Office', url: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=1920&q=80', category: 'Office', emoji: '💡' },
  { name: 'Corporate Meeting Room', url: 'https://images.unsplash.com/photo-1571624436279-b272aff752b5?w=1920&q=80', category: 'Office', emoji: '📊' },
  { name: 'Office Window View', url: 'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=1920&q=80', category: 'Office', emoji: '🪟' },
  { name: 'Tech Office', url: 'https://images.unsplash.com/photo-1606836576983-8b458e75221d?w=1920&q=80', category: 'Office', emoji: '⚙️' },

  // === LỚP HỌC / EDUCATION (6) ===
  { name: 'Modern Classroom', url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1920&q=80', category: 'Education', emoji: '🏫' },
  { name: 'Lecture Hall', url: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=1920&q=80', category: 'Education', emoji: '🎓' },
  { name: 'Training Room', url: 'https://images.unsplash.com/photo-1617721926586-4eecce739745?w=1920&q=80', category: 'Education', emoji: '📋' },
  { name: 'Study Space', url: 'https://images.unsplash.com/photo-1576961453646-b4c376c7021b?w=1920&q=80', category: 'Education', emoji: '📝' },
  { name: 'Conference Room', url: 'https://images.unsplash.com/photo-1635424239131-32dc44986b56?w=1920&q=80', category: 'Education', emoji: '🎤' },
  { name: 'Workshop Space', url: 'https://images.unsplash.com/photo-1606761568499-6d2451b23c66?w=1920&q=80', category: 'Education', emoji: '🛠️' },

  // === THƯ VIỆN / LIBRARY (7) ===
  { name: 'Classic Library', url: 'https://images.unsplash.com/photo-1600431521340-491eca880813?w=1920&q=80', category: 'Library', emoji: '📚' },
  { name: 'Reading Room', url: 'https://images.unsplash.com/photo-1588581939864-064d42ace7cd?w=1920&q=80', category: 'Library', emoji: '📗' },
  { name: 'Modern Library', url: 'https://images.unsplash.com/photo-1602722053020-af31042989d5?w=1920&q=80', category: 'Library', emoji: '🏛️' },
  { name: 'Academic Library', url: 'https://images.unsplash.com/photo-1507738978512-35798112892c?w=1920&q=80', category: 'Library', emoji: '🎓' },
  { name: 'Study Library', url: 'https://images.unsplash.com/photo-1569511166187-97eb6e387e19?w=1920&q=80', category: 'Library', emoji: '✍️' },
  { name: 'Bright Library', url: 'https://images.unsplash.com/photo-1709924168698-620ea32c3488?w=1920&q=80', category: 'Library', emoji: '💡' },
  { name: 'Book Collection', url: 'https://images.unsplash.com/photo-1670228260388-c5e536d0001c?w=1920&q=80', category: 'Library', emoji: '📗' },

  // === TỦ SÁCH / BOOKSHELF (7) ===
  { name: 'Wooden Bookshelf', url: 'https://images.unsplash.com/photo-1543248939-4296e1fea89b?w=1920&q=80', category: 'Bookshelf', emoji: '📚' },
  { name: 'Classic Books', url: 'https://images.unsplash.com/photo-1457276587196-a9d53d84c58b?w=1920&q=80', category: 'Bookshelf', emoji: '📕' },
  { name: 'Modern Bookshelf', url: 'https://images.unsplash.com/photo-1683181181200-497e87dc6d4c?w=1920&q=80', category: 'Bookshelf', emoji: '📘' },
  { name: 'Vintage Books', url: 'https://images.unsplash.com/photo-1620388640952-35a1d22d158d?w=1920&q=80', category: 'Bookshelf', emoji: '📜' },
  { name: 'Organized Books', url: 'https://images.unsplash.com/photo-1604062527894-55b0712bbee3?w=1920&q=80', category: 'Bookshelf', emoji: '📖' },
  { name: 'Book Shelves', url: 'https://images.unsplash.com/photo-1507738978512-35798112892c?w=1920&q=80', category: 'Bookshelf', emoji: '📚' },
  { name: 'Study Corner', url: 'https://images.unsplash.com/photo-1457276587196-a9d53d84c58b?w=1920&q=80', category: 'Bookshelf', emoji: '✏️' },

  // === PHÒNG KHÁCH / LIVING ROOM (7) ===
  { name: 'Cozy Living Space', url: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=1920&q=80', category: 'Living Room', emoji: '🏡' },
  { name: 'Minimalist Living', url: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1920&q=80', category: 'Living Room', emoji: '⚪' },
  { name: 'Urban Apartment', url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1920&q=80', category: 'Living Room', emoji: '🏙️' },
  { name: 'Elegant Living Room', url: 'https://images.unsplash.com/photo-1632829882891-5047ccc421bc?w=1920&q=80', category: 'Living Room', emoji: '✨' },
  { name: 'Bright Living Space', url: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=1920&q=80', category: 'Living Room', emoji: '☀️' },
  { name: 'Scandinavian Living', url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1920&q=80', category: 'Living Room', emoji: '🇸🇪' },
  { name: 'Comfortable Living', url: 'https://images.unsplash.com/photo-1633330977020-2bdfb8530cc2?w=1920&q=80', category: 'Living Room', emoji: '🪑' },

  // === BÃI BIỂN / BEACH (12) ===
  { name: 'Tropical Beach', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80', category: 'Beach', emoji: '🏖️' },
  { name: 'Sandy Shore', url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1920&q=80', category: 'Beach', emoji: '🌊' },
  { name: 'Paradise Beach', url: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=1920&q=80', category: 'Beach', emoji: '🌴' },
  { name: 'Ocean View', url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1920&q=80', category: 'Beach', emoji: '🌅' },
  { name: 'Sunset Beach', url: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=1920&q=80', category: 'Beach', emoji: '🌇' },
  { name: 'Crystal Clear Water', url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1920&q=80', category: 'Beach', emoji: '💎' },
  { name: 'Palm Beach', url: 'https://images.unsplash.com/photo-1520454974749-611b7248ffdb?w=1920&q=80', category: 'Beach', emoji: '🌴' },
  { name: 'White Sand Beach', url: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1920&q=80', category: 'Beach', emoji: '⚪' },
  { name: 'Island Beach', url: 'https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=1920&q=80', category: 'Beach', emoji: '🏝️' },
  { name: 'Coastal View', url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1920&q=80', category: 'Beach', emoji: '🌊' },
  { name: 'Turquoise Water', url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&q=80', category: 'Beach', emoji: '💧' },
  { name: 'Beach Paradise', url: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=1920&q=80', category: 'Beach', emoji: '🌺' },

  // === PHONG CẢNH THIÊN NHIÊN / NATURE (15) ===
  { name: 'Mountain View', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80', category: 'Nature', emoji: '⛰️' },
  { name: 'Forest Path', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80', category: 'Nature', emoji: '🌲' },
  { name: 'Green Valley', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=80', category: 'Nature', emoji: '🌿' },
  { name: 'Lake Reflection', url: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=1920&q=80', category: 'Nature', emoji: '🏞️' },
  { name: 'Sunrise Mountain', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80', category: 'Nature', emoji: '🌄' },
  { name: 'Misty Forest', url: 'https://images.unsplash.com/photo-1511497584788-876760111969?w=1920&q=80', category: 'Nature', emoji: '🌫️' },
  { name: 'Waterfall', url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=1920&q=80', category: 'Nature', emoji: '💦' },
  { name: 'Cherry Blossom', url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1920&q=80', category: 'Nature', emoji: '🌸' },
  { name: 'Bamboo Forest', url: 'https://images.unsplash.com/photo-1523978591478-c753949ff840?w=1920&q=80', category: 'Nature', emoji: '🎋' },
  { name: 'Lavender Field', url: 'https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=1920&q=80', category: 'Nature', emoji: '💜' },
  { name: 'Autumn Forest', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&q=80', category: 'Nature', emoji: '🍂' },
  { name: 'Desert Landscape', url: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1920&q=80', category: 'Nature', emoji: '🏜️' },
  { name: 'Northern Lights', url: 'https://images.unsplash.com/photo-1579033461380-adb47c3eb938?w=1920&q=80', category: 'Nature', emoji: '🌌' },
  { name: 'Rice Terraces', url: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1920&q=80', category: 'Nature', emoji: '🌾' },
  { name: 'Snow Mountain', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80', category: 'Nature', emoji: '❄️' },

  // === THÀNH PHỐ / CITY (9) ===
  { name: 'City Skyline', url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1920&q=80', category: 'City', emoji: '🌆' },
  { name: 'Night City', url: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1920&q=80', category: 'City', emoji: '🌃' },
  { name: 'Urban Street', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=80', category: 'City', emoji: '🏙️' },
  { name: 'Modern Architecture', url: 'https://images.unsplash.com/photo-1486718448742-163732cd1544?w=1920&q=80', category: 'City', emoji: '🏢' },
  { name: 'Bridge View', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1920&q=80', category: 'City', emoji: '🌉' },
  { name: 'Downtown', url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1920&q=80', category: 'City', emoji: '🏛️' },
  { name: 'Harbor View', url: 'https://images.unsplash.com/photo-1513326738677-b964603b136d?w=1920&q=80', category: 'City', emoji: '⚓' },
  { name: 'Rooftop View', url: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=1920&q=80', category: 'City', emoji: '🏙️' },
  { name: 'Urban Sunset', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1920&q=80', category: 'City', emoji: '🌇' },

  // === TRANG TRÍ / MINIMAL (6) ===
  { name: 'White Wall', url: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=1920&q=80', category: 'Minimal', emoji: '⚪' },
  { name: 'Cream Wall', url: 'https://images.unsplash.com/photo-1534670007418-fbb7f6cf32c3?w=1920&q=80', category: 'Minimal', emoji: '🟨' },
  { name: 'Beige Texture', url: 'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=1920&q=80', category: 'Minimal', emoji: '🟧' },
  { name: 'Soft Light', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80', category: 'Minimal', emoji: '💡' },
  { name: 'Pastel Blue', url: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=1920&q=80', category: 'Minimal', emoji: '🔵' },
  { name: 'Clean White', url: 'https://images.unsplash.com/photo-1618556450994-a6a128ef0d9d?w=1920&q=80', category: 'Minimal', emoji: '⬜' },
];

export const VBG_CATEGORIES = ['All', 'Office', 'Education', 'Library', 'Bookshelf', 'Living Room', 'Beach', 'Nature', 'City', 'Minimal'];

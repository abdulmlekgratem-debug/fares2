import { Billboard } from '@/types'
import { getDaysRemaining } from '@/utils/dateUtils'

// Color palette for sizes
const colorPalette = [
  { bg: "#ef4444", border: "#fca5a5", text: "#fff" },
  { bg: "#f97316", border: "#fdba74", text: "#fff" },
  { bg: "#eab308", border: "#fde047", text: "#000" },
  { bg: "#22c55e", border: "#86efac", text: "#fff" },
  { bg: "#06b6d4", border: "#67e8f9", text: "#fff" },
  { bg: "#3b82f6", border: "#93c5fd", text: "#fff" },
  { bg: "#8b5cf6", border: "#c4b5fd", text: "#fff" },
  { bg: "#ec4899", border: "#f9a8d4", text: "#fff" },
  { bg: "#14b8a6", border: "#5eead4", text: "#fff" },
  { bg: "#f43f5e", border: "#fda4af", text: "#fff" },
]

const sizeColorMap: Record<string, { bg: string, border: string, text: string }> = {}

const getSizeColor = (size: string) => {
  if (!sizeColorMap[size]) {
    let hash = 0
    for (let i = 0; i < size.length; i++) hash = size.charCodeAt(i) + ((hash << 5) - hash)
    sizeColorMap[size] = colorPalette[Math.abs(hash) % colorPalette.length]
  }
  return sizeColorMap[size]
}

// Compact Popup HTML - Unified for both Google Maps and Leaflet
export const createCompactPopupContent = (billboard: Billboard): string => {
  const daysRemaining = getDaysRemaining(billboard.expiryDate)
  const sizeColor = getSizeColor(billboard.size)
  const statusColor = billboard.status === 'متاح' ? '#10b981' : billboard.status === 'قريباً' ? '#f59e0b' : '#ef4444'
  const statusBg = billboard.status === 'متاح' ? 'rgba(16,185,129,0.15)' : billboard.status === 'قريباً' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)'

  const coords = billboard.coordinates.split(",").map((c) => Number.parseFloat(c.trim()))
  const hasValidCoords = coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])
  const googleMapsUrl = hasValidCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${coords[0]},${coords[1]}&travelmode=driving`
    : '#'
  const whatsappUrl = `https://wa.me/218913228908?text=${encodeURIComponent(`مرحباً، أريد الاستفسار عن لوحة: ${billboard.name}\nالموقع: ${billboard.location}`)}`

  return `
    <div class="map-popup-compact" style="
      font-family: 'Tajawal', 'Manrope', sans-serif; 
      direction: rtl; 
      width: 240px; 
      max-width: 85vw;
      background: linear-gradient(145deg, rgba(26,26,46,0.98), rgba(20,20,35,0.98));
      border-radius: 12px; 
      overflow: hidden; 
      border: 1px solid rgba(212,175,55,0.3);
      box-shadow: 0 12px 35px -5px rgba(0,0,0,0.5);
    ">
      <!-- Image -->
      <div style="position: relative; height: 90px; cursor: pointer; overflow: hidden;"
           onclick="document.dispatchEvent(new CustomEvent('showBillboardImage', {detail: '${billboard.imageUrl || '/roadside-billboard.png'}'}))">
        <img src="${billboard.imageUrl || '/roadside-billboard.png'}" 
             alt="${billboard.name}" 
             style="width: 100%; height: 100%; object-fit: cover;"
             onerror="this.src='/roadside-billboard.png'" />
        <div style="position: absolute; inset: 0; background: linear-gradient(180deg, transparent 20%, rgba(26,26,46,0.9) 100%);"></div>
        <div style="position: absolute; top: 6px; right: 6px; background: ${sizeColor.bg}; padding: 2px 8px; border-radius: 8px; font-size: 11px; font-weight: 700; color: ${sizeColor.text};">${billboard.size}</div>
        <div style="position: absolute; top: 6px; left: 6px; background: ${statusBg}; padding: 2px 8px; border-radius: 8px; font-size: 10px; font-weight: 700; color: ${statusColor}; display: flex; align-items: center; gap: 4px;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: ${statusColor};"></span>
          ${billboard.status}
        </div>
      </div>
      
      <!-- Content -->
      <div style="padding: 10px;">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
          <h3 style="font-weight: 700; font-size: 13px; color: #fff; margin: 0; line-height: 1.4; flex: 1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${billboard.name}
          </h3>
          <button onclick="navigator.clipboard.writeText('${billboard.name}').then(()=>{this.innerHTML='<svg width=\\'14\\' height=\\'14\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'#10b981\\' stroke-width=\\'2.5\\'><path d=\\'M20 6L9 17l-5-5\\'/></svg>';setTimeout(()=>{this.innerHTML='<svg width=\\'14\\' height=\\'14\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><rect x=\\'9\\' y=\\'9\\' width=\\'13\\' height=\\'13\\' rx=\\'2\\'/><path d=\\'M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1\\'/></svg>'},1500)})" style="
            flex-shrink: 0; width: 28px; height: 28px; border-radius: 6px; border: 1px solid rgba(212,175,55,0.2);
            background: rgba(212,175,55,0.1); color: #d4af37; cursor: pointer;
            display: flex; align-items: center; justify-content: center; transition: all 0.2s;
          " onmouseover="this.style.background='rgba(212,175,55,0.2)'" onmouseout="this.style.background='rgba(212,175,55,0.1)'" title="نسخ اسم اللوحة">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          </button>
        </div>
        
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
          <div style="width: 22px; height: 22px; background: linear-gradient(135deg, #d4af37, #b8860b); border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" stroke-width="2.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <p style="color: #b0b0b0; font-size: 11px; margin: 0; flex: 1; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${billboard.location}</p>
        </div>
        
        ${billboard.status !== 'متاح' && daysRemaining !== null && daysRemaining > 0 ? `
          <div style="background: rgba(245,158,11,0.12); padding: 6px 8px; border-radius: 6px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; border: 1px solid rgba(245,158,11,0.25);">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
              <circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>
            </svg>
            <span style="font-weight: 600; color: #f59e0b; font-size: 11px;">متبقي ${daysRemaining} يوم</span>
          </div>
        ` : ''}
        
        <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px;">
          ${billboard.area ? `<span style="background: rgba(245,158,11,0.12); color: #fbbf24; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 600;">${billboard.area}</span>` : ''}
          <span style="background: rgba(212,175,55,0.12); color: #d4af37; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 600;">${billboard.municipality}</span>
        </div>
        
        <!-- Action Buttons -->
        <div style="display: flex; gap: 6px; margin-bottom: 8px;">
          ${hasValidCoords ? `
            <a href="${googleMapsUrl}" target="_blank" style="
              flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px;
              padding: 7px 8px; background: linear-gradient(135deg, #3b82f6, #1d4ed8);
              border-radius: 8px; color: #fff; font-size: 11px; font-weight: 600;
              text-decoration: none;
            ">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polygon points="3 11 22 2 13 21 11 13 3 11"/>
              </svg>
              التوجيه
            </a>
          ` : ''}
          <a href="${whatsappUrl}" target="_blank" style="
            flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px;
            padding: 7px 8px; background: linear-gradient(135deg, #25d366, #128c7e);
            border-radius: 8px; color: #fff; font-size: 11px; font-weight: 600;
            text-decoration: none;
          ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
            </svg>
            حجز
          </a>
        </div>
        
        <!-- Select Button -->
        <button onclick="document.dispatchEvent(new CustomEvent('toggleBillboardSelection', {detail: '${billboard.id}'}))" style="
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 8px; background: linear-gradient(135deg, #d4af37, #b8860b);
          border-radius: 8px; color: #1a1a2e; font-size: 12px; font-weight: 700;
          border: none; cursor: pointer; font-family: 'Tajawal', sans-serif;
          transition: opacity 0.2s;
        " onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
          تحديد اللوحة
        </button>
      </div>
    </div>
  `
}

export default createCompactPopupContent

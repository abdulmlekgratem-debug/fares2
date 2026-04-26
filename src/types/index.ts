export interface Billboard {
  id: string
  name: string
  location: string
  municipality: string
  city: string
  area: string
  size: string
  level: string
  status: string
  expiryDate: string | null
  coordinates: string
  imageUrl: string
  gpsLink: string
  billboardType: string
  facesCount: string
  landmark?: string  // أقرب نقطة دالة
}
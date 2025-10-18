// Common type definitions used across the application

export interface WeatherData {
  location: string;
  temperatureUnit?: string;
  latitude?: number;
  longitude?: number;
  current: {
    temperature: number;
    humidity: number;
    weatherDescription: string;
    weatherCode: number;
    uvIndex: number;
  };
  daily: {
    temperatureMax: number;
    temperatureMin: number;
    uvIndexMax: number;
  };
}

export interface IdentifiedProduct {
  brand: string;
  model: string;
  type: string;
  color?: string;
  material?: string;
  imageUrl?: string;
  price?: string;
  style?: string;
  availability?: string;
  features?: string[];
}

export interface OOTDRecord {
  id: string;
  photo_url: string;
  date: string;
  location: string;
  weather: string;
  notes: string;
  products?: any;
}

export interface OutfitItem {
  type: string;
  name: string;
  brand?: string;
  model?: string;
  color?: string;
  material?: string;
  description?: string;
  fromCloset: boolean;
  imageUrl?: string;
}

export interface Outfit {
  title: string;
  summary: string;
  hairstyle: string;
  items: OutfitItem[];
}

export interface TodaysPick {
  id: string;
  user_id: string;
  date: string;
  title: string;
  summary: string;
  hairstyle: string;
  items: any;
  weather: WeatherData;
  image_url?: string;
  is_liked: boolean;
  added_to_ootd: boolean;
  created_at: string;
  updated_at: string;
}

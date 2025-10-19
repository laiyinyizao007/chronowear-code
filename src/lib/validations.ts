import { z } from "zod";

/**
 * Garment validation schema
 */
export const garmentSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
  image_url: z.string().url("Invalid image URL").min(1, "Image URL is required"),
  type: z.string().min(1, "Type is required").max(50, "Type must be less than 50 characters"),
  color: z.string().max(50, "Color must be less than 50 characters").optional().default(""),
  season: z.string().max(20, "Season must be less than 20 characters").optional().default("All-Season"),
  brand: z.string().max(100, "Brand must be less than 100 characters").optional().default(""),
  material: z.string().max(100, "Material must be less than 100 characters").optional().default(""),
  official_price: z.number().min(0, "Price must be positive").optional().nullable(),
  currency: z.string().max(10, "Currency must be less than 10 characters").optional().default("USD"),
  acquired_date: z.string().optional().nullable(),
  washing_frequency: z.string().max(50, "Washing frequency must be less than 50 characters").optional().nullable(),
  notes: z.string().max(1000, "Notes must be less than 1000 characters").optional().nullable(),
  care_instructions: z.string().max(500, "Care instructions must be less than 500 characters").optional().nullable(),
});

export type GarmentInput = z.infer<typeof garmentSchema>;

/**
 * Garment update schema (partial)
 */
export const garmentUpdateSchema = garmentSchema.partial().omit({ user_id: true });

export type GarmentUpdateInput = z.infer<typeof garmentUpdateSchema>;

/**
 * OOTD Record validation schema
 */
export const ootdRecordSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
  photo_url: z.string().url("Invalid photo URL").min(1, "Photo URL is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  location: z.string().max(200, "Location must be less than 200 characters").optional(),
  weather: z.string().max(100, "Weather must be less than 100 characters").optional(),
  notes: z.string().max(1000, "Notes must be less than 1000 characters").optional(),
  products: z.any().optional(), // JSON field
  garment_ids: z.array(z.string().uuid()).optional(),
  saved_outfit_id: z.string().uuid().optional().nullable(),
});

export type OOTDRecordInput = z.infer<typeof ootdRecordSchema>;

/**
 * Today's Pick validation schema
 */
export const todaysPickSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  summary: z.string().max(1000, "Summary must be less than 1000 characters").optional().nullable(),
  hairstyle: z.string().max(200, "Hairstyle must be less than 200 characters").optional().nullable(),
  items: z.any(), // JSON field
  weather: z.any().optional().nullable(), // JSON field
  image_url: z.string().url("Invalid image URL").optional().nullable(),
});

export type TodaysPickInput = z.infer<typeof todaysPickSchema>;

/**
 * Profile validation schema
 */
export const profileSchema = z.object({
  id: z.string().uuid("Invalid user ID"),
  email: z.string().email("Invalid email").max(255, "Email must be less than 255 characters").optional().nullable(),
  full_name: z.string().max(100, "Name must be less than 100 characters").optional().nullable(),
  avatar_url: z.string().url("Invalid avatar URL").optional().nullable(),
  style_preference: z.string().max(500, "Style preference must be less than 500 characters").optional().nullable(),
  height_cm: z.number().min(0).max(300, "Height must be between 0-300 cm").optional().nullable(),
  weight_kg: z.number().min(0).max(500, "Weight must be between 0-500 kg").optional().nullable(),
  bust_cm: z.number().min(0).max(200, "Bust must be between 0-200 cm").optional().nullable(),
  waist_cm: z.number().min(0).max(200, "Waist must be between 0-200 cm").optional().nullable(),
  hip_cm: z.number().min(0).max(200, "Hip must be between 0-200 cm").optional().nullable(),
  shoe_size: z.number().min(0).max(60, "Shoe size must be between 0-60").optional().nullable(),
  eye_color: z.string().max(50, "Eye color must be less than 50 characters").optional().nullable(),
  hair_color: z.string().max(50, "Hair color must be less than 50 characters").optional().nullable(),
  gender: z.string().max(20, "Gender must be less than 20 characters").optional().nullable(),
  clothing_size: z.string().max(20, "Clothing size must be less than 20 characters").optional().nullable(),
  bra_cup: z.string().max(10, "Bra cup must be less than 10 characters").optional().nullable(),
  geo_location: z.string().max(200, "Location must be less than 200 characters").optional().nullable(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional().nullable(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/**
 * Profile update schema (partial, without id)
 */
export const profileUpdateSchema = profileSchema.partial().omit({ id: true });

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/**
 * Saved Outfit validation schema
 */
export const savedOutfitSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  summary: z.string().max(1000, "Summary must be less than 1000 characters").optional().nullable(),
  hairstyle: z.string().max(200, "Hairstyle must be less than 200 characters").optional().nullable(),
  items: z.any(), // JSON field
  image_url: z.string().url("Invalid image URL").optional().nullable(),
  trend_id: z.string().uuid("Invalid trend ID").optional().nullable(),
  liked: z.boolean().optional(),
});

export type SavedOutfitInput = z.infer<typeof savedOutfitSchema>;

/**
 * Helper function to validate and format errors
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Validation failed'] };
  }
}

/**
 * Helper function to validate and throw on error
 */
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = validateData(schema, data);
  if (!result.success) {
    throw new Error(result.errors?.join(', ') || 'Validation failed');
  }
  return result.data as T;
}

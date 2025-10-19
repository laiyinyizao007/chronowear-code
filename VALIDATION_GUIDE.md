# 输入验证指南

本项目使用 Zod 进行全面的输入验证，确保数据完整性和安全性。

## 📋 验证范围

已实现验证的数据模型：

### 1. **Garments (服装)**
- ✅ 添加新服装
- ✅ 更新服装信息
- ✅ 自动验证：图片 URL、类型、品牌、材质、价格等

### 2. **OOTD Records (穿搭记录)**
- ✅ 创建穿搭记录
- ✅ 验证：照片 URL、日期格式、位置、天气等

### 3. **Today's Picks (今日推荐)**
- ✅ 保存推荐
- ✅ 验证：标题、摘要、发型、配件数据等

### 4. **Profiles (用户资料)**
- ✅ 更新用户信息
- ✅ 验证：身高、体重、尺寸、邮箱等

## 🔧 使用方法

### 基础用法

```typescript
import { garmentSchema, validateData } from "@/lib/validations";

// 准备数据
const garmentData = {
  user_id: user.id,
  image_url: "https://example.com/image.jpg",
  type: "Top",
  color: "Blue",
  brand: "Nike",
  material: "Cotton",
  // ... 其他字段
};

// 验证数据
const validation = validateData(garmentSchema, garmentData);

if (!validation.success) {
  // 显示友好的错误信息
  const errorMsg = validation.errors?.join(', ');
  toast.error(errorMsg);
  throw new Error(errorMsg);
}

// 使用验证后的数据
const { error } = await supabase
  .from("garments")
  .insert([validation.data as any]);
```

### 快速验证（抛出异常）

```typescript
import { garmentSchema, validateOrThrow } from "@/lib/validations";

try {
  // 验证并直接获取数据，失败会抛出异常
  const validatedData = validateOrThrow(garmentSchema, garmentData);
  
  // 继续使用 validatedData
} catch (error) {
  toast.error(error.message);
}
```

## 📝 验证规则

### Garment Schema
```typescript
{
  user_id: string (UUID, 必填),
  image_url: string (URL, 必填),
  type: string (最多50字符, 必填),
  color: string (最多50字符, 可选),
  season: string (最多20字符, 可选, 默认 "All-Season"),
  brand: string (最多100字符, 可选),
  material: string (最多100字符, 可选),
  official_price: number (≥0, 可选),
  currency: string (最多10字符, 可选, 默认 "USD"),
  washing_frequency: string (最多50字符, 可选),
  notes: string (最多1000字符, 可选),
  care_instructions: string (最多500字符, 可选)
}
```

### OOTD Record Schema
```typescript
{
  user_id: string (UUID, 必填),
  photo_url: string (URL, 必填),
  date: string (YYYY-MM-DD格式, 必填),
  location: string (最多200字符, 可选),
  weather: string (最多100字符, 可选),
  notes: string (最多1000字符, 可选)
}
```

### Today's Pick Schema
```typescript
{
  user_id: string (UUID, 必填),
  date: string (YYYY-MM-DD格式, 必填),
  title: string (最多200字符, 必填),
  summary: string (最多1000字符, 可选),
  hairstyle: string (最多200字符, 可选),
  items: JSON (必填),
  weather: JSON (可选)
}
```

### Profile Schema
```typescript
{
  id: string (UUID, 必填),
  email: string (邮箱格式, 可选),
  full_name: string (最多100字符, 可选),
  style_preference: string (最多500字符, 可选),
  height_cm: number (0-300, 可选),
  weight_kg: number (0-500, 可选),
  bust_cm: number (0-200, 可选),
  waist_cm: number (0-200, 可选),
  hip_cm: number (0-200, 可选),
  shoe_size: number (0-60, 可选),
  // ... 其他字段
}
```

## ⚠️ 错误处理

验证失败时会返回详细的错误信息：

```typescript
const validation = validateData(schema, data);
if (!validation.success) {
  // validation.errors 是一个字符串数组
  // 例如: ["image_url: Invalid image URL", "type: Type is required"]
  console.log(validation.errors);
}
```

## 🎯 最佳实践

1. **总是验证用户输入**：在将数据发送到数据库之前验证
2. **显示友好错误**：使用 toast 向用户显示验证错误
3. **使用类型安全**：验证后的数据带有完整类型信息
4. **记录验证失败**：在控制台记录详细错误以便调试

## 📦 扩展验证

如需添加新的验证规则，编辑 `src/lib/validations.ts`：

```typescript
export const newSchema = z.object({
  // 定义验证规则
  field: z.string().min(1).max(100),
});
```

## 🔒 安全性

验证不仅提高了数据质量，还：
- 防止 SQL 注入
- 确保数据格式正确
- 避免数据库约束错误
- 提供更好的用户体验

## ✅ 已验证的操作

| 操作 | 文件 | Schema |
|------|------|--------|
| 添加服装 | `Closet.tsx` | `garmentSchema` |
| 添加 OOTD | `OOTDDiary.tsx` | `ootdRecordSchema` |
| 保存今日推荐 | `outfitService.ts` | `todaysPickSchema` |
| 更新用户资料 | `Settings.tsx` | `profileUpdateSchema` |

所有数据库插入和更新操作现在都经过验证！

# 开发规范

## API 使用规范

### ⚠️ 重要：图片生成 API

**永远不要使用 Lovable AI API 进行图片生成**

- ❌ 不使用：`https://ai.gateway.lovable.dev`
- ✅ 使用：Hugging Face Inference API

### 推荐的图片生成方案

使用 Hugging Face 的免费 API：

```typescript
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2'

const hf = new HfInference(Deno.env.get('HUGGING_FACE_ACCESS_TOKEN'))

const image = await hf.textToImage({
  inputs: prompt,
  model: 'black-forest-labs/FLUX.1-schnell',
})
```

### 原因

- Lovable AI API 需要付费充值
- Hugging Face 提供免费的图片生成服务
- FLUX.1-schnell 模型质量高且速度快

## 相关配置

确保在 Supabase secrets 中配置了 `HUGGING_FACE_ACCESS_TOKEN`

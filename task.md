# Auto Icon Generation for Items

## Plan
1. **Backend**: Add `/items/generate-icon` API route
   - Uses Gemini 3 Pro Image via AI Gateway to generate a product icon
   - Saves to R2, returns presigned URL
   - Input: product name + category
2. **Frontend (add.tsx)**: When user saves item without uploading an icon:
   - First try category-based local icon (CATEGORY_ICONS mapping)
   - Then call AI endpoint to generate icon from product name
   - Fallback: save without icon
3. **Flow**: User adds item → on save, if no iconUri, auto-generate via AI → save URL to item

## Files to modify
- `packages/web/src/api/index.ts` — add generate-icon route
- `packages/web/src/api/lib/s3.ts` — create S3 client (if not exists)
- `packages/mobile/app/items/add.tsx` — wire auto-icon generation on save

## Dependencies
- `ai` + `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` in packages/web
- S3 keys needed for R2

## Status
- [ ] Check S3 keys in env
- [ ] Install deps
- [ ] Create s3.ts
- [ ] Create gateway.ts
- [ ] Add API route
- [ ] Wire up add.tsx

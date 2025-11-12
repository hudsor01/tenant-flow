"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requiredImageUrlSchema = exports.imageUrlSchema = void 0;
const zod_1 = require("zod");
exports.imageUrlSchema = zod_1.z
    .string()
    .refine(url => {
    if (!url)
        return true;
    if (url.startsWith('data:image/')) {
        return /^data:image\/(jpeg|jpg|png|gif|webp);base64,/.test(url);
    }
    if (url.includes('.supabase.co/storage/v1/object/public/')) {
        try {
            const urlObj = new URL(url);
            return (urlObj.protocol === 'https:' &&
                urlObj.hostname.endsWith('.supabase.co') &&
                urlObj.pathname.startsWith('/storage/v1/object/public/'));
        }
        catch {
            return false;
        }
    }
    return false;
}, {
    message: 'Image URL must be from Supabase Storage or a valid base64 data URL'
})
    .optional()
    .nullable();
exports.requiredImageUrlSchema = exports.imageUrlSchema.refine(url => !!url, {
    message: 'Image URL is required'
});
//# sourceMappingURL=image-url.schemas.js.map
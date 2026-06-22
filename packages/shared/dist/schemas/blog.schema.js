"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBlogPostSchema = exports.createBlogPostSchema = void 0;
// filepath: packages/shared/src/schemas/blog.schema.ts
const zod_1 = require("zod");
exports.createBlogPostSchema = zod_1.z.object({
    title: zod_1.z.string().min(5, 'Tytuł musi mieć co najmniej 5 znaków'),
    content: zod_1.z.string().min(1, 'Treść jest wymagana'),
    excerpt: zod_1.z.string().min(10, 'Zajawka jest za krótka'),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    isPublished: zod_1.z.boolean().default(false),
    metaTitle: zod_1.z.string().max(70).optional(),
    metaDescription: zod_1.z.string().max(160).optional(),
    readingTime: zod_1.z.number().int().positive().optional(),
    category: zod_1.z.string().max(60).optional(),
});
exports.updateBlogPostSchema = exports.createBlogPostSchema.partial();

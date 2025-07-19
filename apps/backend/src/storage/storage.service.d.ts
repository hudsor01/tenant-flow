import { ConfigService } from '@nestjs/config';
export interface FileUploadResult {
    url: string;
    path: string;
    filename: string;
    size: number;
    mimeType: string;
    bucket: string;
}
export declare class StorageService {
    private configService;
    private readonly supabase;
    constructor(configService: ConfigService);
    uploadFile(bucket: string, path: string, file: Buffer, options?: {
        contentType?: string;
        cacheControl?: string;
        upsert?: boolean;
    }): Promise<FileUploadResult>;
    getPublicUrl(bucket: string, path: string): string;
    deleteFile(bucket: string, path: string): Promise<boolean>;
    listFiles(bucket: string, folder?: string): Promise<import("@supabase/storage-js").FileObject[]>;
    generateUniqueFilename(originalName: string): string;
    getStoragePath(entityType: 'property' | 'tenant' | 'maintenance' | 'user', entityId: string, filename: string): string;
    getBucket(fileType: 'document' | 'image' | 'avatar'): string;
}
//# sourceMappingURL=storage.service.d.ts.map
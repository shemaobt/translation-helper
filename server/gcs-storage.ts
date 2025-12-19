/**
 * Google Cloud Storage Service
 * 
 * Handles file uploads to GCS for persistent storage of feedback screenshots
 */

import { Storage } from '@google-cloud/storage';
import path from 'path';

// Initialize GCS client
const storage = new Storage();

// Get bucket name from environment
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'translation-helper-uploads';

/**
 * Get the GCS bucket
 */
function getBucket() {
  return storage.bucket(BUCKET_NAME);
}

/**
 * Upload a file to GCS
 * @param buffer - File buffer to upload
 * @param filename - Original filename
 * @param folder - Folder in the bucket (e.g., 'feedback-screenshots')
 * @param contentType - MIME type of the file
 * @returns Public URL of the uploaded file
 */
export async function uploadToGCS(
  buffer: Buffer,
  filename: string,
  folder: string,
  contentType: string
): Promise<string> {
  const bucket = getBucket();
  
  // Generate unique filename
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const ext = path.extname(filename);
  const uniqueFilename = `${folder}/${uniqueSuffix}${ext}`;
  
  const file = bucket.file(uniqueFilename);
  
  // Upload the file
  await file.save(buffer, {
    metadata: {
      contentType,
    },
    resumable: false,
  });
  
  // Make the file publicly accessible
  await file.makePublic();
  
  // Return the public URL
  const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${uniqueFilename}`;
  
  console.log(`[GCS] Uploaded file to: ${publicUrl}`);
  
  return publicUrl;
}

/**
 * Check if GCS is properly configured
 */
export async function isGCSConfigured(): Promise<boolean> {
  try {
    if (!process.env.GCS_BUCKET_NAME) {
      return false;
    }
    const bucket = getBucket();
    const [exists] = await bucket.exists();
    return exists;
  } catch (error) {
    console.error('[GCS] Storage not configured:', error);
    return false;
  }
}

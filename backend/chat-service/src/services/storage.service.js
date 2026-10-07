import crypto from "node:crypto";
import { supabase } from "../configs/supabase.js";

const BUCKET_NAME = "chat";
let isBucketReady = false;

/**
 * Đảm bảo bucket chat công khai tồn tại trên Supabase Storage
 */
export const ensureBucketExists = async () => {
  if (isBucketReady) return BUCKET_NAME;
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (!listError && buckets) {
      const exists = buckets.some((b) => b.name === BUCKET_NAME);
      if (exists) {
        isBucketReady = true;
        return BUCKET_NAME;
      }
    }

    // Nếu chưa có, tự động tạo bucket 'chat' công khai
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 52428800, // 50MB
    });

    if (createError) {
      console.warn(`[StorageService] Lưu ý khi tạo bucket '${BUCKET_NAME}':`, createError.message);
    } else {
      isBucketReady = true;
    }
  } catch (err) {
    console.warn("[StorageService] Lỗi kiểm tra bucket:", err.message);
  }
  return BUCKET_NAME;
};

/**
 * Phân loại message_type ('image' | 'video' | 'audio' | 'file') dựa trên mimetype hoặc phần mở rộng
 * @param {string} mimeType
 * @param {string} originalName
 * @returns {"image" | "video" | "audio" | "file"}
 */
export const getMessageTypeFromMime = (mimeType = "", originalName = "") => {
  const mime = (mimeType || "").toLowerCase();
  const ext = (originalName.split(".").pop() || "").toLowerCase();

  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "heic", "avif"];
  const videoExts = ["mp4", "mov", "avi", "mkv", "webm", "flv", "wmv", "m4v", "3gp"];
  const audioExts = ["mp3", "wav", "ogg", "m4a", "aac", "flac", "wma"];

  if (mime.startsWith("image/") || imageExts.includes(ext)) {
    return "image";
  }
  if (mime.startsWith("video/") || videoExts.includes(ext)) {
    return "video";
  }
  if (mime.startsWith("audio/") || audioExts.includes(ext)) {
    return "audio";
  }

  return "file";
};

/**
 * Upload tệp tin lên Supabase Storage
 * Hỗ trợ tự động phân loại folder, đặt tên file an toàn không trùng lặp,
 * và fallback dự phòng sang bucket 'products' nếu bucket 'chat' chưa được tạo.
 *
 * @param {Object} file - Object tệp từ Multer ({ originalname, buffer, mimetype, size })
 * @param {string|null} folder - Thư mục con lưu trữ (nếu null sẽ tự động tạo theo message_type)
 * @returns {Promise<{ file_url: string, file_name: string, file_size: number, file_type: string, message_type: string }>}
 */
export const uploadChatFile = async (file, folder = null) => {
  if (!file || !file.buffer) {
    throw { status: 400, message: "Tệp tải lên không hợp lệ hoặc thiếu dữ liệu!" };
  }

  // Khôi phục tên gốc tiếng Việt nếu bị lỗi mã hóa latin1 từ multipart/form-data
  let originalName = file.originalname || "attachment";
  try {
    const decoded = Buffer.from(originalName, "latin1").toString("utf8");
    if (!decoded.includes("\uFFFD")) {
      originalName = decoded;
    }
  } catch (_) {}

  const messageType = getMessageTypeFromMime(file.mimetype, originalName);
  const targetFolder = folder || `${messageType}s`; // images, videos, files

  await ensureBucketExists();

  // Tách đuôi mở rộng an toàn (chỉ giữ ký tự chữ và số)
  const rawExt = originalName.includes(".") ? originalName.split(".").pop() : "";
  const ext = (rawExt || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase() || (messageType === "image" ? "jpg" : "bin");

  // Chuẩn hóa tên file thành ASCII an toàn tuyệt đối cho Supabase Storage (S3 key)
  // Bỏ dấu tiếng Việt, loại bỏ ký tự đặc biệt, chỉ giữ [a-zA-Z0-9_-]
  const safeBaseName = originalName
    .replace(/\.[^/.]+$/, "") // Bỏ đuôi mở rộng
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Bỏ dấu thanh tiếng Việt
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9_-]/g, "_") // Thay thế ký tự không phải ASCII alphanumeric bằng _
    .replace(/_+/g, "_") // Rút gọn các dấu _ liên tiếp
    .replace(/^_+|_+$/g, "") // Bỏ dấu _ ở đầu/cuối
    .substring(0, 35) || messageType;

  const randomSuffix = crypto.randomBytes(4).toString("hex");
  const fileName = `${Date.now()}_${randomSuffix}_${safeBaseName}.${ext}`;
  const filePath = `${targetFolder}/${fileName}`;

  // 1. Thử upload lên bucket 'chat'
  let { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype || "application/octet-stream",
      upsert: true,
    });

  let chosenBucket = BUCKET_NAME;

  // 2. Dự phòng: nếu upload lên bucket 'chat' gặp lỗi do bucket chưa tồn tại, thử fallback sang bucket 'products'
  if (uploadError) {
    console.warn(`[StorageService] Upload vào '${BUCKET_NAME}' thất bại (${uploadError.message}).`);

    if (uploadError.message?.toLowerCase().includes("bucket not found")) {
      console.warn(`[StorageService] Thử fallback sang bucket 'products'...`);
      const fallbackPath = `chat_${targetFolder}/${fileName}`;
      const fallbackRes = await supabase.storage
        .from("products")
        .upload(fallbackPath, file.buffer, {
          contentType: file.mimetype || "application/octet-stream",
          upsert: true,
        });

      if (!fallbackRes.error) {
        chosenBucket = "products";
        const { data: publicUrlData } = supabase.storage
          .from("products")
          .getPublicUrl(fallbackPath);

        return {
          file_url: publicUrlData.publicUrl,
          file_name: originalName,
          file_size: file.size || (file.buffer ? file.buffer.length : 0),
          file_type: file.mimetype || "application/octet-stream",
          message_type: messageType,
        };
      }
    }

    throw new Error(`Lỗi tải tệp lên Supabase Storage: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(chosenBucket)
    .getPublicUrl(filePath);

  return {
    file_url: publicUrlData.publicUrl,
    file_name: originalName,
    file_size: file.size || (file.buffer ? file.buffer.length : 0),
    file_type: file.mimetype || "application/octet-stream",
    message_type: messageType,
  };
};

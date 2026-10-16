import multer from "multer";

// Lưu tạm tệp vào RAM Buffer để chuẩn bị upload lên Supabase Storage
const storage = multer.memoryStorage();

// Giới hạn kích thước file tải lên (50MB cho mỗi video / hình ảnh / tệp tin)
const MAX_FILE_SIZE = 50 * 1024 * 1024;
// Giới hạn số lượng tệp tối đa tải lên cùng một lúc (hỗ trợ gửi nhiều ảnh, video, tệp tin)
const MAX_FILES_COUNT = 30;

export const chatUpload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES_COUNT,
  },
  fileFilter: (req, file, cb) => {
    // Chặn các đuôi tệp thực thi nguy hiểm
    const blockedExtensions = [
      ".exe",
      ".bat",
      ".cmd",
      ".sh",
      ".msi",
      ".vbs",
      ".scr",
      ".com",
      ".pif",
      ".application",
    ];
    const originalName = (file.originalname || "").toLowerCase();

    if (blockedExtensions.some((ext) => originalName.endsWith(ext))) {
      return cb(
        new Error("Loại tệp thực thi này không được phép gửi vì lý do bảo mật!"),
        false
      );
    }

    cb(null, true);
  },
});


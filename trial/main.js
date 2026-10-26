// Khởi động bản trải nghiệm: thay đường gọi API bằng backend chạy trong trình duyệt rồi nạp giao diện chung.
import { trialTransport } from './backend.js';

globalThis.__VPA_TRANSPORT__ = trialTransport;
await import('../app.js');

type LogMeta = Record<string, unknown>;

export const logger = {
  info(message: string, meta?: LogMeta): void {
    if (meta) {
      console.log(`[INFO] ${message}`, meta);
    } else {
      console.log(`[INFO] ${message}`);
    }
  },

  warn(message: string, meta?: LogMeta): void {
    if (meta) {
      console.warn(`[WARN] ${message}`, meta);
    } else {
      console.warn(`[WARN] ${message}`);
    }
  },

  error(message: string, error?: unknown): void {
    if (error) {
      console.error(`[ERROR] ${message}`, error);
    } else {
      console.error(`[ERROR] ${message}`);
    }
  },
};

// utils/errorHelper.js

/**
 * 从 catch 的 error 中提取可读的错误信息
 */
export const getErrorMessage = (err: unknown): string => {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return 'Unknown error occurred';
};
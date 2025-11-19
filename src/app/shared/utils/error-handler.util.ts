/**
 * 错误处理工具函数
 * 用于统一处理 HTTP 错误并返回友好的错误消息
 */

export interface HttpError {
  status?: number;
  statusCode?: number;
  error?: any;
  message?: string;
  name?: string;
}

/**
 * 从错误对象中提取友好的错误消息
 * @param error 错误对象
 * @param defaultMessage 默认错误消息
 * @returns 友好的错误消息
 */
export function extractErrorMessage(error: HttpError, defaultMessage: string = '操作失败'): string {
  if (!error) {
    return defaultMessage;
  }

  // 优先从 error.error 中提取消息
  if (error.error) {
    if (typeof error.error === 'string') {
      return error.error;
    }
    if (error.error.message) {
      return error.error.message;
    }
    if (error.error.error) {
      return error.error.error;
    }
    if (error.error.msg) {
      return error.error.msg;
    }
  }

  // 其次使用 error.message
  if (error.message) {
    return error.message;
  }

  return defaultMessage;
}

/**
 * 根据 HTTP 状态码返回友好的错误消息
 * @param status HTTP 状态码
 * @param customMessage 自定义消息（可选）
 * @returns 友好的错误消息
 */
export function getErrorMessageByStatus(status: number, customMessage?: string): string {
  if (customMessage) {
    return customMessage;
  }

  const statusCode = status || 0;

  switch (statusCode) {
    case 0:
      return '无法连接到后端服务，请检查网络连接';
    case 400:
      return '请求参数错误，请检查填写的信息是否正确';
    case 401:
      return '未授权，请检查用户权限';
    case 403:
      return '没有权限执行此操作，请检查用户权限';
    case 404:
      return '资源未找到，请刷新后重试';
    case 409:
      return '资源冲突，请检查是否已存在';
    case 500:
      return '服务器内部错误，请稍后重试或联系管理员';
    case 502:
      return '网关错误，后端服务可能不可用';
    case 503:
      return '服务暂时不可用，请稍后重试';
    default:
      return `请求失败 (状态码: ${statusCode})`;
  }
}

/**
 * 获取完整的友好错误消息
 * @param error 错误对象
 * @param defaultMessage 默认错误消息
 * @param statusMessages 状态码对应的自定义消息映射（可选）
 * @returns 友好的错误消息
 */
export function getFriendlyErrorMessage(
  error: HttpError,
  defaultMessage: string = '操作失败',
  statusMessages?: { [key: number]: string }
): string {
  if (!error) {
    return defaultMessage;
  }

  const status = error.status || error.statusCode || 0;

  // 如果有自定义状态码消息，优先使用
  if (statusMessages && statusMessages[status]) {
    const extractedMessage = extractErrorMessage(error, '');
    return extractedMessage || statusMessages[status];
  }

  // 特殊处理超时错误
  if (error.name === 'TimeoutError' || status === 0) {
    return getErrorMessageByStatus(0);
  }

  // 根据状态码获取消息
  const statusMessage = getErrorMessageByStatus(status);
  
  // 尝试提取详细错误信息
  const extractedMessage = extractErrorMessage(error, '');
  
  // 如果提取的消息不是默认消息，且与状态码消息不同，则使用提取的消息
  if (extractedMessage && extractedMessage !== defaultMessage && extractedMessage !== statusMessage) {
    return extractedMessage;
  }

  return statusMessage || defaultMessage;
}

/**
 * K8sGPT 特定的错误消息映射
 */
export const K8SGPT_ERROR_MESSAGES: { [key: number]: string } = {
  0: '无法连接到 K8sGPT 服务，请检查后端服务是否正常运行',
  404: 'K8sGPT 服务未找到，请检查后端服务配置',
  500: 'K8sGPT 服务内部错误，请检查后端日志',
  401: '没有权限访问 K8sGPT 服务，请检查用户权限',
  403: '没有权限访问 K8sGPT 服务，请检查用户权限',
};

/**
 * AI 引擎管理特定的错误消息映射
 */
export const AI_PROVIDER_ERROR_MESSAGES: { [key: number]: string } = {
  0: '无法连接到后端服务，请检查网络连接',
  404: 'AI 引擎不存在，可能已被删除',
  409: 'AI 引擎名称已存在，请使用其他名称',
  401: '没有权限执行此操作，请检查用户权限',
  403: '没有权限执行此操作，请检查用户权限',
  500: '服务器内部错误，请稍后重试或联系管理员',
};

/**
 * 设置默认 AI 引擎特定的错误消息映射
 */
export const SET_DEFAULT_ERROR_MESSAGES: { [key: number]: string } = {
  0: '无法连接到后端服务，请检查网络连接',
  404: 'AI 引擎不存在，请刷新列表后重试',
  401: '没有权限设置默认 AI 引擎，请检查用户权限',
  403: '没有权限设置默认 AI 引擎，请检查用户权限',
  500: '服务器内部错误，请稍后重试或联系管理员',
};

/**
 * 删除 AI 引擎特定的错误消息映射
 */
export const DELETE_PROVIDER_ERROR_MESSAGES: { [key: number]: string } = {
  0: '无法连接到后端服务，请检查网络连接',
  404: 'AI 引擎不存在，可能已被删除',
  409: '无法删除默认 AI 引擎，请先设置其他引擎为默认',
  401: '没有权限删除 AI 引擎，请检查用户权限',
  403: '没有权限删除 AI 引擎，请检查用户权限',
  500: '服务器内部错误，请稍后重试或联系管理员',
};

/**
 * 保存 AI 引擎特定的错误消息映射
 */
export const SAVE_PROVIDER_ERROR_MESSAGES: { [key: number]: string } = {
  0: '无法连接到后端服务，请检查网络连接',
  400: '请求参数错误，请检查填写的信息是否正确',
  404: 'AI 引擎不存在，请刷新列表后重试',
  409: 'AI 引擎名称已存在，请使用其他名称',
  401: '没有权限执行此操作，请检查用户权限',
  403: '没有权限执行此操作，请检查用户权限',
  500: '服务器内部错误，请稍后重试或联系管理员',
};


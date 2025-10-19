/**
 * PAYMENT GATEWAY INTEGRATION
 *
 * An toàn thanh toán với VNPay và Momo
 * - HMAC-SHA256 signature verification
 * - Không lưu thông tin thẻ/tài khoản
 * - Callback validation nghiêm ngặt
 * - Audit logging đầy đủ
 */

import crypto from 'crypto';

// ==================== CONFIGURATION ====================

export const PAYMENT_CONFIG = {
  vnpay: {
    tmnCode: process.env.VNPAY_TMN_CODE || '',
    hashSecret: process.env.VNPAY_HASH_SECRET || '',
    url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    returnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:3000/api/payment/vnpay/callback',
    apiUrl: process.env.VNPAY_API_URL || 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
  },
  momo: {
    partnerCode: process.env.MOMO_PARTNER_CODE || '',
    accessKey: process.env.MOMO_ACCESS_KEY || '',
    secretKey: process.env.MOMO_SECRET_KEY || '',
    endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create',
    returnUrl: process.env.MOMO_RETURN_URL || 'http://localhost:3000/api/payment/momo/callback',
    notifyUrl: process.env.MOMO_NOTIFY_URL || 'http://localhost:3000/api/payment/momo/notify',
  },
  commissionRate: parseInt(process.env.COMMISSION_RATE || '15'), // % phí nền tảng
};

// ==================== VNPAY INTEGRATION ====================

interface VNPayParams {
  enrollmentId: number;
  amount: number;
  orderInfo: string;
  ipAddress: string;
}

interface VNPayCallbackParams {
  [key: string]: string;
}

/**
 * Tạo URL thanh toán VNPay
 * Tham khảo: https://sandbox.vnpayment.vn/apis/docs/huong-dan-tich-hop/
 */
export function createVNPayPaymentUrl(params: VNPayParams): string {
  const { enrollmentId, amount, orderInfo, ipAddress } = params;

  const date = new Date();
  const createDate = formatDate(date);
  const orderId = `ENR${enrollmentId}_${Date.now()}`;

  // VNPay parameters (phải sort theo alphabet)
  let vnpParams: { [key: string]: string } = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: PAYMENT_CONFIG.vnpay.tmnCode,
    vnp_Amount: (amount * 100).toString(), // VNPay yêu cầu amount * 100
    vnp_CurrCode: 'VND',
    vnp_TxnRef: orderId,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: 'other',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: PAYMENT_CONFIG.vnpay.returnUrl,
    vnp_IpAddr: ipAddress,
    vnp_CreateDate: createDate,
  };

  // Sort parameters alphabetically
  vnpParams = sortObject(vnpParams);

  // Create signature
  const signData = new URLSearchParams(vnpParams).toString();
  const hmac = crypto.createHmac('sha512', PAYMENT_CONFIG.vnpay.hashSecret);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  vnpParams['vnp_SecureHash'] = signed;

  // Create payment URL
  const paymentUrl = PAYMENT_CONFIG.vnpay.url + '?' + new URLSearchParams(vnpParams).toString();

  return paymentUrl;
}

/**
 * Xác minh callback từ VNPay
 * QUAN TRỌNG: Phải verify signature để tránh bị giả mạo
 */
export function verifyVNPayCallback(callbackParams: VNPayCallbackParams): {
  isValid: boolean;
  data: VNPayCallbackParams | null;
} {
  const secureHash = callbackParams['vnp_SecureHash'];

  // Remove hash và hash type khỏi params
  const params = { ...callbackParams };
  delete params['vnp_SecureHash'];
  delete params['vnp_SecureHashType'];

  // Sort parameters
  const sortedParams = sortObject(params);

  // Create signature
  const signData = new URLSearchParams(sortedParams).toString();
  const hmac = crypto.createHmac('sha512', PAYMENT_CONFIG.vnpay.hashSecret);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  // Verify signature
  if (secureHash === signed) {
    return {
      isValid: true,
      data: callbackParams,
    };
  }

  return {
    isValid: false,
    data: null,
  };
}

/**
 * Parse VNPay response code
 */
export function parseVNPayResponseCode(code: string): {
  success: boolean;
  message: string;
} {
  const responseCodes: { [key: string]: string } = {
    '00': 'Giao dịch thành công',
    '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
    '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
    '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
    '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.',
    '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.',
    '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP).',
    '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
    '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
    '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.',
    '75': 'Ngân hàng thanh toán đang bảo trì.',
    '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định.',
    '99': 'Các lỗi khác',
  };

  return {
    success: code === '00',
    message: responseCodes[code] || 'Lỗi không xác định',
  };
}

// ==================== MOMO INTEGRATION ====================

interface MomoParams {
  enrollmentId: number;
  amount: number;
  orderInfo: string;
}

/**
 * Tạo yêu cầu thanh toán Momo
 * Tham khảo: https://developers.momo.vn/
 */
export async function createMomoPayment(params: MomoParams): Promise<{
  success: boolean;
  payUrl?: string;
  deeplink?: string;
  qrCodeUrl?: string;
  error?: string;
}> {
  const { enrollmentId, amount, orderInfo } = params;

  const orderId = `ENR${enrollmentId}_${Date.now()}`;
  const requestId = `REQ${Date.now()}`;

  const rawSignature = [
    `accessKey=${PAYMENT_CONFIG.momo.accessKey}`,
    `amount=${amount}`,
    `extraData=`,
    `ipnUrl=${PAYMENT_CONFIG.momo.notifyUrl}`,
    `orderId=${orderId}`,
    `orderInfo=${orderInfo}`,
    `partnerCode=${PAYMENT_CONFIG.momo.partnerCode}`,
    `redirectUrl=${PAYMENT_CONFIG.momo.returnUrl}`,
    `requestId=${requestId}`,
    `requestType=captureWallet`,
  ].join('&');

  const signature = crypto
    .createHmac('sha256', PAYMENT_CONFIG.momo.secretKey)
    .update(rawSignature)
    .digest('hex');

  const requestBody = {
    partnerCode: PAYMENT_CONFIG.momo.partnerCode,
    accessKey: PAYMENT_CONFIG.momo.accessKey,
    requestId: requestId,
    amount: amount.toString(),
    orderId: orderId,
    orderInfo: orderInfo,
    redirectUrl: PAYMENT_CONFIG.momo.returnUrl,
    ipnUrl: PAYMENT_CONFIG.momo.notifyUrl,
    extraData: '',
    requestType: 'captureWallet',
    signature: signature,
    lang: 'vi',
  };

  try {
    const response = await fetch(PAYMENT_CONFIG.momo.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (data.resultCode === 0) {
      return {
        success: true,
        payUrl: data.payUrl,
        deeplink: data.deeplink,
        qrCodeUrl: data.qrCodeUrl,
      };
    } else {
      return {
        success: false,
        error: data.message || 'Tạo thanh toán Momo thất bại',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi kết nối Momo',
    };
  }
}

/**
 * Xác minh callback từ Momo
 * QUAN TRỌNG: Phải verify signature
 */
export function verifyMomoCallback(callbackParams: {
  [key: string]: string;
}): {
  isValid: boolean;
  data: any | null;
} {
  const { signature, ...params } = callbackParams;

  // Tạo raw signature từ params
  const rawSignature = [
    `accessKey=${PAYMENT_CONFIG.momo.accessKey}`,
    `amount=${params.amount}`,
    `extraData=${params.extraData || ''}`,
    `message=${params.message}`,
    `orderId=${params.orderId}`,
    `orderInfo=${params.orderInfo}`,
    `orderType=${params.orderType}`,
    `partnerCode=${params.partnerCode}`,
    `payType=${params.payType}`,
    `requestId=${params.requestId}`,
    `responseTime=${params.responseTime}`,
    `resultCode=${params.resultCode}`,
    `transId=${params.transId}`,
  ].join('&');

  const calculatedSignature = crypto
    .createHmac('sha256', PAYMENT_CONFIG.momo.secretKey)
    .update(rawSignature)
    .digest('hex');

  if (signature === calculatedSignature && params.resultCode === '0') {
    return {
      isValid: true,
      data: params,
    };
  }

  return {
    isValid: false,
    data: null,
  };
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Sort object by key (alphabetically)
 */
function sortObject(obj: { [key: string]: string }): { [key: string]: string } {
  const sorted: { [key: string]: string } = {};
  const keys = Object.keys(obj).sort();

  keys.forEach((key) => {
    sorted[key] = obj[key];
  });

  return sorted;
}

/**
 * Format date for VNPay (yyyyMMddHHmmss)
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Tạo transaction code unique
 */
export function generateTransactionCode(prefix: string = 'TXN'): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}${timestamp}${random}`;
}

/**
 * Parse enrollment ID từ order ID
 */
export function parseEnrollmentIdFromOrderId(orderId: string): number | null {
  const match = orderId.match(/^ENR(\d+)_/);
  return match ? parseInt(match[1]) : null;
}

import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const BASE_URL = `https://graph.facebook.com/${env.META_WHATSAPP_API_VERSION}`;

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export async function sendWhatsApp(
  to: string,
  message: string
): Promise<{ success: boolean; providerRef?: string }> {
  if (env.isDevelopment() || !env.META_WHATSAPP_TOKEN) {
    logger.info(`[DEV] WhatsApp to ${to}: ${message}`);
    return { success: true, providerRef: `dev-${Date.now()}` };
  }

  try {
    const res = await axios.post(
      `${BASE_URL}/${env.META_WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: `91${to}`,
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${env.META_WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return { success: true, providerRef: res.data?.messages?.[0]?.id };
  } catch (err: any) {
    logger.error('WhatsApp send failed', { err: err.message, to });
    return { success: false };
  }
}

export const TEMPLATES = {
  welcome: (vars: { Customer_Name: string; Car_Number: string; Dashboard_Link: string }) =>
    `🎉 Welcome to Car Deal Safety, ${vars.Customer_Name}!\n\nYour vehicle *${vars.Car_Number}* has been successfully registered.\n\n📱 Access your dashboard: ${vars.Dashboard_Link}\n\nKeep your tag on your vehicle at all times for emergency assistance.`,

  insuranceExpiry: (vars: { Customer_Name: string; Car_Number: string; Expiry_Date: string; Days: string }) =>
    `⚠️ Insurance Expiry Reminder\n\nDear ${vars.Customer_Name},\n\nYour vehicle *${vars.Car_Number}* insurance expires on *${vars.Expiry_Date}* (${vars.Days} days remaining).\n\nPlease renew your insurance to stay protected.`,

  pucExpiry: (vars: { Customer_Name: string; Car_Number: string; Expiry_Date: string; Days: string }) =>
    `⚠️ PUC Expiry Reminder\n\nDear ${vars.Customer_Name},\n\nYour vehicle *${vars.Car_Number}* PUC certificate expires on *${vars.Expiry_Date}* (${vars.Days} days remaining).\n\nPlease renew your PUC to avoid penalties.`,

  sosAlert: (vars: { Car_Number: string; Live_Location_Link: string }) =>
    `🚨 *EMERGENCY ALERT*\n\nAn emergency SOS has been triggered from vehicle *${vars.Car_Number}*.\n\n📍 Live Location:\n${vars.Live_Location_Link}\n\nPlease contact the vehicle owner immediately.`,
};

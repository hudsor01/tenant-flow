import { buffer } from 'micro';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  let result = { success: false };
  
  try {
    const rawBody = await buffer(req);
    result = {
      success: true,
      bodyReceived: rawBody.toString(),
      bodyLength: rawBody.length,
      hasSignature: !!req.headers['stripe-signature']
    };
  } catch (e) {
    result = {
      success: false,
      error: e.message
    };
  }
  
  return res.json(result);
}
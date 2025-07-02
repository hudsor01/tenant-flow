// Diagnostic endpoint to debug Vercel body handling
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: req.headers,
    rawBodyAttempts: {}
  };

  // Test 1: Try reading request as stream directly
  try {
    const chunks = [];
    req.on('data', chunk => {
      chunks.push(chunk);
    });
    
    await new Promise((resolve, reject) => {
      req.on('end', resolve);
      req.on('error', reject);
    });
    
    const streamBuffer = Buffer.concat(chunks);
    diagnostics.rawBodyAttempts.directStream = {
      success: true,
      bodyLength: streamBuffer.length,
      bodyPreview: streamBuffer.toString().substring(0, 100),
      bodyType: typeof streamBuffer,
      isBuffer: Buffer.isBuffer(streamBuffer)
    };
  } catch (error) {
    diagnostics.rawBodyAttempts.directStream = {
      success: false,
      error: error.message
    };
  }

  // Test 2: Check if body already consumed
  diagnostics.requestProperties = {
    readable: req.readable,
    readableEnded: req.readableEnded,
    readableFlowing: req.readableFlowing,
    readableLength: req.readableLength,
    destroyed: req.destroyed
  };

  // Test 3: Environment and Vercel info
  diagnostics.environment = {
    nodeVersion: process.version,
    isVercel: !!process.env.VERCEL,
    vercelRegion: process.env.VERCEL_REGION,
    vercelUrl: process.env.VERCEL_URL
  };

  // Test 4: Check specific headers that might indicate body issues
  diagnostics.bodyRelatedHeaders = {
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
    transferEncoding: req.headers['transfer-encoding'],
    stripeSignature: req.headers['stripe-signature']
  };

  return res.json(diagnostics);
}
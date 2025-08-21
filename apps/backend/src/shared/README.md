# Rate Limiting

## What It Does
- **Global**: 100 requests per minute for all endpoints
- **Auth**: Stricter limits on login (5/min) and registration (3/min)
- **Protection**: Stops brute force attacks and API abuse

## How It Works
- Uses NestJS ThrottlerModule with proxy-aware IP detection
- Applied globally via ThrottlerProxyGuard
- Custom limits only on sensitive auth endpoints

## Error Response
```json
{
  "success": false,
  "error": "Too many requests. Please try again in 1 minute.",
  "code": "TOO_MANY_REQUESTS"
}
```

That's it. Simple and effective.
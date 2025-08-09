This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 🚨 CRITICAL: React 19 + Next.js 15 Compatibility

**MUST USE TURBOPACK**: This application uses React 19 with Next.js 15, which REQUIRES Turbopack bundler to avoid webpack compatibility issues. The development server is already configured to use Turbopack automatically via the `--turbo` flag.

### Known Issue Resolved
The webpack bundler has a critical incompatibility with React 19's module system that causes runtime errors:
- Error: "undefined is not an object (evaluating 'originalFactory.call')"
- Solution: Use Turbopack instead of webpack (already configured)

## Getting Started

First, run the development server:

```bash
npm run dev  # Automatically uses Turbopack (--turbo flag)
# The above command runs: next dev --turbo
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

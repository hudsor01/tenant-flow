// Minimal server test to verify basic Fastify + NestJS routing
const { NestFactory } = require('@nestjs/core');
const { FastifyAdapter } = require('@nestjs/platform-fastify');

// Minimal test module
const { Module, Controller, Get } = require('@nestjs/common');

@Controller()
class TestController {
  @Get()
  getRoot() {
    return { message: 'Root endpoint working', timestamp: new Date().toISOString() };
  }

  @Get('health')
  getHealth() {
    return { status: 'ok', message: 'Health check working', timestamp: new Date().toISOString() };
  }
}

@Module({
  controllers: [TestController],
})
class TestModule {}

async function bootstrap() {
  console.log('🧪 Starting minimal server test...');
  
  const fastifyOptions = {
    logger: false,
    trustProxy: true,
  };

  const app = await NestFactory.create(
    TestModule,
    new FastifyAdapter(fastifyOptions)
  );

  // No global prefix - direct routing
  console.log('🛣️ No global prefix - testing direct routing');

  const port = 4600;
  await app.listen(port, '0.0.0.0');
  
  console.log(`✅ Minimal server running on http://0.0.0.0:${port}`);
  console.log(`Test endpoints:`);
  console.log(`  GET http://localhost:${port}/`);
  console.log(`  GET http://localhost:${port}/health`);
  
  // Test the endpoints
  setTimeout(async () => {
    try {
      const response1 = await fetch(`http://localhost:${port}/`);
      console.log(`📡 Root endpoint: ${response1.status} - ${await response1.text()}`);
      
      const response2 = await fetch(`http://localhost:${port}/health`);
      console.log(`📡 Health endpoint: ${response2.status} - ${await response2.text()}`);
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
    
    process.exit(0);
  }, 2000);
}

bootstrap().catch(error => {
  console.error('❌ Bootstrap failed:', error);
  process.exit(1);
});
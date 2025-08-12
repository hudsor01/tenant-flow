import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://bshjmbshupiibfiewpxb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaGptYnNodXBpaWJmaWV3cHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MDc1MDYsImV4cCI6MjA2Mzk4MzUwNn0.K9cR4SN_MtutRWPJsymtAtlHpEJFyfnQgtu8BjQRqko"
);

async function testAuth() {
  console.log("Testing Supabase authentication...");
  
  // Test email signup
  const testEmail = "test" + Date.now() + "@example.com";
  console.log("Testing signup with:", testEmail);
  
  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: "TestPassword123!"
  });
  
  if (error) {
    console.error("❌ Signup error:", error.message);
  } else {
    console.log("✅ Signup success:", data.user ? "User created" : "Check email for confirmation");
    console.log("User ID:", data.user?.id);
  }
  
  // Test Google OAuth URL generation
  console.log("\nTesting Google OAuth...");
  const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "http://localhost:3002/auth/callback"
    }
  });
  
  if (oauthError) {
    console.error("❌ OAuth error:", oauthError.message);
  } else {
    console.log("✅ OAuth URL generated successfully");
  }
}

testAuth().catch(console.error);

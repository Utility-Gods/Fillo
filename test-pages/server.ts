import { serve } from "bun";
import { file } from "bun";

const server = serve({
  port: 8080,
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;
    
    // Default to index.html
    if (pathname === "/") {
      pathname = "/index.html";
    }
    
    // Remove leading slash and get file path
    const filePath = `.${pathname}`;
    
    try {
      const fileContent = file(filePath);
      
      // Check if file exists
      if (await fileContent.exists()) {
        return new Response(fileContent);
      } else {
        return new Response("404 - File not found", { status: 404 });
      }
    } catch (error) {
      return new Response("500 - Server error", { status: 500 });
    }
  },
});

console.log(`🚀 Test pages server running at http://localhost:${server.port}`);
console.log(`📁 Serving files from: ${import.meta.dir}`);
console.log(`\n📋 Available test pages:`);
console.log(`   • http://localhost:${server.port} (index)`);
console.log(`   • http://localhost:${server.port}/basic-forms.html`);
console.log(`   • http://localhost:${server.port}/image-uploads.html`);
console.log(`   • http://localhost:${server.port}/complex-forms.html`);
console.log(`   • http://localhost:${server.port}/registration.html`);
console.log(`   • http://localhost:${server.port}/profile.html`);
console.log(`   • http://localhost:${server.port}/ecommerce.html`);
console.log(`   • http://localhost:${server.port}/debug-form.html`);
console.log(`\n💡 Press Ctrl+C to stop the server`);
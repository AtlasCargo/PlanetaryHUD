#!/usr/bin/env node

// Test script for book compression integration
const axios = require('axios');

const API_BASE = 'http://127.0.0.1:5999';

async function testCompression() {
  console.log('🧪 Testing Book Compression Integration...\n');
  
  try {
    // Test 1: Check if server is running
    console.log('1️⃣ Checking server status...');
    const healthCheck = await axios.get(`${API_BASE}/api/ideologram/fs`);
    console.log('✅ Server is running and responding');
    
    // Test 2: Test compression endpoint with sample text
    console.log('\n2️⃣ Testing compression endpoint...');
    const sampleText = `This is a sample text for testing the book compression system. 
    It contains multiple sentences to test the MDL compression pipeline. 
    The system should extract statements and create thesis summaries.`;
    
    const compressionResponse = await axios.post(`${API_BASE}/api/ideologram/compress`, {
      text: sampleText,
      bookId: 'test_book_001',
      title: 'Test Book',
      author: 'Test Author',
      docType: 'nonfiction'
    }, {
      headers: {
        'Authorization': 'Bearer USER_test_token',
        'x-user-email': 'test@example.com'
      }
    });
    
    console.log('✅ Compression endpoint working');
    console.log('📊 Compression results:', {
      bookId: compressionResponse.data.bookId,
      outputs: compressionResponse.data.outputs,
      summary: compressionResponse.data.summary
    });
    
    // Test 3: Check if compressed data appears in file system
    console.log('\n3️⃣ Checking file system for compressed data...');
    const fsResponse = await axios.get(`${API_BASE}/api/ideologram/fs`, {
      headers: {
        'Authorization': 'Bearer USER_test_token',
        'x-user-email': 'test@example.com'
      }
    });
    
    const compressedFile = fsResponse.data.children.find(f => f.name === 'compressed.json');
    if (compressedFile) {
      console.log('✅ Compressed data appears in file system');
      console.log('📁 File info:', {
        name: compressedFile.name,
        size: compressedFile.size,
        meta: compressedFile.meta
      });
    } else {
      console.log('❌ Compressed data not found in file system');
    }
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testCompression();

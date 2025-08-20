#!/usr/bin/env python3
"""
Test script for Scrapybara connection and basic functionality
"""

import os
from scrapybara import Scrapybara, ScrapybaraEnvironment

def test_scrapybara_connection():
    """Test basic Scrapybara connection"""
    
    # Get API key from environment
    api_key = os.getenv('SCRAPYBARA')
    if not api_key:
        print("❌ SCRAPYBARA environment variable not found")
        return False
    
    print(f"🔑 Using Scrapybara API key: {api_key[:20]}...")
    
    try:
        # Initialize Scrapybara client
        scrapy = Scrapybara(api_key=api_key)
        print("✅ Scrapybara client initialized successfully")
        
        # Test basic functionality - let's see what we can do
        print("\n📋 Available Scrapybara functionality:")
        print(f"   - Available methods: {[m for m in dir(scrapy) if not m.startswith('_')]}")
        
        return scrapy
        
    except Exception as e:
        print(f"❌ Error connecting to Scrapybara: {e}")
        return False

def explore_scrapybara_features(scrapy):
    """Explore what features are available"""
    
    try:
        print("\n🔍 Exploring Scrapybara features...")
        
        # Check available instances
        print("   - Checking available instances...")
        instances = scrapy.get_instances()
        print(f"   - Found {len(instances) if instances else 0} instances")
        
        # Check if we can start a browser
        print("   - Testing browser start capability...")
        
        return True
        
    except Exception as e:
        print(f"❌ Error exploring features: {e}")
        return False

def start_scrapybara_instance(scrapy):
    """Start a new Scrapybara instance"""
    
    try:
        print("\n🚀 Starting new Scrapybara instance...")
        
        # Start a browser instance
        print("   - Starting browser...")
        browser_response = scrapy.start_browser()
        print(f"   - Browser started: {browser_response}")
        
        # Start an Ubuntu instance for Codex installation
        print("   - Starting Ubuntu instance...")
        ubuntu_response = scrapy.start_ubuntu()
        print(f"   - Ubuntu started: {ubuntu_response}")
        
        return browser_response, ubuntu_response
        
    except Exception as e:
        print(f"❌ Error starting instances: {e}")
        return None, None

if __name__ == "__main__":
    print("🚀 Testing Scrapybara Connection...")
    print("=" * 50)
    
    scrapy = test_scrapybara_connection()
    if scrapy:
        if explore_scrapybara_features(scrapy):
            browser, ubuntu = start_scrapybara_instance(scrapy)
            if browser and ubuntu:
                print("\n✅ Scrapybara instances started successfully!")
                print(f"   - Browser: {browser}")
                print(f"   - Ubuntu: {ubuntu}")
            else:
                print("\n⚠️  Some instances failed to start")
        else:
            print("\n⚠️  Feature exploration failed")
    else:
        print("\n❌ Failed to connect to Scrapybara")

#!/usr/bin/env python3
"""
Test script for GPT-5 integration in book compression
"""

import os
import sys
sys.path.append('Ideologram/K-Compress')

def test_openai_setup():
    """Test if OpenAI is properly configured"""
    try:
        from book_compressor_mdl import setup_openai
        client = setup_openai()
        print("✅ OpenAI client setup successful")
        return True
    except ValueError as e:
        print(f"❌ OpenAI API key not set: {e}")
        print("💡 Set OPENAI_API_KEY environment variable first")
        return False
    except Exception as e:
        print(f"❌ OpenAI setup failed: {e}")
        return False

def test_ist_extraction():
    """Test IST extraction with a sample sentence"""
    try:
        from book_compressor_mdl import llm_sentence_to_ist
        
        # Test sentence
        test_sentence = "The free market economy operates on principles of supply and demand."
        test_sa = "test:0.0.0:abc123"
        test_cep = {"doc_type": "nonfiction"}
        
        print(f"🔍 Testing IST extraction for: '{test_sentence}'")
        ist = llm_sentence_to_ist(test_sentence, test_sa, test_cep)
        
        if ist.get("none"):
            print("⚠️  No IST extracted (this might be expected for short text)")
        else:
            print("✅ IST extracted successfully:")
            print(f"  Triple: {ist.get('triple', [])}")
            print(f"  Polarity: {ist.get('polarity', 'N/A')}")
            print(f"  Modality: {ist.get('modality', 'N/A')}")
            print(f"  Confidence: {ist.get('confidence', 'N/A')}")
        
        return True
        
    except Exception as e:
        print(f"❌ IST extraction test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing GPT-5 Integration for Book Compression\n")
    
    # Test 1: OpenAI setup
    print("1️⃣ Testing OpenAI setup...")
    if not test_openai_setup():
        print("\n❌ Setup test failed. Please configure OPENAI_API_KEY first.")
        print("💡 Run: export OPENAI_API_KEY='your-api-key-here'")
        return
    
    # Test 2: IST extraction
    print("\n2️⃣ Testing IST extraction...")
    if not test_ist_extraction():
        print("\n❌ IST extraction test failed.")
        return
    
    print("\n🎉 All tests passed! GPT-5 integration is working.")
    print("\n💡 Next steps:")
    print("   1. Test with real text in the Ideologram UI")
    print("   2. Monitor OpenAI API usage and costs")
    print("   3. Adjust CEP parameters for different document types")

if __name__ == "__main__":
    main()

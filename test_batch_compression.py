#!/usr/bin/env python3
"""
Test script for batch compression with GPT-5-nano
"""

import os
import sys
sys.path.append('Ideologram/K-Compress')

def test_batch_processing():
    """Test batch processing with a small sample"""
    try:
        from book_compressor_mdl import llm_sentence_to_ist_batch
        
        # Test sentences
        test_sentences = [
            {"text": "The free market economy operates on principles of supply and demand.", "sa": "test:0.0.0:abc123"},
            {"text": "Capitalism emphasizes private ownership and competition.", "sa": "test:0.0.1:def456"},
            {"text": "Socialism advocates for collective ownership of resources.", "sa": "test:0.0.2:ghi789"},
            {"text": "These economic systems represent different approaches to resource allocation.", "sa": "test:0.0.3:jkl012"}
        ]
        
        test_cep = {"doc_type": "nonfiction"}
        
        print("🧪 Testing batch processing with GPT-5-nano...")
        print(f"📝 Processing {len(test_sentences)} test sentences...")
        
        # Test with sentence limit
        ists = llm_sentence_to_ist_batch(test_sentences, test_cep, max_sentences=2)
        
        print(f"✅ Batch processing completed!")
        print(f"📊 Results: {len(ists)} ISTs generated")
        
        for i, ist in enumerate(ists):
            if ist.get("none"):
                print(f"  {i+1}. No statement extracted")
            else:
                print(f"  {i+1}. Statement: {' | '.join(ist.get('triple', []))}")
                print(f"     Confidence: {ist.get('confidence', 'N/A')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Batch processing test failed: {e}")
        return False

def main():
    """Run the test"""
    print("🧪 Testing GPT-5-nano Batch Compression\n")
    
    # Check if API key is set
    if not os.getenv('OPENAI_API_KEY'):
        print("❌ OPENAI_API_KEY not set!")
        print("💡 Run: export OPENAI_API_KEY='your-api-key-here'")
        return
    
    # Test batch processing
    if test_batch_processing():
        print("\n🎉 Batch processing test passed!")
        print("\n💡 Next steps:")
        print("   1. Test in the Ideologram UI with the '1000 Sentence Test' button")
        print("   2. Monitor OpenAI API usage and costs")
        print("   3. Check the compressed data in the file explorer")
    else:
        print("\n❌ Batch processing test failed.")

if __name__ == "__main__":
    main()

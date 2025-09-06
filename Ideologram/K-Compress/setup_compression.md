# GPT-5 Book Compression Setup

## Prerequisites

1. **Python 3.8+** installed
2. **OpenAI API Key** with access to GPT-5 models
3. **Internet connection** for API calls

## Installation

1. **Install Python dependencies:**
   ```bash
   cd Ideologram/K-Compress
   pip install -r requirements.txt
   ```

2. **Set OpenAI API Key:**
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   ```
   
   Or create a `.env` file:
   ```bash
   echo "OPENAI_API_KEY=your-api-key-here" > .env
   ```

## Configuration

### **Environment Variables:**
- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `MAX_SENTENCES_TEST`: Limit processing for testing (e.g., "1000")

### **Model Settings:**
- **Statement Extraction**: GPT-5-mini (cost-effective) or GPT-5-nano (ultra-cheap)
- **Embeddings**: text-embedding-3-small (1536 dimensions)
- **Temperature**: 0.1 (consistent output)
- **Rate Limiting**: 0.2s delay between batches
- **Batch Size**: 20 sentences per API call (configurable)

### **Test Mode:**
For large books, use test mode to limit processing:
```bash
export MAX_SENTENCES_TEST=1000
python3 book_compressor_mdl.py --book_id "test" --txt_path "book.txt" --out_dir "./output"
```

This processes only the first 1000 sentences, perfect for testing and cost control.

## Usage

### **Basic Compression:**
```bash
python3 book_compressor_mdl.py \
  --book_id "my_book" \
  --txt_path "./book.txt" \
  --out_dir "./output" \
  --cep "./cep.json"
```

### **Document Type Presets:**
- **Fiction**: Lower density, stricter thresholds
- **Nonfiction**: Balanced settings
- **Academic Papers**: Higher density, more lenient thresholds
- **Math/Biology**: Specialized settings

### **Scaling Guidelines:**

#### **Small Books (<1k sentences):**
- **Processing Time**: <1 minute
- **Memory Usage**: <100MB
- **Output**: Complete pipeline
- **Use Case**: Testing, short texts

#### **Medium Books (1k-5k sentences):**
- **Processing Time**: 2-10 minutes
- **Memory Usage**: 100MB-1GB
- **Output**: Full compression
- **Use Case**: Academic papers, medium texts

#### **Large Books (5k+ sentences):**
- **Processing Time**: 10-60+ minutes
- **Memory Usage**: 1GB+
- **Output**: Partial (may stop at synthesis)
- **Use Case**: Full books, long documents
- **Recommendation**: Use test mode first (1000 sentence limit)

### **Real-World Example:**
**"What We Owe the Future" (William MacAskill):**
- **Size**: 743,866 characters (~150-200k words)
- **Sentences**: 6,904
- **Statements**: 4,764 (69% extraction rate)
- **Processing**: ✅ Segmentation, ✅ Extraction, ✅ Embeddings, ❌ Synthesis
- **File Sizes**: 1.3MB sentences, 1.9MB statements, 10.6MB embeddings
- **Status**: Fallback system completed basic extraction, synthesis phase failed

## Output Files

- `sentences.jsonl` - Sentence breakdown with addresses
- `ists.jsonl` - Information Structure Triples
- `embeddings.npy` - Semantic embeddings (1536D)
- `paraphrase_clusters.json` - Similarity clusters
- `chapter_cores.jsonl` - Chapter-level summaries
- `book_core.json` - Book thesis summaries
- `density_report.json` - Text complexity metrics

## Cost Estimation

### **GPT-5-nano (Statement Extraction):**
- Input: ~$0.05 per 1M tokens
- Output: ~$0.20 per 1M tokens
- **Typical book (100k words)**: ~$0.15-0.30

### **text-embedding-3-small:**
- **$0.00002 per 1K tokens**
- **Typical book (100k words)**: ~$0.002

### **Total Cost per Book:**
- **Small book (50k words)**: ~$0.10-0.20
- **Medium book (100k words)**: ~$0.15-0.30
- **Large book (200k words)**: ~$0.30-0.60

## Troubleshooting

### **API Key Issues:**
```bash
# Test API key
python3 -c "
import openai
import os
client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
print('✅ API key working')
"
```

### **Rate Limiting:**
- Increase delay in `time.sleep(0.2)` if needed
- Monitor OpenAI dashboard for usage

### **Memory Issues:**
- Large books may need more RAM
- Use test mode (1000 sentence limit) for very long texts
- Monitor memory usage during processing

### **Pipeline Failures:**
- **Synthesis phase fails**: Common with large books
- **Solution**: Use test mode or process in chunks
- **Fallback**: Basic extraction still works

### **Process Monitoring:**
- **Timeout protection**: 30-minute backend timeout, 35-minute frontend timeout
- **Health checks**: Backend monitors for stuck processes (5+ minutes no output)
- **Progress tracking**: Real-time batch processing updates
- **Memory monitoring**: Tracks process memory usage

### **Monitoring Tools:**
```bash
# Monitor compression processes
python3 monitor_compression.py

# Check backend logs for progress
tail -f server/logs/compression.log

# Kill stuck processes
pkill -f book_compressor_mdl.py
```

## Integration with Ideologram

The compression system is now fully integrated with:
- ✅ **Backend API**: `/api/ideologram/compress`
- ✅ **Frontend UI**: "Compress & Analyze" + " 1000 Sentence Test" buttons
- ✅ **File Explorer**: Shows compressed data
- ✅ **Real-time Processing**: GPT-5-nano statement extraction
- ✅ **Batch Processing**: 20 sentences per API call

## Next Steps

1. **Test with real books** to validate quality
2. **Use 1000 sentence test mode** for large books
3. **Monitor costs** and optimize API usage
4. **Scale processing** for production use

## Output Files

- `sentences.jsonl`
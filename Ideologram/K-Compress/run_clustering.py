import sys
import os
sys.path.append('Ideologram/K-Compress')
from book_compressor_mdl import paraphrase_clusters, summarize_cluster_to_ist, cluster_centroid
import json

# Redirect stdout to stderr for debug messages, then restore for JSON output
original_stdout = sys.stdout
sys.stdout = sys.stderr

# Read existing data
with open('/Users/mo/Desktop/Prj/programming/PlanetaryHUD/server/compressed/USER_test_token/test/test/ists.jsonl', 'r') as f:
    ists = [json.loads(line) for line in f if line.strip()]

# Create fake embeddings for now (same dimension)
import numpy as np
embs = [np.random.random(1536).tolist() for _ in range(len(ists))]

# Run clustering (debug output goes to stderr)
clusters = paraphrase_clusters(ists, embs, sim_thresh=0.85, ncd_thresh=0.38, min_cluster=2)

# Generate cluster summaries
protos = []
for i, cluster in enumerate(clusters):
    cluster_ists = [ists[j] for j in cluster]
    proto = summarize_cluster_to_ist(cluster_ists)
    proto['id'] = 'test:cluster:' + str(i)
    proto['coverage'] = len(cluster)
    proto['centroid'] = cluster_centroid(embs, cluster)
    protos.append(proto)

# Save results
output = {
    'clusters': clusters,
    'protos': protos,
    'n_clusters': len(clusters)
}

# Restore stdout and print only JSON
sys.stdout = original_stdout
print(json.dumps(output))
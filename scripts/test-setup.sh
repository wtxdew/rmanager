#!/bin/bash
# Create test data for local development

set -e

echo "[INFO] Creating test data..."

# Create directories
mkdir -p testdata/{xochitl,books,screen}

# Create 5 test documents
for i in {1..2}; do
	UUID="test-uuid-00$i"

	cat >"testdata/xochitl/$UUID.metadata" <<EOF
{
  "deleted": false,
  "lastModified": "$(date +%s)000",
  "metadatamodified": false,
  "modified": false,
  "parent": "",
  "pinned": false,
  "synced": false,
  "type": "DocumentType",
  "version": 1,
  "visibleName": "Test Document $i"
}
EOF

	cat >"testdata/xochitl/$UUID.content" <<EOF
{"fileType":"pdf"}
EOF

	# Create empty PDF file with random size
	dd if=/dev/zero of="testdata/xochitl/$UUID.pdf" bs=1024 count=$((RANDOM % 1000 + 100)) 2>/dev/null

	echo "[OK] Created test document $i (UUID: $UUID)"
done

echo ""
echo "[OK] Test data created successfully"
echo "[INFO] Location: $(pwd)/testdata"

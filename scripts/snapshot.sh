#!/bin/bash
# Creates a versioned JSON snapshot of the current intent model for diffing.
# Run this BEFORE bumping the version in model.ts.
set -e

MODEL_FILE="src/domain/intent-model/model.ts"
HISTORY_DIR="src/domain/intent-model/history"

# Extract version from model.ts
VERSION=$(grep "version:" "$MODEL_FILE" | head -1 | sed "s/.*'\(.*\)'.*/\1/")

if [ -z "$VERSION" ]; then
  echo "Error: Could not extract version from $MODEL_FILE"
  exit 1
fi

SNAPSHOT_FILE="$HISTORY_DIR/$VERSION.json"

if [ -f "$SNAPSHOT_FILE" ]; then
  echo "Snapshot $SNAPSHOT_FILE already exists. Bump the version first."
  exit 1
fi

# Use a tiny Node script to import the TS model and output JSON
node -e "
  const { register } = require('tsx/cjs/api');
  register();
  const { intentModel } = require('./$MODEL_FILE');
  const fs = require('fs');
  fs.writeFileSync('$SNAPSHOT_FILE', JSON.stringify(intentModel, null, 2));
  console.log('Snapshot created: $SNAPSHOT_FILE');
"

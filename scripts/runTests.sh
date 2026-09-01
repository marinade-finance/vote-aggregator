#!/usr/bin/env bash

export RUST_LOG=

echo "============= Contact tests:"
pushd packages/tests && pnpm test && popd
echo "============= SDK tests:"
pushd packages/sdk && pnpm test && popd
echo "============= CLI tests:"
pushd packages/cli && pnpm test && popd
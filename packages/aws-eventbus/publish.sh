#!/bin/bash

# Create an NPM token that bypasses the 2FA. Then set that token as env var.
npm config set //registry.npmjs.org/:_authToken=$NPM_TOKEN
set -e
set -o pipefail

npm run build --prefix packages/aws-eventbus

# printf -- '---\n"graphql-eventbus-aws-eventbus": patch\n---\n\nForce snapshot' > .changeset/force-snapshot-test.md

# 2. Generate the snapshot version numbers
CI=true npx changeset version --snapshot next

# 3. Publish the built files
CI=true npx changeset publish --tag next
#!/bin/bash

set -e
set -o pipefail

npm run build --prefix packages/aws-eventbus

# printf -- '---\n"graphql-eventbus-aws-eventbus": patch\n---\n\nForce snapshot' > .changeset/force-snapshot-test.md

# 2. Generate the snapshot version numbers
CI=true npx changeset version --snapshot next

# 3. Publish the built files
CI=true npx changeset publish --tag next
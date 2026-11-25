#!/usr/bin/env bash
# Publish an already-tested Snack Dash build.
set -euo pipefail
for name in RELEASE_TAG GITHUB_REPOSITORY GITHUB_SHA GITHUB_EVENT_NAME GH_TOKEN; do
  if [[ -z "${!name:-}" ]]; then
    echo "::error::Missing $name"
    exit 1
  fi
done
for file in dist/Snack_Dash.html dist/Snack_Dash_HTML.zip; do
  if [[ ! -s "$file" ]]; then
    echo "::error::Missing build artifact $file"
    exit 1
  fi
done

# Manual runs create a lightweight tag explicitly. A previous failed attempt
# may have created this tag; reuse it only when it targets this exact commit.
if [[ "$GITHUB_EVENT_NAME" == "workflow_dispatch" ]]; then
  previous="$(gh api "repos/$GITHUB_REPOSITORY/git/ref/tags/$RELEASE_TAG" --jq .object.sha 2>/dev/null)" || previous=""
  if [[ -n "$previous" && "$previous" != "$GITHUB_SHA" ]]; then
    echo "::error::Tag $RELEASE_TAG already targets another commit: $previous"
    exit 1
  fi
  if [[ -z "$previous" ]]; then
    tagged=false
    for attempt in 1 2 3 4; do
      if gh api -X POST "repos/$GITHUB_REPOSITORY/git/refs" \
        -f "ref=refs/tags/$RELEASE_TAG" -f "sha=$GITHUB_SHA"; then
        tagged=true
        break
      fi
      previous="$(gh api "repos/$GITHUB_REPOSITORY/git/ref/tags/$RELEASE_TAG" --jq .object.sha 2>/dev/null)" || previous=""
      if [[ "$previous" == "$GITHUB_SHA" ]]; then
        tagged=true
        break
      fi
      if [[ "$attempt" -lt 4 ]]; then
        echo "::warning::Tag API failed; retry $((attempt + 1))/4"
        sleep $((attempt * 5))
      fi
    done
    if [[ "$tagged" != true ]]; then
      echo "::error::Cannot create tag $RELEASE_TAG after four attempts"
      exit 1
    fi
  fi
fi

# Creating a release can return HTTP 500 even if it committed remotely.
# Check whether it exists before each retry; do not create duplicate releases.
created=false
for attempt in 1 2 3 4; do
  if gh release view "$RELEASE_TAG" --repo "$GITHUB_REPOSITORY" >/dev/null 2>&1; then
    created=true
    break
  fi
  if gh release create "$RELEASE_TAG" \
    --repo "$GITHUB_REPOSITORY" \
    --title "Snack Dash $RELEASE_TAG" \
    --notes "Snack Dash offline HTML build $RELEASE_TAG" \
    --verify-tag; then
    created=true
    break
  fi
  if gh release view "$RELEASE_TAG" --repo "$GITHUB_REPOSITORY" >/dev/null 2>&1; then
    created=true
    break
  fi
  if [[ "$attempt" -lt 4 ]]; then
    echo "::warning::Release API failed; retry $((attempt + 1))/4"
    sleep $((attempt * 5))
  fi
done
if [[ "$created" != true ]]; then
  echo "::error::Release API still failing after four attempts; tests and build succeeded"
  exit 1
fi

# Upload is separate: a failed asset request cannot hide whether creation worked.
uploaded=false
for attempt in 1 2 3 4; do
  if gh release upload "$RELEASE_TAG" \
    dist/Snack_Dash.html dist/Snack_Dash_HTML.zip \
    --repo "$GITHUB_REPOSITORY" --clobber; then
    uploaded=true
    break
  fi
  if [[ "$attempt" -lt 4 ]]; then
    echo "::warning::Release asset upload failed; retry $((attempt + 1))/4"
    sleep $((attempt * 5))
  fi
done
if [[ "$uploaded" != true ]]; then
  echo "::error::Release exists, but asset upload failed after four attempts"
  exit 1
fi
assets="$(gh release view "$RELEASE_TAG" --repo "$GITHUB_REPOSITORY" --json assets --jq '.assets[].name')"
grep -Fxq 'Snack_Dash.html' <<< "$assets"
grep -Fxq 'Snack_Dash_HTML.zip' <<< "$assets"
echo "Release $RELEASE_TAG published with both assets."

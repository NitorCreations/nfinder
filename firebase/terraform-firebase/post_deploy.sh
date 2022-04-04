#!/bin/bash

cat <<EOF > .firebaserc
{
  "projects": {
    "default": "$GOOGLE_PROJECT_ID"
  }
}
EOF

firebase --project $GOOGLE_PROJECT_ID deploy --only firestore:rules

#--token $(gcloud auth application-default print-access-token)

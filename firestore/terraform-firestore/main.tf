variable "GOOGLE_LOCATION" {}
variable "GOOGLE_FOLDER_ID" {}
variable "GOOGLE_BILLING_ID" {}
variable "GOOGLE_STORAGE_LOCATION" {}
variable "GOOGLE_PROJECT_ID" {}
variable "GOOGLE_SERVICE_ACCOUNT_SECRET_NAME" {}

provider "google" {
  region = var.GOOGLE_LOCATION
  project  = var.GOOGLE_PROJECT_ID
}

provider "google-beta" {
  region = var.GOOGLE_LOCATION
  project  = var.GOOGLE_PROJECT_ID
}

resource "google_project_service" "project" {
  service = "firebaserules.googleapis.com"
  disable_dependent_services = true
}

resource "google_project_service" "firestore" {
  service = "firestore.googleapis.com"
  disable_dependent_services = true
}
resource "google_project_service" "identitytoolkit" {
  service = "identitytoolkit.googleapis.com"
  disable_dependent_services = true
}

# resource "google_project_service" "iap" {
#   service = "iap.googleapis.com"
#   disable_dependent_services = true
# }


# Would love to create the projects with terraform too but somehow permissions end up not allowing web app access to
# Firestore. There appears to be some magic in creating projects through the web console.

resource "google_project" "nfinder" {
  name = var.GOOGLE_PROJECT_ID
  project_id = var.GOOGLE_PROJECT_ID
  folder_id = var.GOOGLE_FOLDER_ID
  auto_create_network = false
  billing_account = var.GOOGLE_BILLING_ID
}

resource "google_firebase_project" "default" {
  provider = google-beta
  # Would be great to specify the auth config but not possible
}

resource "google_app_engine_application" "app" {
  location_id = var.GOOGLE_LOCATION
  database_type = "CLOUD_FIRESTORE"
  depends_on = [google_project.nfinder]
}

resource "google_firebase_web_app" "basic" {
    provider = google-beta
    display_name = "nFinder Web App"
    depends_on = [google_firebase_project.default]
}

data "google_firebase_web_app_config" "basic" {
  provider   = google-beta
  web_app_id = google_firebase_web_app.basic.app_id
}

# Support email given here should be a google group owned by the account running terraform or working email address
# of account running terraform :(

# resource "google_iap_brand" "project_brand" {
#   depends_on = [
#     google_project_service.iap
#   ]
#   support_email     = "mika.majakorpi@nitor.com"
#   application_title = "nFinder"
# }

# This is the only way to create a oauth2 client id using API. But with this there is no way to configure
# authorized origins or redirect URIs for use with a generic web app... GCP basically lacks a public API endpoint
# for proper automated creation of OAuth 2.0 Client IDs.
# resource "google_iap_client" "project_client" {
#   display_name = "nFinder"
#   brand        =  google_iap_brand.project_brand.name

# }

# resource "google_identity_platform_default_supported_idp_config" "default" {
#   idp_id = "google.com"
#   client_id = google_iap_client.project_client.client_id
#   client_secret = google_iap_client.project_client.secret
#   enabled = "true"
# }

resource "google_storage_bucket" "default" {
    provider = google-beta
    name     = "fb-webapp-${google_project.nfinder.project_id}"
    location = var.GOOGLE_STORAGE_LOCATION
}

resource "google_storage_bucket_object" "default" {
    depends_on = [google_project.nfinder]
    provider = google-beta
    bucket = google_storage_bucket.default.name
    name = "firebase-config.json"

    content = jsonencode({
        appId              = google_firebase_web_app.basic.app_id
        apiKey             = data.google_firebase_web_app_config.basic.api_key
        authDomain         = data.google_firebase_web_app_config.basic.auth_domain
        databaseURL        = lookup(data.google_firebase_web_app_config.basic, "database_url", "")
        storageBucket      = lookup(data.google_firebase_web_app_config.basic, "storage_bucket", "")
        messagingSenderId  = lookup(data.google_firebase_web_app_config.basic, "messaging_sender_id", "")
        measurementId      = lookup(data.google_firebase_web_app_config.basic, "measurement_id", "")
    })
}


# Cross cloud access setup
resource "google_service_account" "cross-cloud" {
  depends_on = [google_project.nfinder]
  account_id   = "nfinder-cross-cloud"
  display_name = "nFinder Cross Cloud Service Account"
}

resource "google_service_account_key" "cross-cloud-key" {
  depends_on = [google_project.nfinder]
  service_account_id = google_service_account.cross-cloud.name
}

resource "aws_secretsmanager_secret" "google-credentials" {
  name = var.GOOGLE_SERVICE_ACCOUNT_SECRET_NAME
}

resource "aws_secretsmanager_secret_version" "google-credentials" {
  secret_id     = aws_secretsmanager_secret.google-credentials.id
  secret_string = base64decode(google_service_account_key.cross-cloud-key.private_key)
}

# resource "google_project_iam_policy" "project" {
#   project = var.GOOGLE_PROJECT_ID
#   policy_data = data.google_iam_policy.crosscloud.policy_data
# }

resource "google_project_iam_binding" "project" {
  project = google_project.nfinder.project_id
  role    = "roles/firebase.admin"
  members = [
    "serviceAccount:${google_service_account.cross-cloud.email}"
  ]
}

                #  - {
                #       - members = [
                #           - "serviceAccount:firebase-service-account@firebase-sa-management.iam.gserviceaccount.com",
                #         ]
                #       - role    = "roles/firebase.managementServiceAgent"
                #     },
 
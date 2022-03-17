variable "GOOGLE_LOCATION" {}
variable "GOOGLE_FOLDER_ID" {}
variable "GOOGLE_BILLING_ID" {}
variable "GOOGLE_STORAGE_LOCATION" {}
variable "GOOGLE_PROJECT_ID" {}

provider "google" {
  region = var.GOOGLE_LOCATION
  project  = var.GOOGLE_PROJECT_ID
}

provider "google-beta" {
  region = var.GOOGLE_LOCATION
  project  = var.GOOGLE_PROJECT_ID
}

resource "google_project" "nfinder" {
  name = "nfinder"
  project_id = var.GOOGLE_PROJECT_ID
  folder_id = var.GOOGLE_FOLDER_ID
  auto_create_network = false
  billing_account = var.GOOGLE_BILLING_ID
}

resource "google_project_service" "project" {
  service = "firebaserules.googleapis.com"
  disable_dependent_services = true
}

resource "google_project_service" "identitytoolkit" {
  service = "identitytoolkit.googleapis.com"
  disable_dependent_services = true
}

resource "google_project_service" "iap" {
  service = "iap.googleapis.com"
  disable_dependent_services = true
}

resource "google_firebase_project" "default" {
  provider = google-beta
}

resource "google_app_engine_application" "app" {
  location_id = var.GOOGLE_LOCATION
  database_type = "CLOUD_FIRESTORE"
}

resource "google_firebase_web_app" "basic" {
    provider = google-beta
    display_name = "Display Name Basic"

    depends_on = [google_firebase_project.default]
}

data "google_firebase_web_app_config" "basic" {
  provider   = google-beta
  web_app_id = google_firebase_web_app.basic.app_id
}

resource "google_iap_brand" "project_brand" {
  depends_on = [
    google_project_service.iap
  ]
  support_email     = "mika.majakorpi@nitor.com"
  application_title = "nFinder"
}

# This is the only way to create a oauth2 client id using API. But with this there is no way to configure
# authorized origins or redirect URIs for use with a generic web app... GCP basically lacks a public API endpoint
# for proper automated creation of OAuth 2.0 Client IDs.
resource "google_iap_client" "project_client" {
  display_name = "nFinder"
  brand        =  google_iap_brand.project_brand.name

}

resource "google_identity_platform_default_supported_idp_config" "default" {
  idp_id = "google.com"
  client_id = google_iap_client.project_client.client_id
  client_secret = google_iap_client.project_client.secret
  enabled = "true"
}

resource "google_storage_bucket" "default" {
    provider = google-beta
    name     = "fb-webapp-${google_project.nfinder.project_id}"
    location = var.GOOGLE_STORAGE_LOCATION
}

resource "google_storage_bucket_object" "default" {
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


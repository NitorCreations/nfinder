# nFinder

Demo app for Nameless Deploy Tools (`ndt`) multi cloud deployment.

# Overview

See our blog post TODO LINK for context.

# Deployment

Here’s how nFinder is deployed:

1. Install `ndt` with pipx, for example: `pipx install nameless-deploy-tools`

1. Install AWS CDK, Terraform and Azure CLI. These are the deployment tools `ndt` depends on for this project.

1. Clone the repo: `git clone https://github.com/NitorCreations/nfinder`

1. Set up an active CLI session for each cloud. `ndt` supports credential profiles for AWS and Azure which helps here: `ndt enable-profile -a my-aws-profile`, `ndt enable-profile -s my-azure-subscription`. Configuring the profiles is a separate step instructed in `ndt` documentation. For Google, activate a service account for your CLI session: `export GOOGLE_APPLICATION_CREDENTIALS=/path/to/keyfile.json`. This step can be automated to happen upon entering the project directory for AWS and Azure.

1. Set properties in `infra.properties` to match your cloud environment. This is the main `ndt` configuration file. Further properties can be set and overridden in an `infra.properties` file in the component and project directories. Branch specific values can be given in `infra-${branchName}.properties` files at all levels.The demo setup assumes you have an existing Google billing account and a folder where your service account is allowed to create a project. For AWS, it assumes you have an existing domain and a Route 53 hosted zone.

1. Deploy the Azure Vision API: `ndt deploy-azure vision vision`.

1. Deploy the Firebase app: `ndt deploy-terraform firebase firebase`

    Google’s infrastructure as code support is a bit lacking here. You’ll need to go to your Firebase web console and enable the Google authentication support for this project. There’s no way to do this programmatically with a public API!

1. Deploy the AWS backend: `ndt deploy-cdk aws api`

    Note how the API deployment references an API key output value from the Vision API deployment using an `ndt` AzRef entry in `aws/cdk-api/infra.properties`: `VISION_API_KEY={AzRef: {component: vision, azure: vision, paramName: visionApiKey}}`. The API key is set as an environment variable for the image handler Lambda function so that it can access the Azure Computer Vision API.

1. Deploy the AWS frontend: `ndt deploy-cdk aws frontend`

That’s it, you should have nFinder available at the domain name you chose in infra.properties! If you’d rather see the app we deployed, go have a look at https://nfinder.nitorio.us!

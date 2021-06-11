# Piston Test Runner

A wrapper on [Piston](https://github.com/engineer-man/piston) (general purpose code execution engine) that enables Codee to support many programming languages.

## Local Development

Build and run the API: `docker compose up`

Open `examples.http` in VS Code to call the API (requires the [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) extension)


## Deployment

Prerequisites:
- Google Cloud SDK (`gcloud`) installed and authenticated

### Create a new environment/project

1. Enable Cloud Run and GCR (one-time only)

   ```bash
   gcloud services enable run.googleapis.com containerregistry.googleapis.com --project=codee-club-dev
   ```

2. Create service account for Cloud Run to run as

   ```bash
   gcloud iam service-accounts create cloudrun-runner \
     --display-name="cloudrun-runner" --project=codee-club-dev
   ```

3. Give the service account read access to Cloud Storage

   ```bash
   gcloud projects add-iam-policy-binding codee-club-dev \
     --member=serviceAccount:cloudrun-runner@codee-club-dev.iam.gserviceaccount.com \
     --role=roles/storage.objectViewer
   ```

### Setup GitHub Actions deployment

1. Create service account for deployment

   ```bash
   gcloud iam service-accounts create github-cicd \
     --display-name="github-cicd" --project=codee-club-dev
   ```

   Note: the `github-cicd` service account is shared with the GitHub Action for the main Codee Club repo (it may exist already).

2. Add Cloud Run Admin role to service account

   ```bash
   gcloud projects add-iam-policy-binding codee-club-dev \
     --member=serviceAccount:github-cicd@codee-club-dev.iam.gserviceaccount.com \
     --role=roles/run.admin

   gcloud projects add-iam-policy-binding codee-club-dev \
     --member=serviceAccount:github-cicd@codee-club-dev.iam.gserviceaccount.com \
     --role=roles/storage.admin

   gcloud projects add-iam-policy-binding codee-club-dev \
     --member=serviceAccount:github-cicd@codee-club-dev.iam.gserviceaccount.com \
     --role=roles/iam.serviceAccountUser
   ```

3. Download the json key

   ```bash
   gcloud iam service-accounts keys create github-cicd.codee-club-dev.json \
    --iam-account github-cicd@codee-club-dev.iam.gserviceaccount.com
   ```

5. Add the service account json key to GitHub secrets (e.g. DEV_GCP_SERVICE_ACCOUNT_KEY).

### Test

```bash
curl -H \
  "Authorization: Bearer $(gcloud auth print-identity-token)" \
  https://runner-piston-r3bka4fkka-uc.a.run.app/api
```

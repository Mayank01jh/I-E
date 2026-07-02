# Deploying FastAPI Backend (`ie-backend`) to AWS ECR

This guide outlines the terminal procedure to build, tag, and push the backend Docker image to Amazon ECR (Elastic Container Registry).

---

### Step 1: Authenticate Local Terminal with AWS

Before running docker commands, your terminal needs permission to interact with your AWS account.

1. Install the **AWS CLI** if you haven't already.
2. Configure it with your IAM User access keys:
```bash
aws configure
```

*You will be prompted to enter your `AWS Access Key ID`, `AWS Secret Access Key`, and your default deployment `region` (e.g., `us-east-1`).*

---

### Step 2: Create an ECR Repository

You need a private folder (repository) inside AWS to hold your Docker images. Run this command to create one named `ie-backend`:

```bash
aws ecr create-repository --repository-name ie-backend --region <your-region>
```

*(This can also be done manually by clicking "Create Repository" inside the AWS ECR Console).*

---

### Step 3: Authenticate Docker with AWS ECR

AWS requires a dynamic login token to let Docker push images to its registry. Run this command to log Docker into your specific AWS registry space:

```bash
aws ecr get-login-password --region <your-region> | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.<your-region>.amazonaws.com
```

> 💡 **Tip:** Replace `<your-region>` with your actual AWS region (like `us-east-1`) and `<aws_account_id>` with your 12-digit AWS account number.

---

### Step 4: Build, Tag, and Push the Image

Navigate to the root folder where your FastAPI `Dockerfile` resides (`backend/`), then run these three commands in order:

```bash
# 1. Build the local docker image
docker build -t ie-backend .

# 2. Tag the image with your remote AWS ECR Registry path
docker tag ie-backend:latest <aws_account_id>.dkr.ecr.<your-region>.amazonaws.com/ie-backend:latest

# 3. Push the image up to AWS cloud storage
docker push <aws_account_id>.dkr.ecr.<your-region>.amazonaws.com/ie-backend:latest
```

---

### Step 5: Pulling it onto your Target Service

Once the push completes, the image is securely stored on AWS.

* **If using App Runner:** Go to the App Runner Console, click **Create Service**, select **Container Registry -> ECR**, and browse for the `ie-backend:latest` image you just uploaded.
* **If using EC2:** SSH into your Ubuntu instance, run the step 3 authentication login command on the server, and pull down your fresh build:
```bash
docker pull <aws_account_id>.dkr.ecr.<your-region>.amazonaws.com/ie-backend:latest
```


# Pocket Predict

Pocket Predict is a web application for visualizing protein pockets. It allows users to input a PDB ID or upload a PDB file, view pocket data in tables (using GrASP and P2Rank), and visualize protein structures in 3D. Built with Next.js, Tailwind CSS, and 3dmol, the app is containerized using Docker for easy deployment.


## Getting Started

Follow these steps to clone, build, and run the Pocket Predict app.

### 1. Clone the Repository

Clone the repository to your local machine:

```bash
git clone https://github.com/your-username/pocket-predict.git
cd pocket-predict
```


### 2. Build the Docker Image

Build the Docker image using the provided Dockerfile:

```bash
docker build -t pocket-predict .
```

This will create a Docker image named `pocket-predict` with the Next.js app ready for production.


### 3. Run the App

Run the Docker container, mapping port 3000 to your local machine:

```bash
docker run -d --name pocket-predict \
  -p 3000:3000 \
  --network api_connect \
  --ulimit nofile=65535:65535 \
  pocket-predict
```

- `-p 3000:3000`: Maps port 3000 on your machine to port 3000 in the container.
- `--network api_connect`: Connects the container to the `api_connect` network running on own4.
  

You should see the Pocket Predict app. You can now:

- Enter a PDB ID (e.g., `4NR5`) or upload a `.pdb` file.
- View pocket data in tables (GrASP and P2Rank).
- Visualize protein structures in 3D by selecting a visualization and pocket.

### 6. Stop the App

When you’re done, stop and remove the container:

```bash
docker stop pocket-predict
docker rm pocket-predict
```


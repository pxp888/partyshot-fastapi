cd backend
python upload_static.py
cd ..
podman build --platform linux/amd64 -t shareshot1 .
podman tag localhost/shareshot1:latest 431754448027.dkr.ecr.eu-north-1.amazonaws.com/shareshot1:latest
podman push 431754448027.dkr.ecr.eu-north-1.amazonaws.com/shareshot1:latest

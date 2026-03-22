aws ecr get-login-password --region eu-north-1 | podman login --username AWS --password-stdin 431754448027.dkr.ecr.eu-north-1.amazonaws.com

cd frontend
npm run build
cd ..

cd backend
python upload_static.py
cd ..
podman build --platform linux/amd64 -t shareshot1 .
podman tag localhost/shareshot1:latest 431754448027.dkr.ecr.eu-north-1.amazonaws.com/shareshot1:latest
podman push 431754448027.dkr.ecr.eu-north-1.amazonaws.com/shareshot1:latest

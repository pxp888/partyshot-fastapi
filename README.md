**📸 shareShots**  

![screen0](frontend/src/assets/screen0.webp)

![screen2](frontend/src/assets/screen2.webp)

![screen1](frontend/src/assets/screen1.webp)


**shareShots** is a high-performance, real-time photo-sharing platform designed for seamless event photography and collaborative albums. Built with a modern tech stack, it features direct-to-R2 uploads, real-time WebSocket updates, and a glassmorphic React interface.  
[www.shareshot.eu](https://www.shareshot.eu/ "https://www.shareshot.eu/")  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANElEQVR4nO3OMQ0AIAwAwZIgBKn1gjJsdGLBABMhuZt+/JaZIyJmAADwi9VP1NMNAABu1AaU4gUeBSGW2wAAAABJRU5ErkJggg==)  
**✨ Project Preview**  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAADUlEQVR4nGP4//8/AwAI/AL+p5qgoAAAAABJRU5ErkJggg==)  
   
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAADUlEQVR4nGP4//8/AwAI/AL+p5qgoAAAAABJRU5ErkJggg==)  
*Experience a clean, modern, and minimal design tailored for effortless photo sharing.*  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANklEQVR4nO3OMQ2AABAAsSNhYMEBIpD4ArCJDyywEZJWQZeZOaorAAD+4l6rrTq/ngAA8Nr+AEqmA1hl45m5AAAAAElFTkSuQmCC)  
**🚀 Key Features**  
- **🔐 Secure Authentication**: JWT-based user accounts with persistent sessions and authorized WebSocket connections.  
- **📁 Collaborative Albums**: Create albums with granular permissions:  
- **Open**: Allow anyone to contribute photos to your event.  
- **Profile**: Showcase your best work on your profile.  
- **☁️ Direct R2 Uploads**: Files bypass the server and go straight to Cloudflare R2 via presigned URLs, ensuring maximum performance and minimal server load.  
- **⚡ Real-time Updates**: Instant UI refreshes across all devices using Redis Pub/Sub and WebSockets.  
- **🖼️ Smart Metadata**: Automatic tracking of photo sizes and dimensions via background workers.  
- **🛠️ Cloud-Native Stack**: Fully serverless container architecture with zero open inbound ports.  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANklEQVR4nO3OQQmAABRAsSfYxZo/kSGMYQLPJrCCNxG2BFtmZquOAAD4i3Ot7mr/egIAwGvXA4qrBdGuSdJuAAAAAElFTkSuQmCC)  
**🛠️ Tech Stack**  
**Backend & Infrastructure**  
- **FastAPI**: Asynchronous Python framework for high-concurrency APIs.  
- **AWS Fargate**: Serverless container execution for API and background workers.  
- **Amazon RDS**: Managed PostgreSQL database for reliable metadata storage.  
- **Amazon ElastiCache (Redis OSS)**: Powering real-time messaging and WebSocket synchronization.  
- **Arq**: Distributed background job processing.  
- **Cloudflare R2**: Scalable S3-compatible object storage for high-resolution images.  
- **Cloudflare Tunnel**: Secure outbound-only connection bypassing the need for AWS ALBs or open ports.  
**Frontend**  
- **React 18**: Modern UI development with Hooks and Context API.  
- **Vite**: Lightning-fast build tool and development server.  
- **Vanilla CSS**: Premium, custom-crafted styles with a focus on aesthetics.  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANElEQVR4nO3OQQmAABRAsad4FCtY9ecwnkms4E2ELcGWmTmrKwAA/uLeqrU6vp4AAPDa/gDzUgM9+S8z3AAAAABJRU5ErkJggg==)  
**Performance Optimizations**  
- **Client‑side thumbnail generation** – Thumbnails are created in the browser before upload, eliminating server‑side image processing.  
- **Direct R2 uploads** – Images are sent straight to R2 via presigned URLs, bypassing the application server.  
- **Background size sync** – A worker polls R2 for photo and thumbnail sizes and updates the database with this metadata.  
- **Stateless Design** – Containers carry no local state, allowing for seamless horizontal scaling (ASG).  
**Browsing Experience**  
- The front‑end fetches presigned URLs for thumbnails and full‑size images, while the backend caches them in **Redis** to avoid repeated R2 look‑ups.  
- Album items that are off‑screen are not rendered (lazy loading).  
- Thumbnails are paginated; the client requests presigned URLs only for thumbnails currently in view.  
**Downloads & Deletions**  
- Files are downloaded directly from R2.
- Background workers also handle deletion of items from R2, keeping storage in sync with the database.  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANklEQVR4nO3OMQ2AABAAsSNBCkJfFSqwwIgHRiywEZJWQZeZ2ao9AAD+4lyruzq+ngAA8Nr1AOH8BeZxN/IIAAAAAElFTkSuQmCC)  
**⚙️ Getting Started**  
**Prerequisites**  
- Podman or Docker  
- AWS Account (ECR, ECS, RDS, ElastiCache)  
- Cloudflare Account (R2, Tunnels)  
- Node.js (for local frontend development)  
**Cloud Deployment Workflow**  
1. **Build the Frontend**:  
   ```bash
   cd frontend && npm run build
   cp -r dist/* ../backend/static/
   ```
2. **Build and Push the Image**:  
   ```bash
   podman build --platform linux/amd64 -t shareshot1 .
   podman tag localhost/shareshot1:latest YOUR_ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/shareshot1:latest
   podman push YOUR_ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/shareshot1:latest
   ```
3. **Trigger Redeployment**:  
   Update the ECS Service with the **"Force new deployment"** option to pull the latest image.  
4. **Environment Configuration**:  
   The application uses a "Smart" `env.py` that handles injection from AWS ECS Task Definitions. Key variables include `DB_HOST`, `REDIS_URL` (Full DSN), and `REDIS_URL2` (Full DSN).  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVR4nO3OQQmAABRAsSdYxZ4/mJjEsxE8W8GbCFuCLTOzVXsAAPzFuVZ3dXw9AQDgtesBxPEF3bv7x0IAAAAASUVORK5CYII=)  
**📦 Infrastructure Notes**  
- **Fargate Services**: Split into `shareshot-api` (API + Tunnel sidecar) and `shareshot-worker` (arq background tasks).  
- **Networking**: Tasks reside in Public Subnets with security groups restricting all inbound traffic. Access is mediated exclusively via Cloudflare Tunnels.  
- **Redis Connectivity**: Uses a single-node ElastiCache (Non-Cluster Mode) to avoid `CROSSSLOT` errors with arq.  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANklEQVR4nO3OMQ2AABAAsSNBCUpfDq4wwIAABiywEZJWQZeZ2ao9AAD+4liruzq/ngAA8Nr1ABweBgdur/QFAAAAAElFTkSuQmCC)  
**🗺️ Roadmap**  
- Mobile-first progressive web app (PWA) features.  
- Native Cloudflare Pages hosting for frontend assets.  
- Enhanced monitoring via CloudWatch dashboards.  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVR4nO3OMQ2AUBBAsUfyNTCi9VwgEA3sWGAjJK2CbjNzVGcAAPzFtapV7V9PAAB47X4AEW4ELQDBN+AAAAAASUVORK5CYII=)  
**📄 License**  
Individual/Private Use. See repository owner for details.  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVR4nO3OMQ2AABAAsSNhYMMAKlD4OzrxgQU2QtIq6DIzR3UFAMBf3Gu1VefXEwAAXtsfSqADWz4G/HUAAAAASUVORK5CYII=)  
*Created with ❤️ by *[ *pxp888*](https://github.com/pxp888 "https://github.com/pxp888")  

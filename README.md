**📸 shareShots**  

![screen0](frontend/src/assets/screen0.webp)

![screen2](frontend/src/assets/screen2.webp)

![screen1](frontend/src/assets/screen1.webp)


**shareShots** is a high-performance, real-time photo-sharing platform designed for seamless event photography and collaborative albums. Built with a modern tech stack, it features direct-to-R2 uploads, real-time WebSocket updates, and a modern React interface.  
[www.shareshot.eu](https://www.shareshot.eu/ "https://www.shareshot.eu/")  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANElEQVR4nO3OMQ0AIAwAwZIgBKn1gjJsdGLBABMhuZt+/JaZIyJmAADwi9VP1NMNAABu1AaU4gUeBSGW2wAAAABJRU5ErkJggg==)  
**✨ Project Preview**  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAADUlEQVR4nGP4//8/AwAI/AL+p5qgoAAAAABJRU5ErkJggg==)  
   
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAADUlEQVR4nGP4//8/AwAI/AL+p5qgoAAAAABJRU5ErkJggg==)  
*Experience a clean, modern, and minimal design tailored for effortless photo sharing.*  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANklEQVR4nO3OMQ2AABAAsSNhYMEBIpD4ArCJDyywEZJWQZeZOaorAAD+4l6rrTq/ngAA8Nr+AEqmA1hl45m5AAAAAElFTkSuQmCC)  
**🚀 Key Features**  
- **🔐 Secure Authentication**: JWT-based user accounts with persistent sessions and authorized WebSocket connections.  
- **💳 Integrated Payments**: Subscription-based model powered by **Stripe**, featuring tiered storage plans and a self-service billing portal.  
- **📁 Collaborative Albums**: Create albums with granular privacy settings:  
  - **Open**: Allow anyone to contribute photos to your event.  
  - **Private**: Restrict access to authorized users.  
  - **Profile**: Showcase your best work publicly on your profile.  
- **☁️ Direct-to-R2 Uploads**: Files bypass the server and go straight to Cloudflare R2 via presigned URLs, ensuring maximum performance. Supports original, mid-sized, and thumbnail assets.  
- **⚡ Real-time Updates**: Instant UI refreshes across all devices using Redis Pub/Sub and WebSockets (via `react-use-websocket`).  
- **🖼️ Smart Metadata**: Automatic tracking of photo sizes and dimensions via background workers.  
- **📦 Bulk Operations**: Download entire albums as a ZIP file (using JSZip) or manage multiple files simultaneously.  
- **📱 Mobile Optimized**: Responsive design with touch-friendly navigation and QR code sharing for instant album access.  
- **📧 Notifications**: Automated email delivery for contact form submissions and secure password recovery.  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANklEQVR4nO3OQQmAABRAsSfYxZo/kSGMYQLPJrCCNxG2BFtmZquOAAD4i3Ot7mr/egIAwGvXA4qrBdGuSdJuAAAAAElFTkSuQmCC)  
**🛠️ Tech Stack**  
**Backend & Infrastructure**  
- **FastAPI**: Asynchronous Python framework for high-concurrency APIs.  
- **PostgreSQL**: Reliable metadata storage with a focus on atomic transactions and storage tracking.  
- **AWS Fargate**: Serverless container execution for the API and background workers.  
- **Amazon ElastiCache (Redis)**: Powering real-time messaging, WebSocket synchronization, and job queuing.  
- **Arq**: Distributed background job processing for image validation and email delivery.  
- **Cloudflare R2**: Scalable S3-compatible object storage for high-resolution images.  
- **Cloudflare Tunnel**: Secure outbound-only connection bypassing the need for AWS ALBs or open ports.  
- **Stripe API**: Secure payment processing and subscription lifecycle management.  
**Frontend**  
- **React 19**: Latest React features for a highly interactive and performant UI.  
- **Vite 7**: Lightning-fast build tool and development server.  
- **Vanilla CSS**: Premium, custom-crafted styles for a unique and modern aesthetic.  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANElEQVR4nO3OQQmAABRAsad4FCtY9ecwnkms4E2ELcGWmTmrKwAA/uLeqrU6vp4AAPDa/gDzUgM9+S8z3AAAAABJRU5ErkJggg==)  
**Performance Optimizations**  
- **Client-side asset generation**: Thumbnails and mid-sized previews are created in the browser before upload, eliminating server-side image processing costs.  
- **Presigned URL Caching**: The backend caches retrieval URLs in Redis to minimize R2 metadata lookups.  
- **Lazy Loading & Virtualization**: Only off-screen album items are not rendered, and thumbnails are paginated based on viewport visibility.  
- **Stateless Architecture**: Horizontal scaling enabled via ASG and stateless containers.  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANklEQVR4nO3OMQ2AABAAsSNBCkJfFSqwwIgHRiywEZJWQZeZ2ao9AAD+4lyruzq+ngAA8Nr1AOH8BeZxN/IIAAAAAElFTkSuQmCC)  
**💰 Subscription Plans**  
| Plan | Storage | Features |
| :--- | :--- | :--- |
| **Free** | 100 MB | Core sharing features, collaborative albums. |
| **Starter** | 1 GB | Increased storage for personal events. |
| **Basic** | 5 GB | Standard storage for active photographers. |
| **Pro** | 100 GB | Professional grade storage for large events and studios. |  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANklEQVR4nO3OMQ2AABAAsSNBCUpfDq4wwIAABiywEZJWQZeZ2ao9AAD+4liruzq/ngAA8Nr1ABweBgdur/QFAAAAAElFTkSuQmCC)  
**⚙️ Getting Started**  
**Prerequisites**  
- Podman or Docker  
- AWS Account (ECR, ECS, RDS, ElastiCache)  
- Cloudflare Account (R2, Tunnels)  
- Stripe Account (for payments)  
- Gmail App Password (for email notifications)  
**Local Development**  
1. **Configure Environment**: Create a `.env` file in `backend/` based on `blankenv.py`.  
2. **Frontend Setup**:  
   ```bash
   cd frontend && npm install && npm run dev
   ```
3. **Backend Setup**:  
   ```bash
   pip install -r requirements.txt
   python backend/main.py
   ```
**Cloud Deployment Workflow**  
1. **Build and Push**:  
   ```bash
   ./buildup.sh  # Build frontend, copy to static, and push container to ECR
   ```
2. **Redeploy**: Update the ECS Service with **"Force new deployment"** to pull the latest image.  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVR4nO3OQQmAABRAsSdYxZ4/mJjEsxE8W8GbCFuCLTOzVXsAAPzFuVZ3dXw9AQDgtesBxPEF3bv7x0IAAAAASUVORK5CYII=)  
**📦 Infrastructure Notes**  
- **Fargate Services**: Split into `shareshot-api` (API + Tunnel sidecar) and `shareshot-worker` (arq background tasks).  
- **Security**: Zero open inbound ports on AWS; all traffic is routed through encrypted Cloudflare Tunnels.  
- **Redis Connectivity**: Uses non-cluster mode to ensure compatibility with `arq` atomic operations.  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANklEQVR4nO3OMQ2AABAAsSNBCUpfDq4wwIAABiywEZJWQZeZ2ao9AAD+4liruzq/ngAA8Nr1ABweBgdur/QFAAAAAElFTkSuQmCC)  
**🗺️ Roadmap**  
- Mobile-first Progressive Web App (PWA) installation.  
- Native Cloudflare Pages hosting for frontend assets to reduce Fargate load.  
- Advanced analytics dashboard for album engagement.  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVR4nO3OMQ2AUBBAsUfyNTCi9VwgEA3sWGAjJK2CbjNzVGcAAPzFtapV7V9PAAB47X4AEW4ELQDBN+AAAAAASUVORK5CYII=)  
**📄 License**  
Individual/Private Use. See repository owner for details.  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVR4nO3OMQ2AABAAsSNhYMMAKlD4OzrxgQU2QtIq6DIzR3UFAMBf3Gu1VefXEwAAXtsfSqADWz4G/HUAAAAASUVORK5CYII=)  
*Created with ❤️ by *[ *pxp888*](https://github.com/pxp888 "https://github.com/pxp888")  

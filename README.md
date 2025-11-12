# 🚀 ShareSafely — Secure File Sharing with Azure Blob Storage

**ShareSafely** is a full-stack web application that allows users to securely upload files and generate **time-limited shareable links** using **Azure Blob Storage**.  

It’s built with a modern stack — **React (Vite) + Node.js (Express) + MongoDB + Azure + Docker + Nginx** — and designed to demonstrate **end-to-end DevOps deployment**.

---

## 🧱 Tech Stack

| Layer | Technology |
|--------|-------------|
| **Frontend** | React + Vite + Axios + Tailwind (optional) |
| **Backend** | Node.js + Express + Azure SDK + Multer |
| **Database** | MongoDB |
| **Cloud** | Azure Blob Storage, Azure Key Vault |
| **Containerization** | Docker + Docker Compose |
| **Reverse Proxy** | Nginx |

---

## 🌐 Architecture Overview

┌──────────────────────────────────────────────────────┐
│ Frontend │
│ React (Vite) + Axios → Nginx → Port 3000 │
└──────────────┬───────────────────────────────────────┘
│
▼
┌──────────────────────────────────────────────────────┐
│ Backend │
│ Express + Azure SDK + MongoDB → Port 5001 │
└──────────────┬───────────────────────────────────────┘
│
▼
┌──────────────────────────────────────────────────────┐
│ Azure Blob Storage │
│ Upload → Generate SAS Link → Return to Frontend │
└──────────────────────────────────────────────────────┘

yaml
Copy code

---

## ⚙️ Features

✅ Upload any file (up to 200MB) to Azure Blob Storage  
✅ Automatically generate **time-limited SAS links**  
✅ Copy secure URLs directly to clipboard  
✅ Modular **Docker setup** (frontend, backend, MongoDB)  
✅ **Production-ready** via Nginx static hosting  
✅ Environment-driven backend configuration  
✅ Supports **Azure Key Vault** for secrets (optional)

---

## 🐳 Running the App with Docker Compose

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/<your-username>/ShareSafely.git
cd ShareSafely
2️⃣ Create Required Environment Files
Backend (backend/.env):

bash
Copy code
MONGO_URI=mongodb://mongo:27017/sharesafely
AZURE_STORAGE_ACCOUNT_NAME=<your_azure_account_name>
AZURE_STORAGE_ACCOUNT_KEY=<your_azure_account_key>
AZURE_BLOB_CONTAINER=sharesafely
SAS_TOKEN_TTL_MINUTES=60
PORT=5000
Frontend (frontend/.env):

bash
Copy code
VITE_BACKEND_URL=http://localhost:5001
3️⃣ Build & Run Containers
bash
Copy code
docker-compose build
docker-compose up -d
Check running services:

bash
Copy code
docker ps
4️⃣ Access the App
Service	URL
Frontend (Nginx)	http://localhost:3000
Backend (Express)	http://localhost:5001
MongoDB	localhost:27017

🧩 Folder Structure
css
Copy code
ShareSafely/
│
├── backend/
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/
│   │   └── utils/
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── components/
│   │       └── UploadForm.jsx
│   ├── Dockerfile
│   ├── vite.config.js
│   ├── .env
│   └── package.json
│
├── docker-compose.yml
└── README.md
🧰 Useful Commands
Action	Command
Build all containers	docker-compose build
Start containers	docker-compose up -d
Stop containers	docker-compose down
View logs	docker logs <container_name>
Clean volumes/networks	docker system prune -a

🛠️ Local Development (Without Docker)
Backend
bash
Copy code
cd backend
npm install
npm start
Frontend
bash
Copy code
cd frontend
npm install
npm run dev
Then visit → http://localhost:5173
(Vite Dev Server)

☁️ Azure Setup (Optional)
Create a Storage Account in Azure.

Create a Blob Container (e.g. sharesafely).

Generate a Storage Account Key and set it in backend .env.

(Optional) Store secrets in Azure Key Vault.

Deploy Docker images to Azure Container Apps or AKS.

🔒 Security Considerations
Uses Azure SAS tokens with TTL limits for secure access.

All uploaded files are private by default.

MongoDB stores only file metadata, not file contents.

Helmet + CORS enabled in backend for API protection.

📦 Example Docker Compose Output
Copy code
✔ Container mongo Started
✔ Container backend Started
✔ Container frontend Started
Visit:
👉 http://localhost:3000
Upload a file to see your Azure Blob share link instantly!

🧑‍💻 Contributors
Name	Role
Gaurav Bora	Developer / DevOps Engineer
OpenAI GPT-5 Assistant	Automation & Deployment Support

🌟 Future Enhancements
✅ User authentication (Azure AD / OAuth)
✅ Public dashboard for monitoring shared links
✅ Integration with Azure Monitor & Application Insights
✅ Kubernetes (AKS) deployment YAMLs

🏁 License
This project is open-source under the MIT License.
Feel free to fork, modify, and use it in your own cloud projects.

⭐ Star this repo if you found it useful!

yaml
Copy code

---

✅ **Instructions:**  
Copy everything inside the code block above (from `# 🚀 ShareSafely` to the final `⭐` line) and paste it into your `README.md`.  
It will render beautifully on GitHub with tables, code sections, and emojis.

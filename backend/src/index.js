// -------------------------
// ShareSafely Backend (Fixed)
// -------------------------

require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const fs = require("fs");

// ✅ Fix for Azure Blob SDK — ensures crypto exists globally
global.crypto = require("crypto");

const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} = require("@azure/storage-blob");

const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");

// App setup
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Multer (memory storage for upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
});

// ENV vars
const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY || null;
const containerName = process.env.AZURE_BLOB_CONTAINER || "sharesafely";
const sasTtlMinutes = parseInt(process.env.SAS_TOKEN_TTL_MINUTES || "60", 10);
const keyvaultUri = process.env.KEYVAULT_URI || null;
const mongoUri = process.env.MONGO_URI || "mongodb://mongo:27017/sharesafely";

// Azure Blob client initialization
let blobServiceClient;

async function initBlobClient() {
  if (!accountName) {
    console.error("AZURE_STORAGE_ACCOUNT_NAME not set");
    process.exit(1);
  }

  try {
    if (accountKey) {
      const sharedKeyCred = new StorageSharedKeyCredential(
        accountName,
        accountKey
      );
      blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        sharedKeyCred
      );
      console.log("Using StorageSharedKeyCredential");
    } else {
      const cred = new DefaultAzureCredential();
      blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        cred
      );
      console.log("Using DefaultAzureCredential");
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const exists = await containerClient.exists();
    if (!exists) {
      await containerClient.create({ access: "private" });
      console.log("Created container", containerName);
    } else {
      console.log("Verified container", containerName);
    }
  } catch (err) {
    console.error("Failed to initialize Blob client:", err);
    process.exit(1);
  }
}

// Optional KeyVault fetch
async function getSecretFromKeyVault(name) {
  if (!keyvaultUri) return null;
  try {
    const cred = new DefaultAzureCredential();
    const client = new SecretClient(keyvaultUri, cred);
    const resp = await client.getSecret(name);
    return resp.value;
  } catch (err) {
    console.warn("KeyVault access failed:", err.message || err);
    return null;
  }
}

// Upload endpoint
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });
    const original = path
      .basename(req.file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    const blobName = `${Date.now()}-${original}`;
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(req.file.buffer, {
      blobHTTPHeaders: { blobContentType: req.file.mimetype },
    });
    return res.json({ blobName, message: "Uploaded" });
  } catch (err) {
    console.error("Upload failed", err);
    return res
      .status(500)
      .json({ error: "upload failed", details: err.message });
  }
});

// SAS URL generation endpoint
app.get("/api/sas", async (req, res) => {
  try {
    const blobName = req.query.blobName;
    if (!blobName)
      return res.status(400).json({ error: "blobName is required" });

    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + sasTtlMinutes * 60 * 1000);

    let sasToken, url;
    if (process.env.AZURE_STORAGE_ACCOUNT_KEY) {
      const sharedKeyCred = new StorageSharedKeyCredential(
        accountName,
        process.env.AZURE_STORAGE_ACCOUNT_KEY
      );
      const permissions = BlobSASPermissions.parse("r");
      sasToken = generateBlobSASQueryParameters(
        { containerName, blobName, permissions, startsOn, expiresOn },
        sharedKeyCred
      ).toString();
      url = `https://${accountName}.blob.core.windows.net/${containerName}/${encodeURIComponent(
        blobName
      )}?${sasToken}`;
    } else {
      const userDelegationKey = await blobServiceClient.getUserDelegationKey(
        startsOn,
        expiresOn
      );
      const permissions = BlobSASPermissions.parse("r");
      sasToken = generateBlobSASQueryParameters(
        { containerName, blobName, permissions, startsOn, expiresOn },
        userDelegationKey,
        accountName
      ).toString();
      url = `https://${accountName}.blob.core.windows.net/${containerName}/${encodeURIComponent(
        blobName
      )}?${sasToken}`;
    }

    return res.json({ url, expiresOn: expiresOn.toISOString() });
  } catch (err) {
    console.error("SAS generation failed", err);
    return res
      .status(500)
      .json({ error: "SAS generation failed", details: err.message });
  }
});

// Serve frontend static build
const clientBuildPath = path.join(__dirname, "../../frontend/dist");
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientBuildPath, "index.html"));
  });
} else {
  app.get("/", (req, res) => res.send("ShareSafely API - frontend not built."));
}

// Start server
const port = process.env.PORT || 5000;
initBlobClient()
  .then(() => {
    app.listen(port, () =>
      console.log("ShareSafely backend listening on", port)
    );
  })
  .catch((err) => {
    console.error("Fatal init error:", err);
    process.exit(1);
  });

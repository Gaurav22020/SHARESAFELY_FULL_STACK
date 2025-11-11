require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const fs = require('fs');

const { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } }); // 200MB

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY || null;
const containerName = process.env.AZURE_BLOB_CONTAINER || 'sharesafely';
const sasTtlMinutes = parseInt(process.env.SAS_TOKEN_TTL_MINUTES || '60', 10);
const keyvaultUri = process.env.KEYVAULT_URI || null;

let blobServiceClient;

async function initBlobClient(){
  if(!accountName){
    console.error("AZURE_STORAGE_ACCOUNT_NAME not set");
    process.exit(1);
  }

  if(accountKey){
    const sharedKeyCred = new StorageSharedKeyCredential(accountName, accountKey);
    blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, sharedKeyCred);
    console.log("Using StorageSharedKeyCredential");
  } else {
    const cred = new DefaultAzureCredential();
    blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, cred);
    console.log("Using DefaultAzureCredential (managed identity / interactive login)");
  }

  // ensure container exists
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const exists = await containerClient.exists();
  if(!exists){
    await containerClient.create({ access: 'private' });
    console.log('Created container', containerName);
  }
}

initBlobClient().catch(err => {
  console.error('Failed to initialize Blob client:', err.message || err);
  process.exit(1);
});

// optional helper: read secret from Key Vault (if you stored account key there)
async function getSecretFromKeyVault(name){
  if(!keyvaultUri) return null;
  try{
    const cred = new DefaultAzureCredential();
    const client = new SecretClient(keyvaultUri, cred);
    const resp = await client.getSecret(name);
    return resp.value;
  }catch(err){
    console.warn('KeyVault access failed:', err.message || err);
    return null;
  }
}

// Upload endpoint - backend receives file and stores in blob
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try{
    if(!req.file) return res.status(400).json({ error: 'No file' });
    const original = path.basename(req.file.originalname).replace(/[^a-zA-Z0-9._-]/g,'_');
    const blobName = `${Date.now()}-${original}`;
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(req.file.buffer, {
      blobHTTPHeaders: { blobContentType: req.file.mimetype }
    });
    return res.json({ blobName, message: 'Uploaded' });
  }catch(err){
    console.error('Upload failed', err);
    return res.status(500).json({ error: 'upload failed', details: err.message });
  }
});

// Generate SAS link for a blob
app.get('/api/sas', async (req, res) => {
  try{
    const blobName = req.query.blobName;
    if(!blobName) return res.status(400).json({ error: 'blobName is required' });

    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + sasTtlMinutes * 60 * 1000);

    if(process.env.AZURE_STORAGE_ACCOUNT_KEY){
      const sharedKeyCred = new StorageSharedKeyCredential(accountName, process.env.AZURE_STORAGE_ACCOUNT_KEY);
      const permissions = BlobSASPermissions.parse('r');
      const sasToken = generateBlobSASQueryParameters({
        containerName,
        blobName,
        permissions,
        startsOn,
        expiresOn
      }, sharedKeyCred).toString();
      const url = `https://${accountName}.blob.core.windows.net/${containerName}/${encodeURIComponent(blobName)}?${sasToken}`;
      return res.json({ url, expiresOn: expiresOn.toISOString() });
    } else {
      // Use user delegation key (requires storage role for the identity)
      const userDelegationKey = await blobServiceClient.getUserDelegationKey(startsOn, expiresOn);
      const permissions = BlobSASPermissions.parse('r');
      const sasToken = generateBlobSASQueryParameters({
        containerName,
        blobName,
        permissions,
        startsOn,
        expiresOn
      }, userDelegationKey, accountName).toString();
      const url = `https://${accountName}.blob.core.windows.net/${containerName}/${encodeURIComponent(blobName)}?${sasToken}`;
      return res.json({ url, expiresOn: expiresOn.toISOString() });
    }
  }catch(err){
    console.error('SAS generation failed', err);
    return res.status(500).json({ error: 'SAS generation failed', details: err.message });
  }
});

// Serve frontend static (production build)
const clientBuildPath = path.join(__dirname, '../../frontend/dist');
if(fs.existsSync(clientBuildPath)){
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => res.send('ShareSafely API - frontend not built. Run frontend build and redeploy.'));
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('ShareSafely backend listening on', port));

import React, {useState} from 'react'
import axios from 'axios'

export default function UploadForm(){
  const [file, setFile] = useState(null)
  const [ttl, setTtl] = useState(60)
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')

  const upload = async (e) => {
    e.preventDefault()
    if(!file){ setMessage('Pick a file'); return }
    setMessage('Uploading...')
    try{
      const fd = new FormData()
      fd.append('file', file, file.name)
      const up = await axios.post('/api/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setMessage('Uploaded as: ' + up.data.blobName)
      setMessage('Requesting share link...')
      const sasResp = await axios.get('/api/sas', { params: { blobName: up.data.blobName, ttl }})
      setLink(sasResp.data.url)
      setMessage('Link ready — copied to clipboard')
      await navigator.clipboard.writeText(sasResp.data.url)
    }catch(err){
      console.error(err)
      setMessage('Error: ' + (err.response?.data?.error || err.message))
    }
  }

  return (
    <div className="card">
      <form onSubmit={upload}>
        <label className="label">Choose file</label>
        <input type="file" onChange={e=>setFile(e.target.files[0])} />
        <label className="label">Link TTL (minutes)</label>
        <input type="number" value={ttl} onChange={e=>setTtl(e.target.value)} min="1" max="1440" />
        <button className="btn" type="submit">Upload & Generate Link</button>
      </form>

      <div className="status">
        <p>{message}</p>
        {link && <p>Shareable link: <a href={link} target="_blank" rel="noreferrer">{link}</a></p>}
      </div>
    </div>
  )
}

// Centralized Axios instance for all backend API calls
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || "http://localhost:5001",
});

export default API;

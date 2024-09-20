import axios from "axios"

// Create an Axios instance with default options
const axiosInstance = axios.create({
    baseURL: "http://localhost:3000/",
    timeout: 10000,
});

export default axiosInstance;

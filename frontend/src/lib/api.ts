import axios from "axios";
import { env } from "@/config/env";

/** Compatibility client for the existing Axios-based form pages. */
export const api = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0] as string;
        const token = localStorage.getItem("token");
        
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(url, { headers });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            localStorage.removeItem("token");
            window.location.href = "/auth";
          }
          throw new Error(`${res.status}: ${await res.text()}`);
        }

        return res.json();
      },
    },
  },
});

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export async function apiRequest(
  url: string,
  method: RequestMethod = "GET",
  body?: any
) {
  const token = localStorage.getItem("token");
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem("token");
      window.location.href = "/auth";
    }
    const errorText = await res.text();
    throw new Error(errorText || `Request failed with status ${res.status}`);
  }

  return res.json();
}

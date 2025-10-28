import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { insertUserSchema, loginSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  const devKey = Math.random().toString(36).substring(2) + Date.now().toString(36);
  console.warn("⚠️  WARNING: JWT_SECRET not set. Generated temporary development key.");
  console.warn("⚠️  This key will change on restart. Set JWT_SECRET for production!");
  return devKey;
})();

// Middleware to verify JWT token
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
}

export function registerRoutes(app: Express) {
  // Register endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password before storing
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const userWithHashedPassword = {
        ...userData,
        password: hashedPassword
      };

      const user = await storage.createUser(userWithHashedPassword);
      res.json({ message: "User registered successfully", user });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const credentials = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(credentials.email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const validPassword = await bcrypt.compare(credentials.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      const { password, ...publicUser } = user;
      res.json({ token, user: publicUser });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get current user endpoint
  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Logout endpoint (client-side token removal, no server action needed)
  app.post("/api/auth/logout", authenticateToken, (req, res) => {
    res.json({ message: "Logged out successfully" });
  });
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
      };
    }
  }
}

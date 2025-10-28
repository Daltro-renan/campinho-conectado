import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  loginSchema,
  insertTeamSchema,
  insertPlayerSchema,
  insertGameSchema,
  insertNewsSchema,
  insertPaymentSchema
} from "@shared/schema";
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

// Middleware to check if user is admin (presidente or diretoria)
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const userRole = req.user.role;
  if (userRole !== "presidente" && userRole !== "diretoria") {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
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
      const { password: _, ...safeUser } = user as any;
      res.json({ message: "User registered successfully", user: safeUser });
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
        { id: user.id, email: user.email, role: user.role },
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

  app.get("/api/teams", async (req, res) => {
    try {
      const teams = await storage.getTeams();
      res.json(teams);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/teams/:id", async (req, res) => {
    try {
      const team = await storage.getTeamById(parseInt(req.params.id));
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      res.json(team);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/teams", authenticateToken, async (req, res) => {
    try {
      const validatedData = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(validatedData);
      res.json(team);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/teams/:id", authenticateToken, async (req, res) => {
    try {
      const validatedData = insertTeamSchema.partial().parse(req.body);
      const team = await storage.updateTeam(parseInt(req.params.id), validatedData);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      res.json(team);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/teams/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deleteTeam(parseInt(req.params.id));
      res.json({ message: "Team deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/players", async (req, res) => {
    try {
      const teamId = req.query.teamId;
      const players = teamId 
        ? await storage.getPlayersByTeam(parseInt(teamId as string))
        : await storage.getPlayers();
      res.json(players);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/players/:id", async (req, res) => {
    try {
      const player = await storage.getPlayerById(parseInt(req.params.id));
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      res.json(player);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/players", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertPlayerSchema.parse(req.body);
      const player = await storage.createPlayer(validatedData);
      res.json(player);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/players/:id", authenticateToken, async (req, res) => {
    try {
      const validatedData = insertPlayerSchema.partial().parse(req.body);
      const player = await storage.updatePlayer(parseInt(req.params.id), validatedData);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      res.json(player);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/players/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      await storage.deletePlayer(parseInt(req.params.id));
      res.json({ message: "Player deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/games", async (req, res) => {
    try {
      const upcoming = req.query.upcoming === "true";
      const games = upcoming 
        ? await storage.getUpcomingGames()
        : await storage.getGames();
      res.json(games);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/games/:id", async (req, res) => {
    try {
      const game = await storage.getGameById(parseInt(req.params.id));
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      res.json(game);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/games", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertGameSchema.parse(req.body);
      const game = await storage.createGame(validatedData);
      res.json(game);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/games/:id", authenticateToken, async (req, res) => {
    try {
      const validatedData = insertGameSchema.partial().parse(req.body);
      const game = await storage.updateGame(parseInt(req.params.id), validatedData);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      res.json(game);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/games/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      await storage.deleteGame(parseInt(req.params.id));
      res.json({ message: "Game deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/news", async (req, res) => {
    try {
      const published = req.query.published === "true";
      const newsItems = published 
        ? await storage.getPublishedNews()
        : await storage.getNews();
      res.json(newsItems);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/news/:id", async (req, res) => {
    try {
      const newsItem = await storage.getNewsById(parseInt(req.params.id));
      if (!newsItem) {
        return res.status(404).json({ error: "News not found" });
      }
      res.json(newsItem);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/news", authenticateToken, async (req, res) => {
    try {
      const validatedData = insertNewsSchema.parse(req.body);
      const newsItem = await storage.createNews(validatedData);
      res.json(newsItem);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/news/:id", authenticateToken, async (req, res) => {
    try {
      const validatedData = insertNewsSchema.partial().parse(req.body);
      const newsItem = await storage.updateNews(parseInt(req.params.id), validatedData);
      if (!newsItem) {
        return res.status(404).json({ error: "News not found" });
      }
      res.json(newsItem);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/news/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deleteNews(parseInt(req.params.id));
      res.json({ message: "News deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Payment routes (admin only)
  app.get("/api/payments", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const playerId = req.query.playerId as string | undefined;
      
      let paymentsData;
      if (playerId) {
        paymentsData = await storage.getPaymentsByPlayer(parseInt(playerId));
      } else if (status) {
        paymentsData = await storage.getPaymentsByStatus(status);
      } else {
        paymentsData = await storage.getPayments();
      }
      res.json(paymentsData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/payments/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const payment = await storage.getPaymentById(parseInt(req.params.id));
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json(payment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/payments", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validatedData);
      res.json(payment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/payments/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertPaymentSchema.partial().parse(req.body);
      const payment = await storage.updatePayment(parseInt(req.params.id), validatedData);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json(payment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/payments/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      await storage.deletePayment(parseInt(req.params.id));
      res.json({ message: "Payment deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Squad Team routes (Times de Categoria)
  app.get("/api/squad-teams", authenticateToken, async (req, res) => {
    try {
      const associationId = req.query.associationId as string | undefined;
      
      if (associationId) {
        const squadTeams = await storage.getSquadTeamsByAssociation(parseInt(associationId));
        res.json(squadTeams);
      } else {
        const squadTeams = await storage.getSquadTeams();
        res.json(squadTeams);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/squad-teams/:id", authenticateToken, async (req, res) => {
    try {
      const squadTeam = await storage.getSquadTeamById(parseInt(req.params.id));
      if (!squadTeam) {
        return res.status(404).json({ error: "Squad team not found" });
      }
      res.json(squadTeam);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/squad-teams", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { insertSquadTeamSchema } = await import("@shared/schema");
      const validatedData = insertSquadTeamSchema.parse(req.body);
      const squadTeam = await storage.createSquadTeam(validatedData);
      res.json(squadTeam);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/squad-teams/:id", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const userRole = req.user.role;
      const isAdmin = userRole === "presidente" || userRole === "diretoria";
      
      const squadTeam = await storage.getSquadTeamById(parseInt(req.params.id));
      if (!squadTeam) {
        return res.status(404).json({ error: "Squad team not found" });
      }

      const isTecnico = userRole === "tecnico" && squadTeam.coachId === req.user.id;
      
      if (!isAdmin && !isTecnico) {
        return res.status(403).json({ error: "Only admin or assigned coach can update this team" });
      }

      const updatedTeam = await storage.updateSquadTeam(parseInt(req.params.id), req.body);
      res.json(updatedTeam);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/squad-teams/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      await storage.deleteSquadTeam(parseInt(req.params.id));
      res.json({ message: "Squad team deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/squad-teams/:id/players", authenticateToken, async (req, res) => {
    try {
      const players = await storage.getPlayersBySquadTeam(parseInt(req.params.id));
      res.json(players);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/squad-teams/:id/players/:playerId", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const userRole = req.user.role;
      const isAdmin = userRole === "presidente" || userRole === "diretoria";
      
      const squadTeam = await storage.getSquadTeamById(parseInt(req.params.id));
      if (!squadTeam) {
        return res.status(404).json({ error: "Squad team not found" });
      }

      const isTecnico = userRole === "tecnico" && squadTeam.coachId === req.user.id;
      
      if (!isAdmin && !isTecnico) {
        return res.status(403).json({ error: "Only admin or assigned coach can manage players" });
      }

      const player = await storage.addPlayerToSquadTeam(parseInt(req.params.id), parseInt(req.params.playerId));
      res.json(player);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/squad-teams/:id/players/:playerId", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const userRole = req.user.role;
      const isAdmin = userRole === "presidente" || userRole === "diretoria";
      
      const squadTeam = await storage.getSquadTeamById(parseInt(req.params.id));
      if (!squadTeam) {
        return res.status(404).json({ error: "Squad team not found" });
      }

      const isTecnico = userRole === "tecnico" && squadTeam.coachId === req.user.id;
      
      if (!isAdmin && !isTecnico) {
        return res.status(403).json({ error: "Only admin or assigned coach can manage players" });
      }

      await storage.removePlayerFromSquadTeam(parseInt(req.params.playerId));
      res.json({ message: "Player removed from squad team successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Chat routes (Sistema de mensagens hierárquico)
  app.get("/api/chat/:associationId/:channel", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { associationId, channel } = req.params;
      const userRole = req.user.role;

      if (channel === "diretoria" && userRole !== "presidente" && userRole !== "diretoria") {
        return res.status(403).json({ error: "Only presidente and diretoria can access this channel" });
      }

      if (channel === "tecnicos" && userRole !== "presidente" && userRole !== "diretoria" && userRole !== "tecnico") {
        return res.status(403).json({ error: "Only presidente, diretoria and tecnico can access this channel" });
      }

      const messages = await storage.getMessages(parseInt(associationId), channel);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/chat/send", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { insertMessageSchema } = await import("@shared/schema");
      const validatedData = insertMessageSchema.parse({
        ...req.body,
        authorId: req.user.id,
      });

      const userRole = req.user.role;
      const channel = validatedData.channel;

      if (channel === "diretoria" && userRole !== "presidente" && userRole !== "diretoria") {
        return res.status(403).json({ error: "Only presidente and diretoria can send messages to this channel" });
      }

      if (channel === "tecnicos" && userRole !== "presidente" && userRole !== "diretoria" && userRole !== "tecnico") {
        return res.status(403).json({ error: "Only presidente, diretoria and tecnico can send messages to this channel" });
      }

      const message = await storage.createMessage(validatedData);
      res.json(message);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/chat/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      await storage.deleteMessage(parseInt(req.params.id));
      res.json({ message: "Message deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role?: string;
      };
    }
  }
}

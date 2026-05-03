import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { rateLimit } from "express-rate-limit";
import routes from "./routes/index.js";
import { uploadErrorHandler } from "./middlewares/uploadError.middleware.js";

const isProd = process.env.NODE_ENV === "production";

export const app = express();

// Trust the first proxy hop in production so req.ip resolves to the real
// client IP (used by view-counting fingerprint dedup) rather than the proxy's.
if (isProd) app.set("trust proxy", 1);

// Security headers
app.use(helmet());

// CORS — restrict to allowed origins in production
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : [];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (!isProd || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
}));

// Request logging — combined in prod, dev format locally
app.use(morgan(isProd ? "combined" : "dev"));

// Compress responses
app.use(compression());

// Body parsers
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

// Rate limiting — 100 requests per 15 minutes per IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, statusCode: 429, message: "Too many requests, please try again later." },
});
app.use("/api", limiter);

// Health check and root endpoint
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "✅ Server is running CICD",
        timestamp: new Date().toISOString(),
        version: "1.0.0"
    });
});

app.use("/api", routes);
app.use(express.static("public"));

// Convert multer/upload errors into structured ApiError-style responses
app.use(uploadErrorHandler);

// Global error handler — hide stack traces in client response, but always log them
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    if (statusCode >= 500) {
        console.error(`[ERROR] ${req.method} ${req.originalUrl} -> ${statusCode}: ${message}`);
        if (err.stack) console.error(err.stack);
    }
    return res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        ...(isProd ? {} : { stack: err.stack }),
    });
});

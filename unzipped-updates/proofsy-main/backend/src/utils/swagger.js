/**
 * API Documentation / Swagger Setup
 * 
 * To use this:
 * 1. Install: npm install swagger-ui-express swagger-jsdoc
 * 2. Uncomment the code below in server.js
 * 3. Add JSDoc comments to your routes
 * 4. Visit: http://localhost:5000/api/docs
 */

const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Proofsy API",
      version: "1.0.0",
      description: "Certificate generation and verification API",
      contact: {
        name: "Proofsy Team",
        email: "support@proofsy.com",
      },
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Development server",
      },
      {
        url: "http://api.proofsy.com",
        description: "Production server",
      },
    ],
    components: {
      schemas: {
        Event: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            date: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Certificate: {
          type: "object",
          properties: {
            _id: { type: "string" },
            eventId: { type: "string" },
            userId: { type: "string" },
            certificateUrl: { type: "string" },
            verificationCode: { type: "string" },
            status: {
              type: "string",
              enum: ["pending", "generated", "failed"],
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        User: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            error: { type: "string" },
            details: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.js"], // Path to route files with JSDoc comments
};

const specs = swaggerJsdoc(swaggerOptions);

module.exports = { swaggerUi, specs };

/**
 * Example JSDoc for a route:
 * 
 * @swagger
 * /api/events:
 *   get:
 *     summary: Get all events
 *     tags: [Events]
 *     responses:
 *       200:
 *         description: List of events
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Event'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-static";

export async function GET() {
  const siteUrl = getSiteUrl();

  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Pagepod API",
      version: "1.0.0",
      description:
        "Programmatic REST API for managing, deploying, and hosting HTML applications, web tools, and games on Pagepod.",
    },
    servers: [
      {
        url: siteUrl,
        description: "Current Deployment Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "PAT",
          description:
            "Personal Access Token generated in Pagepod console (`pp_live_...`).",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    paths: {
      "/api/upload": {
        post: {
          summary: "Upload or publish an HTML project",
          description:
            "Deploy a single `.html` file or `.zip` bundle to Pagepod. The project will be automatically associated with the authenticated token owner.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["file", "title", "slug"],
                  properties: {
                    file: {
                      type: "string",
                      format: "binary",
                      description: "The `.html` file or multi-file `.zip` archive.",
                    },
                    title: {
                      type: "string",
                      example: "Interactive Particle Sandbox",
                      description: "Project title displayed on showcase.",
                    },
                    slug: {
                      type: "string",
                      example: "particle-sandbox",
                      description: "Unique URL slug for accessing the project at `/p/{slug}`.",
                    },
                    category: {
                      type: "string",
                      enum: ["tools", "games", "visualization", "prototypes", "animations", "others"],
                      default: "tools",
                    },
                    description: {
                      type: "string",
                      example: "Interactive physics gravity simulation with particles.",
                    },
                    visibility: {
                      type: "string",
                      enum: ["public", "private"],
                      default: "public",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Project successfully uploaded and published.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      id: { type: "string", example: "ck98ab12cd34" },
                      title: {
                        type: "string",
                        example: "Interactive Particle Sandbox",
                      },
                      slug: { type: "string", example: "particle-sandbox" },
                      url: {
                        type: "string",
                        example: "https://www.pagepod.dev/p/particle-sandbox",
                      },
                      rawUrl: {
                        type: "string",
                        example: "https://www.pagepod.dev/raw/particle-sandbox/",
                      },
                      category: { type: "string", example: "tools" },
                      visibility: { type: "string", example: "public" },
                    },
                  },
                },
              },
            },
            400: {
              description:
                "Bad Request - Missing required parameters or empty payload.",
            },
            401: {
              description:
                "Unauthorized - Missing or invalid Bearer API token.",
            },
            409: {
              description: "Conflict - slug is already taken by another project.",
            },
          },
        },
      },
    },
  };

  return NextResponse.json(spec);
}

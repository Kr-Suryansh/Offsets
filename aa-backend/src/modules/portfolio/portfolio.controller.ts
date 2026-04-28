import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import * as portfolioService from "./portfolio.service";

export async function portfolioRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /portfolio
   * Returns aggregated holdings + transactions for the authenticated user.
   */
  fastify.get("/", async (req: FastifyRequest, reply: FastifyReply) => {
    const requestId = req.id;
    const userId = (req as FastifyRequest & { userId?: string }).userId;

    if (!userId) {
      return reply.status(401).send({ success: false, error: "Unauthorized", requestId });
    }

    const portfolio = await portfolioService.getPortfolio(userId);
    return reply.send({ success: true, data: portfolio, requestId });
  });
}

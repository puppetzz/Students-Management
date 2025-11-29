import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { subjectRouter } from "./routers/subject";
import { studentRouter } from "./routers/student";
import { classesRouter } from "./routers/classes";
import { termRouter } from "./routers/terms";
import { s3Router } from "./routers/s3";
import { userRouter } from "./routers/user";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  subject: subjectRouter,
  student: studentRouter,
  classes: classesRouter,
  term: termRouter,
  s3: s3Router,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);

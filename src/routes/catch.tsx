import { createFileRoute } from "@tanstack/react-router";
import { CatchGame } from "@/components/catch-game";

export const Route = createFileRoute("/catch")({ component: CatchGame });

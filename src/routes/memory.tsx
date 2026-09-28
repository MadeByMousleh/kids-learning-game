import { createFileRoute } from "@tanstack/react-router";
import { MemoryGame } from "@/components/memory-game";

export const Route = createFileRoute("/memory")({ component: MemoryGame });
